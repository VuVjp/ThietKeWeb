using HotelManagement.Data;
using HotelManagement.Entities;
using Microsoft.EntityFrameworkCore;

public class NotificationRepository : INotificationRepository
{
    private readonly AppDbContext _context;

    public NotificationRepository(AppDbContext context)
    {
        _context = context;
    }

    private static readonly NotificationAction?[] _clientNotificationTypes = new NotificationAction?[]
    {
        NotificationAction.CheckIn,
        NotificationAction.CheckOut,
        NotificationAction.BookingCreated,
        NotificationAction.BookingUpdated,
        NotificationAction.BookingStatusChanged,
        NotificationAction.InvoiceCompleted,
        NotificationAction.ServiceCreated,
        NotificationAction.ServiceUpdated,
        NotificationAction.ReviewActivated,
        NotificationAction.ReviewDeactivated
    };

    public async Task AddAsync(Notification notification)
    {
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();
    }

    public async Task<List<Notification>> GetByUserIdAsync(int userId)
    {
        return await _context.Notifications
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
    }

    public async Task<List<Notification>> GetByUserIdPagedAsync(int userId, int page, int pageSize, bool isClient = false)
    {
        var skip = Math.Max(page - 1, 0) * pageSize;

        var query = _context.Notifications.Where(x => x.UserId == userId);

        if (isClient)
        {
            query = query.Where(x => _clientNotificationTypes.Contains(x.Type));
        }

        return await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip(skip)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task AddRangeAsync(List<Notification> notifications)
    {
        await _context.Notifications.AddRangeAsync(notifications);
        await _context.SaveChangesAsync();
    }

    public async Task<int> CountUnreadAsync(int userId, bool isClient = false)
    {
        var query = _context.Notifications.Where(x => x.UserId == userId && !x.IsRead);

        if (isClient)
        {
            query = query.Where(x => _clientNotificationTypes.Contains(x.Type));
        }

        return await query.CountAsync();
    }

    public async Task<int> CountByUserIdAsync(int userId, bool isClient = false)
    {
        var query = _context.Notifications.Where(x => x.UserId == userId);

        if (isClient)
        {
            query = query.Where(x => _clientNotificationTypes.Contains(x.Type));
        }

        return await query.CountAsync();
    }

    public async Task<Notification?> GetByIdAsync(int notificationId)
    {
        return await _context.Notifications.FirstOrDefaultAsync(x => x.Id == notificationId);
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}