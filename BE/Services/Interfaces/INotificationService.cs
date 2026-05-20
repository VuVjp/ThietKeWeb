using HotelManagement.Dtos;

public interface INotificationService
{
    Task MarkAllAsReadAsync(int userId);
    Task SendByRoleAsync(RoleName role, CreateNotificationDto dto);
    Task<PaginatedResultDto<NotificationResponseDto>> GetNotificationsByUserIdAsync(int userId, int page, int pageSize, bool isClient = false);
    Task<int> CountUnreadNotificationsAsync(int userId, bool isClient = false);
    Task MarkAsReadAsync(int notificationId, int userId);
    Task SendToUserAsync(int userId, CreateNotificationDto dto);
}