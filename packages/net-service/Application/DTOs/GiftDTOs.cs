namespace LucyNetService.Application.DTOs;

public record SendGiftRequest(string RecipientEmail, string RoomId, string GiftType, decimal Amount);
public record UpdateGiftRequest(string? GiftType, decimal? Amount);
public record SupportCreatorRequest(int CreatorId, string PodcastId, string PodcastTitle, decimal Amount);
