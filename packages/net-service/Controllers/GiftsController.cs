using LucyNetService.Application.DTOs;
using LucyNetService.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LucyNetService.Controllers;

[ApiController]
[Route("api/gifts")]
[Authorize]
[Produces("application/json")]
public class GiftsController(IGiftService giftService) : ControllerBase
{
    [HttpPost("send")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Send([FromBody] SendGiftRequest req)
    {
        var result = await giftService.SendGiftAsync(GetUserId(), req);
        return MapResult(result);
    }

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetGifts()
    {
        var transactions = await giftService.GetTransactionsAsync(GetUserId());
        return Ok(transactions);
    }

    [HttpPut("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateGift(int id, [FromBody] UpdateGiftRequest req)
    {
        var result = await giftService.UpdateTransactionAsync(GetUserId(), id, req);
        return MapResult(result);
    }

    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteGift(int id)
    {
        var result = await giftService.DeleteTransactionAsync(GetUserId(), id);
        return MapResult(result);
    }

    [HttpPost("support")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SupportCreator([FromBody] SupportCreatorRequest req)
    {
        var result = await giftService.SupportCreatorAsync(GetUserId(), req);
        return MapResult(result);
    }

    private int GetUserId() => int.Parse(User.FindFirstValue("userId")!);

    private IActionResult MapResult(GiftResult result)
    {
        if (!result.IsSuccess)
            return result.StatusCode switch
            {
                400 => BadRequest(new { error = result.Error }),
                401 => Unauthorized(new { error = result.Error }),
                404 => NotFound(new { error = result.Error }),
                _ => StatusCode(500, new { error = result.Error })
            };

        if (result.Transaction != null && result.NewBalance.HasValue)
            return Ok(new { balance = result.NewBalance });

        if (result.Transaction != null)
            return Ok(result.Transaction);

        return NoContent();
    }
}
