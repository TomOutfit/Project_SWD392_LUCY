using LucyNetService.Data;
using LucyNetService.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace LucyNetService.Controllers;

[ApiController]
[Route("api/wallet")]
[Authorize]
[Produces("application/json")]
public class WalletController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
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
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
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

    [HttpPut]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateBalance([FromBody] UpdateBalanceRequest req)
    {
        var userId = GetUserId();
        var user = await db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        if (req.Amount < 0) return BadRequest(new { error = "Amount cannot be negative" });

        user.WalletBalance = req.Amount;
        db.WalletLedger.Add(new WalletLedger
        {
            UserId = userId,
            Amount = req.Amount,
            Type = "Adjustment",
            Description = "Manual balance adjustment via PUT"
        });
        await db.SaveChangesAsync();

        return Ok(new { balance = user.WalletBalance });
    }

    [HttpDelete]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ClearHistory()
    {
        var userId = GetUserId();
        var user = await db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        var logs = await db.WalletLedger.Where(l => l.UserId == userId).ToListAsync();
        db.WalletLedger.RemoveRange(logs);
        await db.SaveChangesAsync();

        return NoContent();
    }

    private int GetUserId() => int.Parse(User.FindFirstValue("userId")!);
}

public record DepositRequest(decimal Amount);
public record UpdateBalanceRequest(decimal Amount);
