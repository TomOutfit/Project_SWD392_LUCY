using LucyNetService.Data;
using LucyNetService.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace LucyNetService.Controllers;

[ApiController]
[Route("api/gifts")]
[Authorize]
[Produces("application/json")]
public class GiftsController(AppDbContext db) : ControllerBase
{
    /// <summary>
    /// Sends a virtual gift to another user inside a specific room.
    /// </summary>
    /// <param name="req">The gift transaction request containing the 10-character room code (format: abc-defg-hij).</param>
    /// <response code="200">Gift sent successfully, returns updated wallet balance.</response>
    /// <response code="400">Invalid parameters, self-gifting, or insufficient balance.</response>
    /// <response code="401">Unauthorized request.</response>
    /// <response code="404">Sender or recipient not found.</response>
    [HttpPost("send")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Send([FromBody] SendGiftRequest req)
    {
        var senderId = GetUserId();
        using var transaction = await db.Database.BeginTransactionAsync();
        try
        {
            var sender = await db.Users.FindAsync(senderId);
            if (sender == null) return NotFound(new { error = "Sender not found" });

            // Support both real email and anonymous format: user_{id}@lucy.local
            User? recipient;
            if (req.RecipientEmail.EndsWith("@lucy.local"))
            {
                var idStr = req.RecipientEmail.Replace("user_", "").Replace("@lucy.local", "");
                if (!int.TryParse(idStr, out var recipientId))
                    return BadRequest(new { error = "Invalid recipient" });
                recipient = await db.Users.FindAsync(recipientId);
            }
            else
            {
                recipient = await db.Users.FirstOrDefaultAsync(u => u.Email == req.RecipientEmail.ToLower());
            }

            if (recipient == null) return NotFound(new { error = "Recipient not found" });
            if (sender.Id == recipient.Id) return BadRequest(new { error = "Cannot send gift to yourself" });
            if (sender.WalletBalance < req.Amount) return BadRequest(new { error = "Insufficient balance" });

            sender.WalletBalance -= req.Amount;
            recipient.WalletBalance += req.Amount;

            db.GiftTransactions.Add(new GiftTransaction
            {
                SenderId = senderId,
                RecipientId = recipient.Id,
                RoomId = req.RoomId,
                GiftType = req.GiftType,
                Amount = req.Amount
            });
            db.WalletLedger.Add(new WalletLedger
            {
                UserId = senderId,
                Amount = -req.Amount,
                Type = "GiftSent",
                Description = $"Gift ({req.GiftType}) to {recipient.DisplayName}"
            });
            db.WalletLedger.Add(new WalletLedger
            {
                UserId = recipient.Id,
                Amount = req.Amount,
                Type = "GiftReceived",
                Description = $"Gift ({req.GiftType}) from {sender.DisplayName}"
            });

            await db.SaveChangesAsync();
            await transaction.CommitAsync();
            return Ok(new { balance = sender.WalletBalance });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { error = "An error occurred while processing the gift: " + ex.Message });
        }
    }

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetGifts()
    {
        var userId = GetUserId();
        var transactions = await db.GiftTransactions
            .Where(t => t.SenderId == userId || t.RecipientId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();
        return Ok(transactions);
    }

    [HttpPut("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateGift(int id, [FromBody] UpdateGiftRequest req)
    {
        var userId = GetUserId();
        var transaction = await db.GiftTransactions.FindAsync(id);
        if (transaction == null) return NotFound();

        if (transaction.SenderId != userId && transaction.RecipientId != userId)
            return Unauthorized(new { error = "Not authorized to update this transaction" });

        if (req.Amount.HasValue && req.Amount <= 0)
            return BadRequest(new { error = "Amount must be positive" });

        if (req.Amount.HasValue)
        {
            transaction.Amount = req.Amount.Value;
        }
        if (!string.IsNullOrWhiteSpace(req.GiftType))
        {
            transaction.GiftType = req.GiftType.Trim();
        }

        await db.SaveChangesAsync();
        return Ok(transaction);
    }

    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteGift(int id)
    {
        var userId = GetUserId();
        var transaction = await db.GiftTransactions.FindAsync(id);
        if (transaction == null) return NotFound();

        if (transaction.SenderId != userId && transaction.RecipientId != userId)
            return Unauthorized(new { error = "Not authorized to delete this transaction" });

        db.GiftTransactions.Remove(transaction);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private int GetUserId() => int.Parse(User.FindFirstValue("userId")!);
}

/// <summary>
/// Payload to send a virtual gift inside a speaking room.
/// </summary>
/// <param name="RecipientEmail">The email of the recipient or the anonymous user format: user_{id}@lucy.local.</param>
/// <param name="RoomId">The 10-character alphanumeric room code (format: abc-defg-hij) identifying the room.</param>
/// <param name="GiftType">The type of gift being sent (e.g. Crown 👑, Rocket 🚀, Diamond 💎, Star ⭐, Heart ❤️).</param>
/// <param name="Amount">The monetary or coin value of the gift.</param>
public record SendGiftRequest(string RecipientEmail, string RoomId, string GiftType, decimal Amount);
public record UpdateGiftRequest(string? GiftType, decimal? Amount);
