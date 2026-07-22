using LucyNetService.Application.DTOs;
using LucyNetService.Application.Interfaces;
using LucyNetService.Data;
using LucyNetService.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LucyNetService.Application.Services;

public class GiftService(AppDbContext db) : IGiftService
{
    // ── Send Gift ───────────────────────────────────────────────────────────────

    public async Task<GiftResult> SendGiftAsync(int senderId, SendGiftRequest req)
    {
        var sender = await db.Users.FindAsync(senderId);
        if (sender == null) return GiftResult.Fail("Sender not found", 404);

        var validationError = ValidateGift(senderId, req.Amount, sender);
        if (validationError != null) return validationError;

        var (recipient, recipientError) = await ResolveRecipientAsync(req.RecipientEmail);
        if (recipient == null) return GiftResult.Fail(recipientError!, 404);

        if (sender.WalletBalance < req.Amount)
            return GiftResult.Fail("Insufficient balance", 400);

        if (sender.Id == recipient.Id)
            return GiftResult.Fail("Cannot send gift to yourself", 400);

        await ExecuteTransferAsync(sender, recipient, req.Amount,
            ("GiftSent", $"Gift ({req.GiftType}) to {recipient.DisplayName}"),
            ("GiftReceived", $"Gift ({req.GiftType}) from {sender.DisplayName}"),
            _ => new GiftTransaction
            {
                SenderId = senderId,
                RecipientId = recipient.Id,
                RoomId = req.RoomId,
                GiftType = req.GiftType,
                Amount = req.Amount
            });

        return GiftResult.Ok(sender.WalletBalance, MapToDto(GetLastTransaction()));
    }

    // ── Support Creator ────────────────────────────────────────────────────────

    public async Task<GiftResult> SupportCreatorAsync(int senderId, SupportCreatorRequest req)
    {
        if (req.Amount <= 0)
            return GiftResult.Fail("Amount must be greater than zero", 400);

        var sender = await db.Users.FindAsync(senderId);
        if (sender == null) return GiftResult.Fail("Sender not found", 404);

        var validationError = ValidateGift(senderId, req.Amount, sender);
        if (validationError != null) return validationError;

        var recipient = await db.Users.FindAsync(req.CreatorId);
        if (recipient != null)
        {
            if (sender.Id == recipient.Id)
                return GiftResult.Fail("Cannot support yourself", 400);

            if (sender.WalletBalance < req.Amount)
                return GiftResult.Fail("Insufficient balance", 400);

            await ExecuteTransferAsync(sender, recipient, req.Amount,
                ("GiftSent", $"Support for '{req.PodcastTitle}' by {recipient.DisplayName}"),
                ("GiftReceived", $"Support for '{req.PodcastTitle}' from {sender.DisplayName}"),
                _ => new GiftTransaction
                {
                    SenderId = senderId,
                    RecipientId = recipient.Id,
                    RoomId = $"podcast:{req.PodcastId}",
                    GiftType = "Support",
                    Amount = req.Amount
                });

            return GiftResult.Ok(sender.WalletBalance, MapToDto(GetLastTransaction()));
        }

        // Support external/system creators that are not registered users in db.Users
        if (sender.WalletBalance < req.Amount)
            return GiftResult.Fail("Insufficient balance", 400);

        sender.WalletBalance -= req.Amount;

        var txRecord = new GiftTransaction
        {
            SenderId = senderId,
            RecipientId = req.CreatorId,
            RoomId = $"podcast:{req.PodcastId}",
            GiftType = "Support",
            Amount = req.Amount
        };
        db.GiftTransactions.Add(txRecord);

        db.WalletLedger.Add(new WalletLedger
        {
            UserId = sender.Id,
            Amount = -req.Amount,
            Type = "GiftSent",
            Description = $"Support for '{req.PodcastTitle}'"
        });

        await db.SaveChangesAsync();

        return GiftResult.Ok(sender.WalletBalance, MapToDto(txRecord));
    }

    // ── Get Transactions ────────────────────────────────────────────────────────

    public async Task<IEnumerable<GiftTransactionDto>> GetTransactionsAsync(int userId)
    {
        return await db.GiftTransactions
            .Where(t => t.SenderId == userId || t.RecipientId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => MapToDto(t))
            .ToListAsync();
    }

