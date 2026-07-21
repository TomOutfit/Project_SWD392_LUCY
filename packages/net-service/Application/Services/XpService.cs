using LucyNetService.Application.Interfaces;
using LucyNetService.Data;
using LucyNetService.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LucyNetService.Application.Services;

public class XpService(AppDbContext db) : IXpService
{
    public async Task<XpResult> AddXpAsync(int userId, AddXpRequest req)
    {
        if (req.Amount <= 0) return XpResult.Fail("Amount must be positive");

        var user = await db.Users.FindAsync(userId);
        if (user == null) return XpResult.Fail("User not found");

        user.Xp += req.Amount;
        db.XpLedger.Add(new XpLedger
        {
            UserId = userId,
            Amount = req.Amount,
            RoomId = req.RoomId,
            Description = req.Description
        });

        await db.SaveChangesAsync();
        return XpResult.Ok(user.Xp);
    }

    public async Task<XpResult> GetUserXpAsync(int userId)
    {
        var user = await db.Users.FindAsync(userId);
        if (user == null) return XpResult.Fail("User not found");

        var history = await db.XpLedger
            .Where(l => l.UserId == userId)
            .OrderByDescending(l => l.CreatedAt)
            .Take(50)
            .Select(l => new XpLedgerDto(l.Id, l.Amount, l.RoomId, l.Description, l.CreatedAt))
            .ToListAsync();

        return XpResult.Ok(user.Xp, history);
    }
}
