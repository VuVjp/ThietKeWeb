using HotelManagement.Data;
using System.Threading;
using HotelManagement.Dtos;
using HotelManagement.Entities;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

public class NotificationService : INotificationService
{
    private static readonly SemaphoreSlim _sendSemaphore = new SemaphoreSlim(3);

    private readonly IDbContextFactory<AppDbContext> _contextFactory;
    private readonly INotificationRepository _repo;
    private readonly IHubContext<NotificationHub> _hub;
    private readonly IUserRepository _userRepository;

    public NotificationService(
        INotificationRepository repo,
        IHubContext<NotificationHub> hub,
        IUserRepository userRepository,
        IDbContextFactory<AppDbContext> contextFactory)
    {
        _repo = repo;
        _hub = hub;
        _userRepository = userRepository;
        _contextFactory = contextFactory;
    }

    public async Task MarkAllAsReadAsync(int userId)
    {
        var notifications = await _repo.GetByUserIdAsync(userId);
        foreach (var notification in notifications)
        {
            if (!notification.IsRead)
            {
                notification.IsRead = true;
            }
        }
        await _repo.SaveChangesAsync();
    }
    public async Task SendByRoleAsync(RoleName role, CreateNotificationDto dto)
    {
        var notifications = new List<Notification>();
        var targetGroups = new List<string>();

        await _sendSemaphore.WaitAsync();
        try
        {
            // 1. Thu hẹp phạm vi 'using' bằng cặp ngoặc nhọn { } để đóng DB Connection ngay khi xong
            using (var context = await _contextFactory.CreateDbContextAsync())
            {
                var users = await context.Users
                    .Include(u => u.Role)
                    .Where(u => u.Role!.Name == role.ToString())
                    .ToListAsync();

                foreach (var user in users)
                {
                    notifications.Add(new Notification
                    {
                        UserId = user.Id,
                        Title = dto.Title,
                        Content = dto.Content,
                        Type = dto.Type,
                        ReferenceLink = dto.ReferenceLink,
                        CreatedAt = DateTime.Now
                    });

                    targetGroups.Add($"user_{user.Id}");
                }

                if (notifications.Any())
                {
                    await context.AddRangeAsync(notifications);
                    await context.SaveChangesAsync(); // persist
                }
            }
        }
        finally
        {
            _sendSemaphore.Release();
        }

        // 2. Gọi SignalR bên ngoài khối using (An toàn tuyệt đối cho đa luồng)
        if (targetGroups.Count == 0) return;

        await _hub.Clients
            .Groups(targetGroups)
            .SendAsync("ReceiveNotification", new
            {
                dto.Title,
                dto.Content,
                type = dto.Type.ToString(),
                dto.ReferenceLink,
                CreatedAt = DateTime.Now
            });
    }


    public async Task<PaginatedResultDto<NotificationResponseDto>> GetNotificationsByUserIdAsync(int userId, int page, int pageSize, bool isClient = false)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var notifications = await _repo.GetByUserIdPagedAsync(userId, page, pageSize, isClient);
        var total = await _repo.CountByUserIdAsync(userId, isClient);

        var items = notifications.Select(n => new NotificationResponseDto
        {
            Id = n.Id,
            Title = n.Title,
            Content = n.Content,
            Type = n.Type,
            ReferenceLink = n.ReferenceLink,
            IsRead = n.IsRead,
            CreatedAt = n.CreatedAt
        }).ToList();

        return new PaginatedResultDto<NotificationResponseDto>
        {
            Items = items,
            Total = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<int> CountUnreadNotificationsAsync(int userId, bool isClient = false)
    {
        return await _repo.CountUnreadAsync(userId, isClient);
    }

    public async Task MarkAsReadAsync(int notificationId, int userId)
    {
        var notification = await _repo.GetByIdAsync(notificationId);
        if (notification != null && !notification.IsRead)
        {
            if (notification.UserId != userId)
            {
                throw new UnauthorizedAccessException("You are not allowed to mark this notification.");
            }

            notification.IsRead = true;
            await _repo.SaveChangesAsync();
        }
     }

    public async Task SendToUserAsync(int userId, CreateNotificationDto dto)
    {
        await _sendSemaphore.WaitAsync();
        try
        {
            using (var context = await _contextFactory.CreateDbContextAsync())
            {
                var notification = new Notification
                {
                    UserId = userId,
                    Title = dto.Title,
                    Content = dto.Content,
                    Type = dto.Type,
                    ReferenceLink = dto.ReferenceLink,
                    CreatedAt = DateTime.Now
                };

                await context.AddAsync(notification);
                await context.SaveChangesAsync();
            }
        }
        finally
        {
            _sendSemaphore.Release();
        }

        await _hub.Clients
            .Group($"user_{userId}")
            .SendAsync("ReceiveNotification", new
            {
                dto.Title,
                dto.Content,
                type = dto.Type.ToString(),
                dto.ReferenceLink,
                CreatedAt = DateTime.Now
            });
    }
}