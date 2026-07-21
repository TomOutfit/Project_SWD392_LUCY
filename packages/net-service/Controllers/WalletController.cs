using LucyNetService.Application.DTOs;
using LucyNetService.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LucyNetService.Controllers;

[ApiController]
[Route("api/wallet")]
[Authorize]
[Produces("application/json")]
public class WalletController(IWalletService walletService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get()
    {
        var result = await walletService.GetWalletAsync(GetUserId());
        return MapResult(result);
    }

    [HttpPost("deposit")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Deposit([FromBody] DepositRequest req)
    {
        var result = await walletService.DepositAsync(GetUserId(), req);
        return MapResult(result);
    }

    [HttpPut]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateBalance([FromBody] UpdateBalanceRequest req)
    {
        var result = await walletService.UpdateBalanceAsync(GetUserId(), req);
        return MapResult(result);
    }

    [HttpDelete]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ClearHistory()
    {
        var result = await walletService.ClearHistoryAsync(GetUserId());
        return MapResult(result);
    }

    private int GetUserId() => int.Parse(User.FindFirstValue("userId")!);

    private IActionResult MapResult(WalletResult result)
    {
        if (!result.IsSuccess)
            return BadRequest(new { error = result.Error });

        if (result.History != null)
            return Ok(new { balance = result.Balance, history = result.History });

        return Ok(new { balance = result.Balance });
    }
}
