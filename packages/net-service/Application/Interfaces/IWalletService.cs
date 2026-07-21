using LucyNetService.Application.DTOs;

namespace LucyNetService.Application.Interfaces;

public interface IWalletService
{
    Task<WalletResult> GetWalletAsync(int userId);
    Task<WalletResult> DepositAsync(int userId, DepositRequest req);
    Task<WalletResult> UpdateBalanceAsync(int userId, UpdateBalanceRequest req);
    Task<WalletResult> ClearHistoryAsync(int userId);
}

public class WalletResult
{
    public bool IsSuccess { get; init; }
    public string? Error { get; init; }
    public decimal? Balance { get; init; }
    public IEnumerable<WalletLedgerDto>? History { get; init; }

    public static WalletResult Fail(string error) =>
        new() { IsSuccess = false, Error = error };

    public static WalletResult Ok(decimal? balance = null, IEnumerable<WalletLedgerDto>? history = null) =>
        new() { IsSuccess = true, Balance = balance, History = history };
}

public record WalletLedgerDto(int Id, decimal Amount, string Type, string Description, DateTime CreatedAt);
