using LucyNetService.Data;
using LucyNetService.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace LucyNetService.Controllers;

[ApiController]
[Route("api/auth")]
[Produces("application/json")]
public class AuthController(AppDbContext db, IConfiguration config) : ControllerBase
{
    [HttpPost("register")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
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
            Role = "LUCY",
            WalletBalance = 100000m
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        db.WalletLedger.Add(new WalletLedger
        {
            UserId = user.Id,
            Amount = 100000m,
            Type = "Deposit",
            Description = "Welcome bonus"
        });
        await db.SaveChangesAsync();

        return Ok(new { token = GenerateJwt(user), refreshToken = Guid.NewGuid(), user = await MapUserWithGiftsAsync(user) });
    }

    [HttpPost("login")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email.ToLower().Trim());
        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { error = "Invalid email or password" });

        return Ok(new { token = GenerateJwt(user), refreshToken = Guid.NewGuid(), user = await MapUserWithGiftsAsync(user) });
    }

    private string GenerateJwt(User user)
    {
        var key = config["Jwt:Key"]!;
        var creds = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim("userId", user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim("role", user.Role),
            new Claim("displayName", user.DisplayName),
            new Claim("personaId", user.PersonaId.ToString()),
        };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    [HttpPost("guest")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GuestLogin([FromBody] GuestLoginRequest req)
    {
        var randomId = new Random().Next(10000, 99999);
        var displayName = string.IsNullOrWhiteSpace(req.DisplayName) 
            ? $"Guest_{randomId}" 
            : req.DisplayName.Trim();

        var user = new User
        {
            Email = $"guest_{randomId}@lucy.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("GuestPassword123!"),
            DisplayName = displayName,
            PersonaId = new Random().Next(1, 6),
            Role = "LUCY",
            WalletBalance = 0m
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return Ok(new { token = GenerateJwt(user), refreshToken = Guid.NewGuid(), user = await MapUserWithGiftsAsync(user) });
    }

    private async Task<object> MapUserWithGiftsAsync(User u)
    {
        var totalGiftsReceived = await db.GiftTransactions
            .Where(g => g.RecipientId == u.Id)
            .SumAsync(g => g.Amount);
        return new
        {
            u.Id,
            u.Email,
            u.DisplayName,
            u.PersonaId,
            u.Role,
            u.WalletBalance,
            TotalGiftsReceived = totalGiftsReceived
        };
    }
}

public record RegisterRequest(string Email, string Password, string DisplayName, int PersonaId);
public record LoginRequest(string Email, string Password);
public record GuestLoginRequest(string? DisplayName);
