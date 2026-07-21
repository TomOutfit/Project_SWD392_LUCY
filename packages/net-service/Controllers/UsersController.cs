using LucyNetService.Data;
using LucyNetService.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace LucyNetService.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
[Produces("application/json")]
public class UsersController(AppDbContext db) : ControllerBase
{
    [HttpGet("me")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Me()
    {
        var userId = GetUserId();
        var user = await db.Users.FindAsync(userId);
        if (user == null) return NotFound();
        var totalGiftsReceived = await db.GiftTransactions
            .Where(g => g.RecipientId == userId)
            .SumAsync(g => g.Amount);
        return Ok(new { user.Id, user.Email, user.DisplayName, user.PersonaId, user.Role, user.WalletBalance, user.Xp, TotalGiftsReceived = totalGiftsReceived });
    }

    [HttpGet("leaderboard")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
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

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password) || string.IsNullOrWhiteSpace(req.DisplayName))
            return BadRequest(new { error = "All fields are required" });

        if (await db.Users.AnyAsync(u => u.Email == req.Email.ToLower()))
            return Conflict(new { error = "Email already registered" });

        var user = new User
        {
            Email = req.Email.ToLower().Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            DisplayName = req.DisplayName.Trim(),
            PersonaId = req.PersonaId,
            Role = req.Role,
            WalletBalance = 50000m
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Me), new { id = user.Id }, new { user.Id, user.Email, user.DisplayName, user.PersonaId, user.Role, user.WalletBalance });
    }

    [HttpPut("me")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateUserRequest req)
    {
        var userId = GetUserId();
        var user = await db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(req.DisplayName))
        {
            user.DisplayName = req.DisplayName.Trim();
        }
        if (req.PersonaId.HasValue)
        {
            user.PersonaId = req.PersonaId.Value;
        }
        await db.SaveChangesAsync();

        var totalGiftsReceived = await db.GiftTransactions
            .Where(g => g.RecipientId == userId)
            .SumAsync(g => g.Amount);

        return Ok(new { user.Id, user.Email, user.DisplayName, user.PersonaId, user.Role, user.WalletBalance, user.Xp, TotalGiftsReceived = totalGiftsReceived });
    }

    [HttpDelete("me")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteMe()
    {
        var userId = GetUserId();
        var user = await db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        db.Users.Remove(user);
        await db.SaveChangesAsync();

        return NoContent();
    }

    private int GetUserId() => int.Parse(User.FindFirstValue("userId")!);
}

public record CreateUserRequest(string Email, string Password, string DisplayName, int PersonaId, string Role);
public record UpdateUserRequest(string? DisplayName, int? PersonaId);
