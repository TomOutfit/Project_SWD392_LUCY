using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Threading.Tasks;

namespace LucyNetService.Controllers;

[ApiController]
[Route("api/telemetry")]
[Produces("application/json")]
public class TelemetryController : ControllerBase
{
    [HttpPost("log-latency")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> LogLatency([FromBody] LatencyLogRequest req)
    {
        try
        {
            var logsDir = Path.Combine(Directory.GetCurrentDirectory(), "logs");
            if (!Directory.Exists(logsDir))
            {
                Directory.CreateDirectory(logsDir);
            }
            
            var logFilePath = Path.Combine(logsDir, "network_latency.log");
            var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
            var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.fff");
            
            var logLine = $"[{timestamp}] [{clientIp}] {req.Method.ToUpper()} {req.Url} - RTT: {req.TotalMs:F2}ms, Server: {req.ServerMs:F2}ms, Network: {req.NetworkMs:F2}ms{Environment.NewLine}";
            
            await System.IO.File.AppendAllTextAsync(logFilePath, logLine);
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Telemetry] Error logging latency: {ex.Message}");
            return StatusCode(500, new { error = "Failed to write log" });
        }
    }
}

public record LatencyLogRequest(
    string Url,
    string Method,
    double TotalMs,
    double ServerMs,
    double NetworkMs
);
