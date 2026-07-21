using LucyNetService.Application.DTOs;

namespace LucyNetService.Application.Interfaces;

public interface IGiftService
{
    Task<GiftResult> SendGiftAsync(int senderId, SendGiftRequest req);
    Task<GiftResult> SupportCreatorAsync(int senderId, SupportCreatorRequest req);
    Task<IEnumerable<GiftTransactionDto>> GetTransactionsAsync(int userId);
    Task<GiftResult> UpdateTransactionAsync(int userId, int transactionId, UpdateGiftRequest req);
    Task<GiftResult> DeleteTransactionAsync(int userId, int transactionId);
}

public class GiftResult
{
    public bool IsSuccess { get; init; }
    public string? Error { get; init; }
    public int? StatusCode { get; init; }
    public decimal? NewBalance { get; init; }
    public GiftTransactionDto? Transaction { get; init; }

    public static GiftResult Fail(string error, int statusCode = 400) =>
        new() { IsSuccess = false, Error = error, StatusCode = statusCode };

    public static GiftResult Ok(decimal? balance = null, GiftTransactionDto? tx = null) =>
        new() { IsSuccess = true, NewBalance = balance, Transaction = tx };
}

public record GiftTransactionDto(int Id, int SenderId, int RecipientId, string RoomId, string GiftType, decimal Amount, DateTime CreatedAt);
