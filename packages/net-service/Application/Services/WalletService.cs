using LucyNetService.Application.DTOs;
using LucyNetService.Application.Interfaces;
using LucyNetService.Data;
using LucyNetService.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LucyNetService.Application.Services;

public class WalletService(AppDbContext db) : IWalletService
{
    public async Task<WalletResult> GetWalletAsync(int userId)
    {
        var user = await db.Users.FindAsync(userId);
        if (user == null) return WalletResult.Fail("User not found");

        var history = await db.WalletLedger
            .Where(l => l.UserId == userId)
            .OrderByDescending(l => l.CreatedAt)
            .Take(20)
            .Select(l => new WalletLedgerDto(l.Id, l.Amount, l.Type, l.Description, l.CreatedAt))
            .ToListAsync();

        return WalletResult.Ok(user.WalletBalance, history);
    }

    public async Task<WalletResult> DepositAsync(int userId, DepositRequest req)
    {
        if (req.Amount <= 0) return WalletResult.Fail("Amount must be positive");

        var user = await db.Users.FindAsync(userId);
        if (user == null) return WalletResult.Fail("User not found");

        user.WalletBalance += req.Amount;
        db.WalletLedger.Add(new WalletLedger
        {
            UserId = userId,
            Amount = req.Amount,
            Type = "Deposit",
            Description = $"Deposit of ${req.Amount:F0}"
        });

        await db.SaveChangesAsync();
        return WalletResult.Ok(user.WalletBalance);
    }

    public async Task<WalletResult> UpdateBalanceAsync(int userId, UpdateBalanceRequest req)
    {
        if (req.Amount < 0) return WalletResult.Fail("Amount cannot be negative");

        var user = await db.Users.FindAsync(userId);
        if (user == null) return WalletResult.Fail("User not found");

        user.WalletBalance = req.Amount;
        db.WalletLedger.Add(new WalletLedger
        {
            UserId = userId,
            Amount = req.Amount,
            Type = "Adjustment",
            Description = "Manual balance adjustment via PUT"
        });

        await db.SaveChangesAsync();
        return WalletResult.Ok(user.WalletBalance);
    }

    public async Task<WalletResult> ClearHistoryAsync(int userId)
    {
        var user = await db.Users.FindAsync(userId);
        if (user == null) return WalletResult.Fail("User not found");

        var logs = await db.WalletLedger.Where(l => l.UserId == userId).ToListAsync();
        db.WalletLedger.RemoveRange(logs);
        await db.SaveChangesAsync();

        return WalletResult.Ok(user.WalletBalance);
    }
}
