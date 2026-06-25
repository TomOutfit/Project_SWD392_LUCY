using Microsoft.EntityFrameworkCore;
using LucyNetService.Data;
using LucyNetService.Models;

namespace LucyNetService.Services;

public class UserService
{
    private readonly LucyDbContext _db;
    public UserService(LucyDbContext db) => _db = db;

    public async Task<UserDto?> GetByIdAsync(int id)
    {
        var user = await _db.Users.FindAsync(id);
        return user is null ? null : ToDto(user);
    }

    public async Task<List<UserDto>> GetAllAsync()
    {
        return await _db.Users.Select(u => ToDto(u)).ToListAsync();
    }

    public async Task<List<LeaderboardEntry>> GetLeaderboardAsync()
    {
        var top = await _db.GiftTransactions
            .GroupBy(g => g.RecipientId)
            .Select(g => new { UserId = g.Key, TotalReceived = g.Sum(x => x.Amount) })
            .OrderByDescending(x => x.TotalReceived)
            .Take(20)
            .ToListAsync();

        var result = new List<LeaderboardEntry>();
        for (int i = 0; i < top.Count; i++)
        {
            var user = await _db.Users.FindAsync(top[i].UserId);
            if (user is not null)
                result.Add(new LeaderboardEntry(i + 1, user.Id, user.DisplayName, user.PersonaId, user.Role.ToString(), top[i].TotalReceived));
        }
        return result;
    }

    private static UserDto ToDto(User u) =>
        new(u.Id, u.Email, u.DisplayName, u.PersonaId, u.Role.ToString(), u.WalletBalance);
}
