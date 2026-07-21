namespace LucyNetService.Domain.Entities;

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public int PersonaId { get; set; } = 1;
    public string Role { get; set; } = "LUCY";
    public decimal WalletBalance { get; set; } = 0;
    public int Xp { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class GiftTransaction
{
    public int Id { get; set; }
    public int SenderId { get; set; }
    public int RecipientId { get; set; }
    public string RoomId { get; set; } = "";
    public string GiftType { get; set; } = "";
    public decimal Amount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class WalletLedger
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public decimal Amount { get; set; }
    public string Type { get; set; } = "";
    public string Description { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class XpLedger
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int Amount { get; set; }
    public string RoomId { get; set; } = "";
    public string Description { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
