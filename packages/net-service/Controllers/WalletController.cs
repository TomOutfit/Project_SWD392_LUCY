using LucyNetService.Data;
using LucyNetService.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace LucyNetService.Controllers;

[ApiController]
[Route("api/wallet")]
[Authorize]
public class WalletController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var userId = GetUserId();
        var user = await db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        var history = await db.WalletLedger
            .Where(l => l.UserId == userId)
            .OrderByDescending(l => l.CreatedAt)
            .Take(20)
            .ToListAsync();

        return Ok(new { balance = user.WalletBalance, history });
    }

    [HttpPost("deposit")]
    public async Task<IActionResult> Deposit([FromBody] DepositRequest req)
    {
        if (req.Amount <= 0) return BadRequest(new { error = "Amount must be positive" });

        var userId = GetUserId();
        var user = await db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        user.WalletBalance += req.Amount;
        db.WalletLedger.Add(new WalletLedger
        {
            UserId = userId,
            Amount = req.Amount,
            Type = "Deposit",
            Description = $"Deposit of ${req.Amount:F0}"
        });
        await db.SaveChangesAsync();

        return Ok(new { balance = user.WalletBalance });
    }

    private int GetUserId() => int.Parse(User.FindFirstValue("userId")!);
}

public record DepositRequest(decimal Amount);
