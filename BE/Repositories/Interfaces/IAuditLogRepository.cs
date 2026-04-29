using HotelManagement.Dtos;
using HotelManagement.Entities;

public interface IAuditLogRepository
{
    Task AppendEventAsync(int? userId, DateTime auditDate, AuditLogEventDto auditEvent, CancellationToken cancellationToken = default);
    Task<List<AuditLog>> GetDailyBucketsAsync(int? userId = null, CancellationToken cancellationToken = default);
    Task<int> DeleteOlderThanAsync(DateTime cutoffDate, CancellationToken cancellationToken = default);
}
