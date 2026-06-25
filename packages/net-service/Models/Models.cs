namespace LucyNetService.Models;

public enum UserRole { LUCY = 0, PRO = 1, SUPER = 2 }

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public int PersonaId { get; set; } = 1;
    public UserRole Role { get; set; } = UserRole.LUCY;
    public decimal WalletBalance { get; set; } = 0m;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }
    // Anonymous session token — HMAC-signed payload (payload.sig format)
    public string? AnonToken { get; set; }
}

public class WalletLedger
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public decimal Amount { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class GiftTransaction
{
    public int Id { get; set; }
    public int SenderId { get; set; }
    public int RecipientId { get; set; }
    public string RoomId { get; set; } = string.Empty;
    public string GiftType { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// DTOs
public record RegisterRequest(string Email, string Password, string DisplayName, int PersonaId);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string Token, string RefreshToken, string AnonToken, UserDto User);
public record UserDto(int Id, string Email, string DisplayName, int PersonaId, string Role, decimal WalletBalance);
public record DepositRequest(decimal Amount);
public record SendGiftRequest(string RecipientAnonId, string RoomId, string GiftType, decimal Amount);
public record WalletResponse(decimal Balance, List<WalletLedgerDto> History);
public record WalletLedgerDto(int Id, decimal Amount, string Type, string Description, DateTime CreatedAt);
public record LeaderboardEntry(int Rank, int UserId, string DisplayName, int PersonaId, string Role, decimal TotalReceived);
