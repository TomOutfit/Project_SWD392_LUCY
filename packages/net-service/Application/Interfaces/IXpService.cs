using LucyNetService.Application.DTOs;

namespace LucyNetService.Application.Interfaces;

public interface IXpService
{
    Task<XpResult> AddXpAsync(int userId, AddXpRequest req);
    Task<XpResult> GetUserXpAsync(int userId);
}

public class XpResult
{
    public bool IsSuccess { get; init; }
    public string? Error { get; init; }
    public int? Xp { get; init; }
    public IEnumerable<XpLedgerDto>? History { get; init; }

    public static XpResult Fail(string error) =>
        new() { IsSuccess = false, Error = error };

    public static XpResult Ok(int? xp = null, IEnumerable<XpLedgerDto>? history = null) =>
        new() { IsSuccess = true, Xp = xp, History = history };
}

public record AddXpRequest(int Amount, string RoomId, string Description);
public record XpLedgerDto(int Id, int Amount, string RoomId, string Description, DateTime CreatedAt);
