using HotelManagement.Dtos;

namespace HotelManagement.Services.Interfaces;

public interface IDashboardService
{
    Task<DashboardOverviewDto> GetOverviewAsync(int days = 7, bool forceRefresh = false);
    Task<RoleDashboardDto> GetRoleDashboardAsync(RoleName role, int? userId, int days = 7);
    Task UpdateSnapshotsAsync();
}