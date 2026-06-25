using Microsoft.EntityFrameworkCore;
using LucyNetService.Data;
using LucyNetService.Models;

namespace LucyNetService.Services;

public class WalletService
{
    private readonly LucyDbContext _db;
    private readonly AuthService _authService;

    public WalletService(LucyDbContext db, AuthService authService)
    {
        _db = db;
        _authService = authService;
    }

    public async Task<WalletResponse> GetWalletAsync(int userId)
    {
        var user = await _db.Users.FindAsync(userId);
        var history = await _db.WalletLedgers
            .Where(l => l.UserId == userId)
            .OrderByDescending(l => l.CreatedAt)
            .Take(50)
            .Select(l => new WalletLedgerDto(l.Id, l.Amount, l.Type, l.Description, l.CreatedAt))
            .ToListAsync();

        return new WalletResponse(user?.WalletBalance ?? 0m, history);
    }

    public async Task<WalletResponse?> DepositAsync(int userId, decimal amount)
    {
        if (amount <= 0) return null;

        var user = await _db.Users.FindAsync(userId);
        if (user is null) return null;

        user.WalletBalance += amount;
        _db.WalletLedgers.Add(new WalletLedger
        {
            UserId = userId, Amount = amount, Type = "Deposit",
            Description = $"Deposited {amount:C} to wallet", CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        return await GetWalletAsync(userId);
    }

    /// <summary>
    /// Sends a gift using anonymous recipient token. Real identities are NEVER exposed.
    /// </summary>
    public async Task<GiftTransactionResult?> SendGiftAsync(int senderId, SendGiftRequest req)
    {
        var sender = await _db.Users.FindAsync(senderId);
        // Lookup recipient by anonToken — never by email or real name
        var recipient = await _db.Users.FirstOrDefaultAsync(u => u.AnonToken == req.RecipientAnonId);

        if (sender is null || recipient is null || sender.WalletBalance < req.Amount || req.Amount <= 0)
            return null;

        // Decode anonToken to get anonymous display name for the room broadcast
        var anonIdentity = _authService.DecodeAnonToken(req.RecipientAnonId);
        var recipientAnonName = anonIdentity?.AnonName ?? "Anonymous";

        sender.WalletBalance -= req.Amount;
        recipient.WalletBalance += req.Amount * 0.9m;

        var tx = new GiftTransaction
        {
            SenderId = senderId, RecipientId = recipient.Id,
            RoomId = req.RoomId, GiftType = req.GiftType, Amount = req.Amount, CreatedAt = DateTime.UtcNow
        };
        _db.GiftTransactions.Add(tx);

        _db.WalletLedgers.AddRange(
            new WalletLedger { UserId = senderId, Amount = -req.Amount, Type = "Spent", Description = $"Sent {req.GiftType} gift", CreatedAt = DateTime.UtcNow },
            new WalletLedger { UserId = recipient.Id, Amount = req.Amount * 0.9m, Type = "Gift", Description = $"Received {req.GiftType} gift", CreatedAt = DateTime.UtcNow }
        );

        await _db.SaveChangesAsync();

        // Return only anonymous info — no real name, email, or userId exposed
        return new GiftTransactionResult(tx.Id, req.GiftType, req.Amount, recipientAnonName, recipient.PersonaId);
    }
}

public record GiftTransactionResult(int Id, string GiftType, decimal Amount, string RecipientAnonName, int RecipientPersonaId);
