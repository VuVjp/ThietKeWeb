using HotelManagement.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Linq;
using System;
using System.Threading;
using System.Threading.Tasks;

public class ReviewEligibilityCleanupBackgroundService : BackgroundService
{
    private static readonly TimeSpan CleanupInterval = TimeSpan.FromHours(24);
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ReviewEligibilityCleanupBackgroundService> _logger;

    public ReviewEligibilityCleanupBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<ReviewEligibilityCleanupBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Give the host some time to start up
        await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);

        await CleanupOnceAsync(stoppingToken);

        using var timer = new PeriodicTimer(CleanupInterval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await CleanupOnceAsync(stoppingToken);
        }
    }

    private async Task CleanupOnceAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var now = DateTime.Now;

            // Find expired review eligibilities
            var expiredList = await context.ReviewEligibilities
                .Where(re => re.ExpiresAt <= now)
                .ToListAsync(cancellationToken);

            if (expiredList.Any())
            {
                context.ReviewEligibilities.RemoveRange(expiredList);
                await context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Deleted {Count} expired review eligibility records.", expiredList.Count);
            }
        }
        catch (OperationCanceledException)
        {
            // Ignore shutdown cancellation.
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Review eligibility cleanup job failed.");
        }
    }
}
