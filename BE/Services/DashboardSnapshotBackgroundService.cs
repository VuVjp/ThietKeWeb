using HotelManagement.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace HotelManagement.Services;

public class DashboardSnapshotBackgroundService : BackgroundService
{
    private static readonly TimeSpan UpdateInterval = TimeSpan.FromHours(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DashboardSnapshotBackgroundService> _logger;

    public DashboardSnapshotBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<DashboardSnapshotBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Give the host some time to start up
        await Task.Delay(TimeSpan.FromSeconds(20), stoppingToken);

        await UpdateSnapshotsOnceAsync(stoppingToken);

        using var timer = new PeriodicTimer(UpdateInterval);
        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            await UpdateSnapshotsOnceAsync(stoppingToken);
        }
    }

    private async Task UpdateSnapshotsOnceAsync(CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Updating dashboard snapshots...");
            using var scope = _scopeFactory.CreateScope();
            var dashboardService = scope.ServiceProvider.GetRequiredService<IDashboardService>();
            
            await dashboardService.UpdateSnapshotsAsync();
            _logger.LogInformation("Dashboard snapshots updated successfully.");
        }
        catch (OperationCanceledException)
        {
            // Ignore shutdown cancellation.
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Dashboard snapshot update job failed.");
        }
    }
}
