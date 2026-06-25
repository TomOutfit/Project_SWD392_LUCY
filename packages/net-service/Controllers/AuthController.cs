using LucyNetService.Data;
using LucyNetService.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace LucyNetService.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, IConfiguration config) : ControllerBase
{
    [HttpPost("register")]
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
            WalletBalance = 100m
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        db.WalletLedger.Add(new WalletLedger
        {
            UserId = user.Id,
            Amount = 100m,
            Type = "Deposit",
            Description = "Welcome bonus"
        });
        await db.SaveChangesAsync();

        return Ok(new { token = GenerateJwt(user), refreshToken = Guid.NewGuid(), user = MapUser(user) });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email.ToLower().Trim());
        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { error = "Invalid email or password" });

        return Ok(new { token = GenerateJwt(user), refreshToken = Guid.NewGuid(), user = MapUser(user) });
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

    private static object MapUser(User u) => new
    {
        u.Id, u.Email, u.DisplayName, u.PersonaId, u.Role, u.WalletBalance
    };
}

public record RegisterRequest(string Email, string Password, string DisplayName, int PersonaId);
public record LoginRequest(string Email, string Password);
