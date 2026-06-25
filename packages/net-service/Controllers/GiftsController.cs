using LucyNetService.Data;
using LucyNetService.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace LucyNetService.Controllers;

[ApiController]
[Route("api/gifts")]
[Authorize]
public class GiftsController(AppDbContext db) : ControllerBase
{
    [HttpPost("send")]
    public async Task<IActionResult> Send([FromBody] SendGiftRequest req)
    {
        var senderId = GetUserId();
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
        return Ok(new { balance = sender.WalletBalance });
    }

    private int GetUserId() => int.Parse(User.FindFirstValue("userId")!);
}

public record SendGiftRequest(string RecipientEmail, string RoomId, string GiftType, decimal Amount);
