using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using LucyNetService.Data;
using LucyNetService.Models;

namespace LucyNetService.Services;

public class AuthService
{
    private readonly LucyDbContext _db;
    private readonly string _jwtSecret;
    private readonly string _anonSecret;

    public AuthService(LucyDbContext db, IConfiguration config)
    {
        _db = db;
        _jwtSecret = config["Jwt:Secret"] ?? "LUCY_SUPER_SECRET_KEY_2026_VERY_LONG_TOKEN_KEY_FOR_JWT";
        _anonSecret = config["Anon:Secret"] ?? "LUCY_ANON_SHARED_SECRET_2026_FOR_INTER_SERVICE_COMMUNICATION";
    }

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest req)
    {
        if (await _db.Users.AnyAsync(u => u.Email == req.Email)) return null;

        var user = new User
        {
            Email = req.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            DisplayName = req.DisplayName,
            PersonaId = req.PersonaId,
            Role = UserRole.LUCY,
            WalletBalance = 100m,
            CreatedAt = DateTime.UtcNow,
            AnonToken = GenerateAnonToken(req.DisplayName, req.PersonaId)
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return GenerateTokens(user);
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest req)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == req.Email);
        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash)) return null;

        // Refresh anon token on each login (allows persona/name changes)
        user.AnonToken = GenerateAnonToken(user.DisplayName, user.PersonaId);
        await _db.SaveChangesAsync();

        return GenerateTokens(user);
    }

    public async Task<AuthResponse?> RefreshTokenAsync(string refreshToken)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u =>
            u.RefreshToken == refreshToken && u.RefreshTokenExpiry > DateTime.UtcNow);
        if (user is null) return null;

        return GenerateTokens(user);
    }

    /// <summary>
    /// Decodes an anonToken and returns anonymous identity.
    /// Called ONLY by the Node.js service — real userId never leaves .NET.
    /// </summary>
    public AnonIdentity? DecodeAnonToken(string token)
    {
        try
        {
            var parts = token.Split('.');
            if (parts.Length != 2) return null;

            var payload = parts[0];
            var sig = parts[1];

            // Verify HMAC-SHA256
            var computed = ComputeHmacSha256(payload, _anonSecret);
            if (!CryptographicEquals(sig, computed)) return null;

            return JsonSerializer.Deserialize<AnonIdentity>(
                Encoding.UTF8.GetString(Convert.FromBase64String(payload)),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            );
        }
        catch { return null; }
    }

    private string GenerateAnonToken(string displayName, int personaId)
    {
        var anonId = Guid.NewGuid().ToString("N");
        var anonName = GenerateAnonName(displayName);

        var payload = Convert.ToBase64String(Encoding.UTF8.GetBytes(
            JsonSerializer.Serialize(new AnonIdentity { AnonId = anonId, AnonName = anonName, PersonaId = personaId })
        ));

        var sig = ComputeHmacSha256(payload, _anonSecret);
        return $"{payload}.{sig}";
    }

    private string ComputeHmacSha256(string data, string key)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return Convert.ToBase64String(hash);
    }

    private static bool CryptographicEquals(string a, string b)
    {
        var ba = Encoding.UTF8.GetBytes(a);
        var bb = Encoding.UTF8.GetBytes(b);
        return CryptographicOperations.FixedTimeEquals(ba, bb);
    }

    private AuthResponse GenerateTokens(User user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("persona", user.PersonaId.ToString()),
            new Claim("displayName", user.DisplayName),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: creds
        );

        var refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        _db.SaveChanges();

        return new AuthResponse(
            new JwtSecurityTokenHandler().WriteToken(token),
            refreshToken,
            user.AnonToken ?? string.Empty,
            new UserDto(user.Id, user.Email, user.DisplayName, user.PersonaId, user.Role.ToString(), user.WalletBalance)
        );
    }

    private static string GenerateAnonName(string displayName)
    {
        var prefixes = new[] { "Shadow", "Phantom", "Silent", "Cosmic", "Neon", "Crystal", "Echo", "Nova",
            "Pixel", "Cyber", "Storm", "Blaze", "Frost", "Thunder", "Ember", "Vortex" };
        var suffixes = new[] { "Wolf", "Hawk", "Fox", "Tiger", "Phoenix", "Dragon", "Raven", "Falcon",
            "Owl", "Panther", "Lynx", "Cobra", "Orca", "Ghost", "Spark", "Drift" };

        var rng = RandomNumberGenerator.GetBytes(4);
        var hash = Math.Abs(BitConverter.ToInt32(rng, 0));

        var prefix = prefixes[hash % prefixes.Length];
        var suffix = suffixes[(hash / prefixes.Length) % suffixes.Length];
        var number = (hash % 999) + 1;

        return $"{prefix}{suffix}{number}";
    }
}

public class AnonIdentity
{
    public string AnonId { get; set; } = string.Empty;
    public string AnonName { get; set; } = string.Empty;
    public int PersonaId { get; set; }
}
