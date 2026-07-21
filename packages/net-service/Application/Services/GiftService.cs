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
        if (recipient == null) return GiftResult.Fail("Creator not found", 404);

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
        if (transaction.SenderId != userId && transaction.RecipientId != userId)
            return GiftResult.Fail("Not authorized to update this transaction", 401);

        if (req.Amount.HasValue && req.Amount <= 0)
            return GiftResult.Fail("Amount must be positive", 400);

        if (req.Amount.HasValue) transaction.Amount = req.Amount.Value;
        if (!string.IsNullOrWhiteSpace(req.GiftType)) transaction.GiftType = req.GiftType.Trim();

        await db.SaveChangesAsync();
        return GiftResult.Ok(null, MapToDto(transaction));
    }

    // ── Delete Transaction ──────────────────────────────────────────────────────

    public async Task<GiftResult> DeleteTransactionAsync(int userId, int transactionId)
    {
        var transaction = await db.GiftTransactions.FindAsync(transactionId);
        if (transaction == null) return GiftResult.Fail("Transaction not found", 404);
        if (transaction.SenderId != userId && transaction.RecipientId != userId)
            return GiftResult.Fail("Not authorized to delete this transaction", 401);

        db.GiftTransactions.Remove(transaction);
        await db.SaveChangesAsync();
        return GiftResult.Ok(null);
    }

    // ── Private helpers ─────────────────────────────────────────────────────────

    private GiftResult? ValidateGift(int senderId, decimal amount, User sender)
    {
        var maxGift = sender.Role.ToUpperInvariant() switch
        {
            "SUPER" => (decimal?)null,
            "PRO" => 499m,
            _ => 49m
        };

        if (maxGift.HasValue && amount > maxGift.Value)
        {
            return GiftResult.Fail($"Your account tier ({sender.Role}) can only send gifts up to ${maxGift.Value:F0}", 400);
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
        var isInMemory = db.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory";
        var tx = isInMemory ? null : await db.Database.BeginTransactionAsync();

        try
        {
            sender.WalletBalance -= amount;
            recipient.WalletBalance += amount;

            db.GiftTransactions.Add(txFactory(new GiftTransaction()));
            db.WalletLedger.Add(new WalletLedger
            {
                UserId = sender.Id,
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
            if (tx != null) await tx.CommitAsync();
        }
        catch
        {
            if (tx != null) await tx.RollbackAsync();
            throw;
        }
        finally
        {
            if (tx != null) await tx.DisposeAsync();
        }
    }

    private GiftTransaction GetLastTransaction() =>
        db.GiftTransactions.OrderByDescending(t => t.Id).First();

    private static GiftTransactionDto MapToDto(GiftTransaction t) =>
        new(t.Id, t.SenderId, t.RecipientId, t.RoomId, t.GiftType, t.Amount, t.CreatedAt);
}