    // ── Update Transaction ──────────────────────────────────────────────────────

    public async Task<GiftResult> UpdateTransactionAsync(int userId, int transactionId, UpdateGiftRequest req)
    {
        var transaction = await db.GiftTransactions.FindAsync(transactionId);
        if (transaction == null) return GiftResult.Fail("Transaction not found", 404);
        // Neither sender nor recipient can unilaterally modify a completed transaction
        return GiftResult.Fail("Transaction records cannot be modified after completion", 400);
    }

    // ── Delete Transaction ──────────────────────────────────────────────────────

    public async Task<GiftResult> DeleteTransactionAsync(int userId, int transactionId)
    {
        var transaction = await db.GiftTransactions.FindAsync(transactionId);
        if (transaction == null) return GiftResult.Fail("Transaction not found", 404);
        // Only the sender can delete; prevents recipients from erasing evidence
        if (transaction.SenderId != userId)
            return GiftResult.Fail("Only the sender can delete this transaction", 401);

        db.GiftTransactions.Remove(transaction);
        await db.SaveChangesAsync();
        return GiftResult.Ok(null);
    }

    // ── Private helpers ─────────────────────────────────────────────────────────

    private GiftResult? ValidateGift(int senderId, decimal amount, User sender)
    {
        string tierName = sender.Role.ToUpperInvariant() switch
        {
            "SUPER" => "Super",
            "PRO" => "Pro",
            _ => "Free"
        };

        var maxGift = sender.Role.ToUpperInvariant() switch
        {
            "SUPER" => (decimal?)null,
            "PRO" => 499m,
            _ => 49m
        };

        if (maxGift.HasValue && amount > maxGift.Value)
        {
            return GiftResult.Fail($"Your {tierName} tier can only send gifts up to ${maxGift.Value:F0}", 400);
        }

        return null;
    }

    private async Task<(User? user, string? error)> ResolveRecipientAsync(string email)
    {
        if (email.EndsWith("@lucy.local"))
        {
            var idStr = email.Replace("user_", "").Replace("@lucy.local", "");
            if (!int.TryParse(idStr, out var id)) return (null, "Invalid recipient");
            var user = await db.Users.FindAsync(id);
            return (user, null);
        }
        var found = await db.Users.FirstOrDefaultAsync(u => u.Email == email.ToLower());
        return (found, found == null ? "Recipient not found" : null);
    }

    private async Task ExecuteTransferAsync(
        User sender, User recipient, decimal amount,
        (string Type, string Desc) senderLedger,
        (string Type, string Desc) recipientLedger,
        Func<GiftTransaction, GiftTransaction> txFactory)
    {
        // Re-fetch sender to get latest balance — this is the best we can do for SQLite.
        // For real SQL (PostgreSQL/MySQL), add a RowVersion column to Users for true
        // optimistic concurrency. The double-balance-check below prevents most race conditions.
        var lockedSender = await db.Users.FindAsync(sender.Id)
            ?? throw new InvalidOperationException("Sender not found");

        if (lockedSender.WalletBalance < amount)
            throw new InvalidOperationException("Insufficient balance — possible race condition");

        lockedSender.WalletBalance -= amount;
        recipient.WalletBalance += amount;

        var txRecord = txFactory(new GiftTransaction());
        db.GiftTransactions.Add(txRecord);
        db.WalletLedger.Add(new WalletLedger
        {
            UserId = lockedSender.Id,
            Amount = -amount,
            Type = senderLedger.Type,
            Description = senderLedger.Desc
        });
        db.WalletLedger.Add(new WalletLedger
        {
            UserId = recipient.Id,
            Amount = amount,
            Type = recipientLedger.Type,
            Description = recipientLedger.Desc
        });

        await db.SaveChangesAsync();
    }

    private GiftTransaction GetLastTransaction() =>
        db.GiftTransactions.OrderByDescending(t => t.Id).FirstOrDefault()
        ?? throw new InvalidOperationException("No transactions found");

    private static GiftTransactionDto MapToDto(GiftTransaction t) =>
        new(t.Id, t.SenderId, t.RecipientId, t.RoomId, t.GiftType, t.Amount, t.CreatedAt);
}
