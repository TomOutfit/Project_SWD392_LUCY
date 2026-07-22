using LucyNetService.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LucyNetService.Controllers;

[ApiController]
[Route("api/xp")]
[Produces("application/json")]
public class XpController(IXpService xpService) : ControllerBase
{
    [HttpPost("record")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RecordXp([FromBody] RecordXpRequest req)
    {
        if (req.UserId <= 0) return BadRequest(new { error = "Invalid userId" });
        if (req.Amount <= 0) return BadRequest(new { error = "Amount must be positive" });

        var result = await xpService.AddXpAsync(req.UserId, new AddXpRequest(req.Amount, req.RoomId, req.Description));
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(new { xp = result.Xp });
    }

    /// <summary>
    /// Internal endpoint for njs-service (server-to-server). Protected by internal API key header.
    /// </summary>
    [HttpPost("record-internal")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RecordXpInternal([FromBody] RecordXpRequest req, [FromHeader(Name = "X-Internal-Api-Key")] string? apiKey)
    {
        var internalKey = Environment.GetEnvironmentVariable("INTERNAL_API_KEY");
        if (string.IsNullOrEmpty(internalKey) || apiKey != internalKey)
            return Unauthorized(new { error = "Invalid internal API key" });

        if (req.UserId <= 0) return BadRequest(new { error = "Invalid userId" });
        if (req.Amount <= 0) return BadRequest(new { error = "Amount must be positive" });

        var result = await xpService.AddXpAsync(req.UserId, new AddXpRequest(req.Amount, req.RoomId, req.Description));
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(new { xp = result.Xp });
    }

    [HttpGet("user/{userId:int}")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetUserXp(int userId)
    {
        if (userId <= 0) return BadRequest(new { error = "Invalid userId" });

        var result = await xpService.GetUserXpAsync(userId);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(new { xp = result.Xp, history = result.History });
    }
}

public record RecordXpRequest(int UserId, int Amount, string RoomId, string Description);
