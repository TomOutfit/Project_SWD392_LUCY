using LucyNetService.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace LucyNetService.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(AppDbContext db) : ControllerBase
{
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userId = GetUserId();
        var user = await db.Users.FindAsync(userId);
        if (user == null) return NotFound();
        return Ok(new { user.Id, user.Email, user.DisplayName, user.PersonaId, user.Role, user.WalletBalance });
    }

    [HttpGet("leaderboard")]
    public async Task<IActionResult> Leaderboard()
    {
        var users = await db.Users.ToListAsync();
        var gifts = await db.GiftTransactions.ToListAsync();

        var result = users
            .Select(u => new
            {
                u.Id,
                u.DisplayName,
                u.PersonaId,
                u.Role,
                TotalGiftsReceived = gifts.Where(g => g.RecipientId == u.Id).Sum(g => g.Amount)
            })
            .OrderByDescending(u => u.TotalGiftsReceived)
            .Take(50)
            .ToList();

        return Ok(result);
    }

    private int GetUserId() => int.Parse(User.FindFirstValue("userId")!);
}
