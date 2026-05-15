using HotelManagement.Data;
using HotelManagement.Dtos;
using HotelManagement.Enums;
using HotelManagement.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.Json.Nodes;
using HotelManagement.Entities.Snapshots;

namespace HotelManagement.Services.Implementations;

public class DashboardService : IDashboardService
{
    private static readonly HashSet<string> RevenueBookingStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "Confirmed",
        "CheckedIn",
        "CheckedOut",
    };

    private readonly AppDbContext _context;
    private readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = false,
    };

    private sealed class BookingProjection
    {
        public int Id { get; set; }
        public string? GuestName { get; set; }
        public string? Status { get; set; }
        public decimal FinalPrice { get; set; }
        public DateTime? CheckInDate { get; set; }
        public DateTime? CheckOutDate { get; set; }
    }

    private sealed class OrderProjection
    {
        public int Id { get; set; }
        public OrderServiceStatus Status { get; set; }
        public DateTime OrderDate { get; set; }
        public decimal TotalAmount { get; set; }
        public string? RoomNumber { get; set; }
        public string? GuestName { get; set; }
    }

    private sealed class RoomProjection
    {
        public int Id { get; set; }
        public string? RoomNumber { get; set; }
        public string? Status { get; set; }
        public string? CleaningStatus { get; set; }
        public bool CleaningRequested { get; set; }
    }

    private sealed class PaymentProjection
    {
        public decimal AmountPaid { get; set; }
        public DateTime? PaymentDate { get; set; }
        public string? Status { get; set; }
        public string? PaymentForType { get; set; }
    }

    private sealed class AuditLogBucketPayload
    {
        public int TotalEvents { get; set; }
        public List<AuditLogEventDto> Events { get; set; } = new();
    }

    private sealed class InvoiceProjection
    {
        public int Id { get; set; }
        public string? InvoiceCode { get; set; }
        public decimal? FinalTotal { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string? Status { get; set; }
    }

    public DashboardService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardOverviewDto> GetOverviewAsync(int days = 7, bool forceRefresh = false)
    {
        var isAllTime = days <= 0;
        var normalizedDays = isAllTime ? 0 : Math.Clamp(days, 1, 365);
        
        // Try to get from snapshot if it's a standard range (0, 1, 7, 30, 365) and NOT forceRefresh
        if (!forceRefresh && (normalizedDays == 0 || normalizedDays == 1 || normalizedDays == 7 || normalizedDays == 30 || normalizedDays == 365))
        {
            var expectedStart = GetPeriodStart(normalizedDays);
            var snapshot = await _context.DashboardSnapshots
                .AsNoTracking()
                .Where(s => s.SnapshotType == normalizedDays && s.SnapshotDate == expectedStart)
                .OrderByDescending(s => s.LastUpdated)
                .FirstOrDefaultAsync();

            if (snapshot != null && snapshot.LastUpdated > DateTime.Now.AddHours(-1))
            {
                var snapshotDto = snapshot.Data;
                if (snapshotDto != null)
                {
                    // Some parts must be real-time even in snapshot
                    await RefreshRealTimePartsAsync(snapshotDto);
                    return snapshotDto;
                }
            }
        }

        var dto = await CalculateOverviewAsync(normalizedDays);

        // If force refresh on a standard range, update the snapshot
        if (forceRefresh && (normalizedDays == 0 || normalizedDays == 1 || normalizedDays == 7 || normalizedDays == 30 || normalizedDays == 365))
        {
            await SaveSnapshotAsync(normalizedDays, dto);
        }

        return dto;
    }

    private async Task SaveSnapshotAsync(int range, DashboardOverviewDto overview)
    {
        var periodStart = overview.Meta.PeriodStart;
        var existing = await _context.DashboardSnapshots
            .FirstOrDefaultAsync(s => s.SnapshotType == range && s.SnapshotDate == periodStart);

        if (existing != null)
        {
            existing.Data = overview;
            existing.LastUpdated = DateTime.Now;
            _context.DashboardSnapshots.Update(existing);
        }
        else
        {
            await _context.DashboardSnapshots.AddAsync(new DashboardSnapshot
            {
                SnapshotType = range,
                Data = overview,
                SnapshotDate = periodStart,
                LastUpdated = DateTime.Now
            });
        }
        await _context.SaveChangesAsync();
    }

    private async Task RefreshRealTimePartsAsync(DashboardOverviewDto dto)
    {
        // Occupancy and real-time alerts should always be fresh
        var rooms = await _context.Rooms
            .AsNoTracking()
            .Select(room => new RoomProjection
            {
                Id = room.Id,
                RoomNumber = room.RoomNumber,
                Status = room.Status,
                CleaningStatus = room.CleaningStatus,
                CleaningRequested = room.CleaningRequested,
            })
            .ToListAsync();

        var occupancy = BuildOccupancySummary(rooms);
        dto.Breakdown.Occupancy = occupancy;
        dto.Breakdown.InspectingCount = rooms.Count(room => string.Equals(room.CleaningStatus, "Inspecting", StringComparison.OrdinalIgnoreCase));
        dto.Breakdown.PendingCleaningRooms = rooms
            .Where(room => room.CleaningRequested)
            .Select(room => new DashboardRoomTaskDto
            {
                Id = room.Id,
                RoomNumber = room.RoomNumber ?? string.Empty,
                Status = room.Status ?? string.Empty,
                CleaningStatus = room.CleaningStatus ?? string.Empty,
                CleaningRequested = room.CleaningRequested
            })
            .ToList();

        dto.Breakdown.InspectingRooms = rooms
            .Where(room => string.Equals(room.CleaningStatus, "Inspecting", StringComparison.OrdinalIgnoreCase))
            .Select(room => new DashboardRoomTaskDto
            {
                Id = room.Id,
                RoomNumber = room.RoomNumber ?? string.Empty,
                Status = room.Status ?? string.Empty,
                CleaningStatus = room.CleaningStatus ?? string.Empty,
                CleaningRequested = room.CleaningRequested
            })
            .ToList();
        
        dto.Widgets.RoomStatusChart = new List<DashboardRoomStatusPointDto>
        {
            new() { Name = "Available", Value = occupancy.Available, Color = "#0ea5e9" },
            new() { Name = "Occupied", Value = occupancy.Occupied, Color = "#6366f1" },
            new() { Name = "Maintenance", Value = occupancy.Maintenance, Color = "#f59e0b" },
        };

        dto.Widgets.PendingServices = await _context.OrderServices
            .AsNoTracking()
            .Where(item => item.Status == OrderServiceStatus.Pending)
            .OrderByDescending(item => item.OrderDate)
            .Take(10)
            .Select(item => new DashboardPendingServiceDto
            {
                Id = item.Id,
                RoomNumber = item.BookingDetail != null && item.BookingDetail.Room != null
                    ? item.BookingDetail.Room.RoomNumber!
                    : "N/A",
                GuestName = item.BookingDetail != null && item.BookingDetail.Booking != null
                    ? item.BookingDetail.Booking.GuestName!
                    : "Unknown",
                OrderDate = item.OrderDate,
            })
            .ToListAsync();
            
        dto.Alerts = await _context.LossAndDamages
            .AsNoTracking()
            .OrderByDescending(item => item.CreatedAt)
            .Take(3)
            .Select(item => new DashboardCriticalAlertDto
            {
                Id = item.Id,
                ItemName = item.RoomInventory != null ? item.RoomInventory.ItemName ?? "Unknown" : "Unknown",
                Room = item.RoomInventory != null && item.RoomInventory.Room != null ? item.RoomInventory.Room.RoomNumber ?? "Unknown" : "Unknown",
                Penalty = item.PenaltyAmount,
                Description = item.Description ?? "No description",
            })
            .ToListAsync();

        // Populate recent events
        dto.Events = await _context.AuditLogs
            .AsNoTracking()
            .OrderByDescending(l => l.LastUpdatedAt)
            .Take(5)
            .Select(l => new DashboardEventDto
            {
                Id = l.Id,
                Type = "ACTIVITY",
                Message = $"Audit log updated for user {l.UserId}",
                Timestamp = l.LastUpdatedAt ?? DateTime.Now,
                Severity = "Info"
            })
            .ToListAsync();
    }

    private DateTime GetPeriodStart(int days)
    {
        var isAllTime = days <= 0;
        var normalizedDays = isAllTime ? 0 : Math.Clamp(days, 1, 365);
        var today = DateTime.Today;

        if (isAllTime) return DateTime.MinValue;
        if (normalizedDays == 1) return today;
        if (normalizedDays == 7)
        {
            int diff = (7 + (today.DayOfWeek - DayOfWeek.Monday)) % 7;
            return today.AddDays(-1 * diff).Date;
        }
        if (normalizedDays == 30) return new DateTime(today.Year, today.Month, 1);
        if (normalizedDays == 365) return new DateTime(today.Year, 1, 1);
        
        return today.AddDays(-(normalizedDays - 1));
    }

    private async Task<DashboardOverviewDto> CalculateOverviewAsync(int days)
    {
        var isAllTime = days <= 0;
        var normalizedDays = isAllTime ? 0 : Math.Clamp(days, 1, 365);
        
        DateTime startDate, endDate, prevStartDate, prevEndDate;
        var today = DateTime.Today;
        endDate = today.AddDays(1); // Exclusive upper bound
        startDate = GetPeriodStart(normalizedDays);

        if (isAllTime)
        {
            prevStartDate = DateTime.MinValue;
            prevEndDate = DateTime.MinValue;
        }
        else
        {
            if (normalizedDays == 1) // Daily
            {
                prevStartDate = startDate.AddDays(-1);
                prevEndDate = startDate;
            }
            else if (normalizedDays == 7) // Weekly
            {
                prevStartDate = startDate.AddDays(-7);
                prevEndDate = startDate;
            }
            else if (normalizedDays == 30) // Monthly
            {
                prevStartDate = startDate.AddMonths(-1);
                prevEndDate = startDate;
            }
            else if (normalizedDays == 365) // Yearly
            {
                prevStartDate = startDate.AddYears(-1);
                prevEndDate = startDate;
            }
            else // Sliding window
            {
                prevStartDate = startDate.AddDays(-normalizedDays);
                prevEndDate = startDate;
            }
        }

        // Current period stats
        var currentRevenue = await _context.Payments
            .AsNoTracking()
            .Where(p => (string.IsNullOrEmpty(p.Status) || p.Status == "Completed") 
                        && p.PaymentDate >= startDate && p.PaymentDate < endDate)
            .SumAsync(p => p.AmountPaid);

        var currentBookings = await _context.Bookings
            .AsNoTracking()
            .CountAsync(b => RevenueBookingStatuses.Contains(b.Status!) 
                             && b.CreatedAt >= startDate && b.CreatedAt < endDate);

        var currentLossPenalty = await _context.LossAndDamages
            .AsNoTracking()
            .Where(l => l.CreatedAt >= startDate && l.CreatedAt < endDate)
            .SumAsync(item => item.PenaltyAmount);

        var currentNetProfit = currentRevenue - currentLossPenalty;

        var currentServiceOrders = await _context.OrderServices
            .AsNoTracking()
            .CountAsync(o => o.OrderDate >= startDate && o.OrderDate < endDate);

        var currentArticles = await _context.Articles
            .AsNoTracking()
            .CountAsync(a => a.PublishedAt != null && a.IsActive);

        // Calculate cleaned rooms from audit logs
        var currentAuditLogs = await _context.AuditLogs
            .AsNoTracking()
            .Where(l => l.AuditDate >= startDate && l.AuditDate < endDate)
            .Select(l => l.EventJson)
            .ToListAsync();

        var currentCleanedRooms = 0;
        foreach (var json in currentAuditLogs)
        {
            var payload = DeserializePayload(json);
            currentCleanedRooms += payload.Events.Count(IsCleaningCompletedEvent);
        }

        // --- SNAPSHOT-BASED COMPARISON LOGIC ---
        decimal prevRevenue = 0;
        int prevBookings = 0;
        decimal prevNetProfit = 0;
        int prevServiceOrders = 0;
        int prevDamageReports = 0;

        // Try to fetch previous stats from existing snapshot first
        // We look for the MOST RECENT snapshot of this type that exists BEFORE our current startDate
        var prevSnapshot = await _context.DashboardSnapshots
            .AsNoTracking()
            .Where(s => s.SnapshotType == normalizedDays && s.SnapshotDate < startDate)
            .OrderByDescending(s => s.SnapshotDate)
            .FirstOrDefaultAsync();

        if (prevSnapshot != null && prevSnapshot.Data != null)
        {
            var prevData = prevSnapshot.Data.Summary;
            prevRevenue = prevData.TotalRevenue;
            prevBookings = prevData.BookingCount;
            prevNetProfit = prevData.NetProfit;
            prevServiceOrders = prevData.ServiceOrdersCount;
            prevDamageReports = (int)(prevData.Comparison?.Metrics?.DamageReports?.Current ?? 0);
        }
        else if (!isAllTime) // Fallback to raw query if no snapshot exists
        {
            prevRevenue = await _context.Payments
                .AsNoTracking()
                .Where(p => (string.IsNullOrEmpty(p.Status) || p.Status == "Completed") 
                            && p.PaymentDate >= prevStartDate && p.PaymentDate < prevEndDate)
                .SumAsync(p => p.AmountPaid);

            prevBookings = await _context.Bookings
                .AsNoTracking()
                .CountAsync(b => RevenueBookingStatuses.Contains(b.Status!) 
                                 && b.CreatedAt >= prevStartDate && b.CreatedAt < prevEndDate);

            var prevLossPenalty = await _context.LossAndDamages
                .AsNoTracking()
                .Where(l => l.CreatedAt >= prevStartDate && l.CreatedAt < prevEndDate)
                .SumAsync(item => item.PenaltyAmount);
            prevNetProfit = prevRevenue - prevLossPenalty;

            prevServiceOrders = await _context.OrderServices
                .AsNoTracking()
                .CountAsync(o => o.OrderDate >= prevStartDate && o.OrderDate < prevEndDate);
                
            prevDamageReports = await _context.LossAndDamages
                .AsNoTracking()
                .CountAsync(l => l.CreatedAt >= prevStartDate && l.CreatedAt < prevEndDate);
        }

        // Aggregate stats
        var totalRevenue = await _context.Payments
            .AsNoTracking()
            .Where(p => string.IsNullOrEmpty(p.Status) || p.Status == "Completed")
            .SumAsync(p => p.AmountPaid);

        var confirmedBookingsCount = await _context.Bookings
            .AsNoTracking()
            .CountAsync(b => RevenueBookingStatuses.Contains(b.Status!));

        var auditLogCount = await _context.AuditLogs.AsNoTracking().CountAsync();

        var revenueChartData = BuildRevenueChartData(startDate, normalizedDays, await _context.Payments
            .AsNoTracking()
            .Where(p => (string.IsNullOrEmpty(p.Status) || p.Status == "Completed") && p.PaymentDate >= startDate && p.PaymentDate < endDate)
            .Select(p => new PaymentProjection { AmountPaid = p.AmountPaid, PaymentDate = p.PaymentDate, Status = p.Status, PaymentForType = p.PaymentForType })
            .ToListAsync());

        var recentBookings = await _context.Bookings
            .AsNoTracking()
            .OrderByDescending(b => b.CreatedAt)
            .Take(5)
            .Select(b => new DashboardRecentBookingDto
            {
                Id = b.Id,
                GuestName = b.GuestName ?? "Unknown",
                CheckInDate = b.BookingDetails.OrderBy(d => d.CheckInDate).Select(d => d.CheckInDate).FirstOrDefault(),
                CheckOutDate = b.BookingDetails.OrderByDescending(d => d.CheckOutDate).Select(d => d.CheckOutDate).FirstOrDefault(),
                TotalAmount = b.TotalPrice,
                Status = b.Status ?? "Pending"
            })
            .ToListAsync();

        var currentCleaningRequests = await _context.Rooms.CountAsync(r => r.CleaningRequested);

        var dto = new DashboardOverviewDto
        {
            Meta = new DashboardMetaDto
            {
                PeriodType = isAllTime ? "ALL_TIME" : (normalizedDays == 1 ? "DAILY" : (normalizedDays == 7 ? "WEEKLY" : (normalizedDays == 30 ? "MONTHLY" : "YEARLY"))),
                PeriodKey = isAllTime ? "All Time" : $"{startDate:yyyy-MM-dd}",
                PeriodStart = startDate,
                PeriodEnd = endDate,
                GeneratedAt = DateTime.Now
            },
            Summary = new DashboardSummaryDto
            {
                TotalRevenue = currentRevenue,
                BookingCount = currentBookings,
                NetProfit = currentNetProfit,
                AuditLogTotal = auditLogCount,
                ArticlesCount = currentArticles,
                ServiceOrdersCount = currentServiceOrders,
                Comparison = new DashboardComparisonDto
                {
                    Base = new DashboardComparisonBaseDto
                    {
                        ComparisonType = "PREVIOUS_PERIOD",
                        CurrentPeriodKey = isAllTime ? "All Time" : $"{startDate:yyyy-MM-dd} to {endDate.AddDays(-1):yyyy-MM-dd}",
                        PreviousPeriodKey = isAllTime ? "None" : $"{prevStartDate:yyyy-MM-dd} to {prevEndDate.AddDays(-1):yyyy-MM-dd}"
                    },
                    Metrics = new DashboardMetricsComparisonContainer
                    {
                        Revenue = CreateMetricComparison(currentRevenue, prevRevenue, true),
                        Bookings = CreateMetricComparison(currentBookings, prevBookings, true),
                        NetProfit = CreateMetricComparison(currentNetProfit, prevNetProfit, true),
                        DamageReports = CreateMetricComparison(
                            await _context.LossAndDamages.CountAsync(l => l.CreatedAt >= startDate && l.CreatedAt < endDate),
                            prevDamageReports,
                            false
                        ),
                        LowStockItems = CreateMetricComparison(
                            await _context.Equipments.CountAsync(e => e.TotalQuantity < 5),
                            0,
                            false
                        ),
                        CleaningRequests = CreateMetricComparison(currentCleaningRequests, 0, false), // Increase is BAD for pending tasks
                        Articles = CreateMetricComparison(currentArticles, currentArticles, true),
                        ServiceOrders = CreateMetricComparison(currentServiceOrders, prevServiceOrders, true)
                    }
                }
            },
            Widgets = new DashboardWidgetsDto
            {
                RevenueChart = revenueChartData,
                RecentBookings = recentBookings
            },
            Breakdown = new DashboardBreakdownDto()
        };

        await RefreshRealTimePartsAsync(dto);
        return dto;
    }

    private static DashboardMetricComparisonDto CreateMetricComparison(decimal current, decimal previous, bool increaseIsPositive)
    {
        var difference = current - previous;
        var growthRate = previous == 0 
            ? (current == 0 ? 0 : (current > 0 ? 100m : -100m)) 
            : (difference / Math.Abs(previous) * 100m);
        var trend = difference > 0 ? "up" : (difference < 0 ? "down" : "flat");
        
        string directionMeaning;
        if (difference == 0) directionMeaning = "neutral";
        else if (difference > 0) directionMeaning = increaseIsPositive ? "positive" : "negative";
        else directionMeaning = increaseIsPositive ? "negative" : "positive";

        return new DashboardMetricComparisonDto
        {
            Current = current,
            Previous = previous,
            Difference = difference,
            GrowthRate = Math.Round(growthRate, 2),
            Trend = trend,
            DirectionMeaning = directionMeaning
        };
    }

    public async Task UpdateSnapshotsAsync()
    {
        int[] ranges = { 0, 1, 7, 30, 365 }; // 0 represents All Time
        foreach (var range in ranges)
        {
            var overview = await CalculateOverviewAsync(range);
            await SaveSnapshotAsync(range, overview);
        }
    }

    public async Task<RoleDashboardDto> GetRoleDashboardAsync(RoleName role, int? userId, int days = 7)
    {
        var overview = await GetOverviewAsync(days);
        return role switch
        {
            RoleName.Housekeeping => new RoleDashboardDto
            {
                Role = role.ToString(),
                Housekeeper = await BuildHousekeeperDashboardAsync(userId, days),
            },
            RoleName.Accountant => new RoleDashboardDto
            {
                Role = role.ToString(),
                Accountant = await BuildAccountantDashboardAsync(days),
            },
            RoleName.Receptionist => new RoleDashboardDto
            {
                Role = role.ToString(),
                Receptionist = await BuildReceptionistDashboardAsync(),
            },
            RoleName.Manager or RoleName.Admin => new RoleDashboardDto
            {
                Role = role.ToString(),
                Manager = await BuildManagerDashboardAsync(overview),
                Overview = overview,
            },
            _ => new RoleDashboardDto
            {
                Role = role.ToString(),
                Overview = overview,
            },
        };
    }

    private async Task<HousekeeperDashboardDto> BuildHousekeeperDashboardAsync(int? userId, int days)
    {
        var isAllTime = days <= 0;
        var normalizedDays = isAllTime ? 0 : Math.Clamp(days, 1, 31);
        var endDate = DateTime.Today;
        var startDate = isAllTime ? DateTime.MinValue : endDate.AddDays(-(normalizedDays - 1));

        var cleaningRequests = await _context.Rooms.AsNoTracking().CountAsync(room => room.CleaningRequested);
        var inspectionRequests = await _context.Rooms.AsNoTracking()
            .CountAsync(room => room.CleaningStatus != null
                && room.CleaningStatus.ToLower() == "inspecting");

        var pendingCleaningRooms = await _context.Rooms
            .AsNoTracking()
            .Where(r => r.CleaningRequested)
            .Select(r => new DashboardRoomTaskDto
            {
                Id = r.Id,
                RoomNumber = r.RoomNumber ?? string.Empty,
                Status = r.Status ?? string.Empty,
                CleaningStatus = r.CleaningStatus ?? string.Empty,
                CleaningRequested = r.CleaningRequested
            })
            .ToListAsync();

        var inspectingRooms = await _context.Rooms
            .AsNoTracking()
            .Where(r => r.CleaningStatus != null && r.CleaningStatus.ToLower() == "inspecting")
            .Select(r => new DashboardRoomTaskDto
            {
                Id = r.Id,
                RoomNumber = r.RoomNumber ?? string.Empty,
                Status = r.Status ?? string.Empty,
                CleaningStatus = r.CleaningStatus ?? string.Empty,
                CleaningRequested = r.CleaningRequested
            })
            .ToListAsync();

        if (!userId.HasValue)
        {
            return new HousekeeperDashboardDto
            {
                CleanedToday = 0,
                CleanedInRange = 0,
                CleaningRequests = cleaningRequests,
                InspectionRequests = inspectionRequests,
                InspectingCount = inspectionRequests,
                PendingCleaningRooms = pendingCleaningRooms,
                InspectingRooms = inspectingRooms
            };
        }

        var auditBuckets = await _context.AuditLogs
            .AsNoTracking()
            .Where(log => log.UserId == userId.Value && log.AuditDate >= startDate && log.AuditDate <= endDate)
            .Select(log => log.EventJson)
            .ToListAsync();

        var cleanedToday = 0;
        var cleanedInRange = 0;

        foreach (var json in auditBuckets)
        {
            var payload = DeserializePayload(json);
            foreach (var evt in payload.Events)
            {
                if (!IsCleaningCompletedEvent(evt))
                {
                    continue;
                }

                if (evt.Timestamp.Date == endDate)
                {
                    cleanedToday++;
                }

                if (evt.Timestamp.Date >= startDate && evt.Timestamp.Date <= endDate)
                {
                    cleanedInRange++;
                }
            }
        }

        return new HousekeeperDashboardDto
        {
            CleanedToday = cleanedToday,
            CleanedInRange = cleanedInRange,
            CleaningRequests = cleaningRequests,
            InspectionRequests = inspectionRequests,
            InspectingCount = inspectionRequests,
            PendingCleaningRooms = pendingCleaningRooms,
            InspectingRooms = inspectingRooms
        };
    }

    private async Task<AccountantDashboardDto> BuildAccountantDashboardAsync(int days)
    {
        var isAllTime = days <= 0;
        var normalizedDays = isAllTime ? 0 : Math.Clamp(days, 1, 31);
        var endDate = DateTime.Today.AddDays(1); // Exclusive upper bound
        var startDate = isAllTime ? DateTime.MinValue : DateTime.Today.AddDays(-(normalizedDays - 1));

        var rangePayments = await _context.Payments
            .AsNoTracking()
            .Where(p => (string.IsNullOrEmpty(p.Status) || p.Status == "Completed") 
                        && p.PaymentDate >= startDate && p.PaymentDate < endDate)
            .Select(payment => new PaymentProjection
            {
                AmountPaid = payment.AmountPaid,
                PaymentDate = payment.PaymentDate,
                Status = payment.Status,
                PaymentForType = payment.PaymentForType,
            })
            .ToListAsync();

        var totalRevenueInRange = rangePayments.Sum(item => item.AmountPaid);

        var totalLossPenaltyInRange = await _context.LossAndDamages
            .AsNoTracking()
            .Where(l => l.CreatedAt >= startDate && l.CreatedAt < endDate)
            .SumAsync(item => item.PenaltyAmount);

        var revenueChartData = BuildRevenueChartData(startDate, days, rangePayments);

        var invoices = await _context.Invoices
            .AsNoTracking()
            .Select(invoice => new InvoiceProjection
            {
                Id = invoice.Id,
                InvoiceCode = invoice.InvoiceCode,
                FinalTotal = invoice.FinalTotal,
                CompletedAt = invoice.CompletedAt,
                Status = invoice.Status,
            })
            .ToListAsync();

        var topInvoices = invoices
            .Where(item => item.FinalTotal.HasValue)
            .Where(item => item.CompletedAt.HasValue
                || string.Equals(item.Status, "Completed", StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(item => item.FinalTotal)
            .Take(5)
            .Select(item => new DashboardTopInvoiceDto
            {
                Id = item.Id,
                InvoiceCode = item.InvoiceCode ?? string.Empty,
                FinalTotal = item.FinalTotal ?? 0,
                CompletedAt = item.CompletedAt,
            })
            .ToList();

        return new AccountantDashboardDto
        {
            TotalRevenue = totalRevenueInRange,
            TotalLossPenalty = totalLossPenaltyInRange,
            NetProfit = totalRevenueInRange - totalLossPenaltyInRange,
            RevenueChartData = revenueChartData,
            TopInvoices = topInvoices,
        };
    }

    private async Task<ReceptionistDashboardDto> BuildReceptionistDashboardAsync()
    {
        var today = DateTime.Today;

        var publishedArticles = await _context.Articles
            .AsNoTracking()
            .CountAsync(article => article.PublishedAt != null && article.IsActive);

        var pendingArticles = await _context.Articles
            .AsNoTracking()
            .CountAsync(article => article.PublishedAt == null);

        var pendingServiceOrders = await _context.OrderServices
            .AsNoTracking()
            .CountAsync(order => order.Status == OrderServiceStatus.Pending);

        var completedServiceOrdersToday = await _context.OrderServices
            .AsNoTracking()
            .CountAsync(order => order.Status == OrderServiceStatus.Completed
                && order.UpdatedAt.HasValue
                && order.UpdatedAt.Value.Date == today);

        var serviceQueue = await _context.OrderServices
            .AsNoTracking()
            .Where(o => o.Status == OrderServiceStatus.Pending)
            .OrderByDescending(o => o.OrderDate)
            .Select(o => new DashboardPendingServiceDto
            {
                Id = o.Id,
                RoomNumber = o.BookingDetail != null && o.BookingDetail.Room != null ? o.BookingDetail.Room.RoomNumber! : "N/A",
                GuestName = o.BookingDetail != null && o.BookingDetail.Booking != null ? o.BookingDetail.Booking.GuestName! : "Unknown",
                OrderDate = o.OrderDate,
            })
            .ToListAsync();

        var rooms = await _context.Rooms
            .AsNoTracking()
            .Select(room => new RoomProjection
            {
                Id = room.Id,
                RoomNumber = room.RoomNumber,
                Status = room.Status,
                CleaningStatus = room.CleaningStatus,
                CleaningRequested = room.CleaningRequested,
            })
            .ToListAsync();

        return new ReceptionistDashboardDto
        {
            PublishedArticles = publishedArticles,
            PendingArticles = pendingArticles,
            PendingServiceOrders = pendingServiceOrders,
            CompletedServiceOrdersToday = completedServiceOrdersToday,
            ServiceQueue = serviceQueue,
            PendingCleaningRooms = rooms
                .Where(room => room.CleaningRequested)
                .Select(room => new DashboardRoomTaskDto
                {
                    Id = room.Id,
                    RoomNumber = room.RoomNumber ?? string.Empty,
                    Status = room.Status ?? string.Empty,
                    CleaningStatus = room.CleaningStatus ?? string.Empty,
                    CleaningRequested = room.CleaningRequested
                })
                .ToList(),
            InspectingRooms = rooms
                .Where(room => string.Equals(room.CleaningStatus, "Inspecting", StringComparison.OrdinalIgnoreCase))
                .Select(room => new DashboardRoomTaskDto
                {
                    Id = room.Id,
                    RoomNumber = room.RoomNumber ?? string.Empty,
                    Status = room.Status ?? string.Empty,
                    CleaningStatus = room.CleaningStatus ?? string.Empty,
                    CleaningRequested = room.CleaningRequested
                })
                .ToList(),
        };
    }

    private async Task<ManagerDashboardDto> BuildManagerDashboardAsync(DashboardOverviewDto overview)
    {
        var rooms = await _context.Rooms
            .AsNoTracking()
            .Select(room => new RoomProjection
            {
                Id = room.Id,
                RoomNumber = room.RoomNumber,
                Status = room.Status,
                CleaningStatus = room.CleaningStatus,
                CleaningRequested = room.CleaningRequested,
            })
            .ToListAsync();

        var pendingCleaningRequests = rooms.Count(room => room.CleaningRequested);
        var pendingServiceOrders = await _context.OrderServices.AsNoTracking()
            .CountAsync(order => order.Status == OrderServiceStatus.Pending);
        var totalLossPenalty = await _context.LossAndDamages.AsNoTracking()
            .SumAsync(item => item.PenaltyAmount);
        var pendingArticles = await _context.Articles.AsNoTracking()
            .CountAsync(article => article.PublishedAt == null);

        var pendingCleaningRooms = rooms
            .Where(room => room.CleaningRequested)
            .OrderBy(room => room.RoomNumber)
            .Select(room => new DashboardRoomTaskDto
            {
                Id = room.Id,
                RoomNumber = room.RoomNumber ?? string.Empty,
                Status = room.Status ?? string.Empty,
                CleaningStatus = room.CleaningStatus ?? string.Empty,
                CleaningRequested = room.CleaningRequested,
            })
            .ToList();

        var inspectingRooms = rooms
            .Where(room => string.Equals(room.CleaningStatus, "Inspecting", StringComparison.OrdinalIgnoreCase))
            .OrderBy(room => room.RoomNumber)
            .Select(room => new DashboardRoomTaskDto
            {
                Id = room.Id,
                RoomNumber = room.RoomNumber ?? string.Empty,
                Status = room.Status ?? string.Empty,
                CleaningStatus = room.CleaningStatus ?? string.Empty,
                CleaningRequested = room.CleaningRequested,
            })
            .ToList();

        var netProfit = overview.Summary.TotalRevenue - totalLossPenalty;

        return new ManagerDashboardDto
        {
            PendingCleaningRequests = pendingCleaningRequests,
            PendingServiceOrders = pendingServiceOrders,
            TotalLossPenalty = totalLossPenalty,
            NetProfit = netProfit,
            PendingArticles = pendingArticles,
            InspectingCount = inspectingRooms.Count,
            PendingCleaningRooms = pendingCleaningRooms,
            InspectingRooms = inspectingRooms,
        };
    }

    private static RoomOccupancySummaryDto BuildOccupancySummary(IEnumerable<RoomProjection> rooms)
    {
        var roomList = rooms.ToList();

        var occupied = roomList.Count(room => string.Equals(room.Status, "Occupied", StringComparison.OrdinalIgnoreCase));
        var available = roomList.Count(room => string.Equals(room.Status, "Available", StringComparison.OrdinalIgnoreCase));
        var maintenance = roomList.Count(room =>
            string.Equals(room.Status, "Maintenance", StringComparison.OrdinalIgnoreCase)
            || string.Equals(room.CleaningStatus, "Dirty", StringComparison.OrdinalIgnoreCase)
            || string.Equals(room.CleaningStatus, "Cleaning", StringComparison.OrdinalIgnoreCase));

        return new RoomOccupancySummaryDto
        {
            Total = roomList.Count,
            Occupied = occupied,
            Available = available,
            Maintenance = maintenance,
        };
    }

    private static List<DashboardRevenuePointDto> BuildRevenueChartData(
        DateTime startDate,
        int days,
        IEnumerable<PaymentProjection> successfulPayments)
    {
        if (days == 0) // All time: Group by Month-Year
        {
            var chartData = new List<DashboardRevenuePointDto>();
            if (!successfulPayments.Any(p => p.PaymentDate.HasValue))
            {
                return chartData;
            }
            
            var minDate = successfulPayments.Min(p => p.PaymentDate!.Value);
            var startMonth = new DateTime(minDate.Year, minDate.Month, 1);
            var endMonth = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);
            
            for (var m = startMonth; m <= endMonth; m = m.AddMonths(1))
            {
                var currentMonthPayments = successfulPayments.Where(p => p.PaymentDate.HasValue && p.PaymentDate.Value.Year == m.Year && p.PaymentDate.Value.Month == m.Month).ToList();
                chartData.Add(new DashboardRevenuePointDto
                {
                    Name = m.ToString("MMM yyyy"),
                    Revenue = currentMonthPayments.Sum(p => p.AmountPaid),
                    Bookings = currentMonthPayments.Count(p => string.Equals(p.PaymentForType, "booking", StringComparison.OrdinalIgnoreCase))
                });
            }
            return chartData;
        }

        var paymentDaily = successfulPayments
            .Where(item => item.PaymentDate != null)
            .GroupBy(item => item.PaymentDate!.Value.Date)
            .ToDictionary(group => group.Key, group => group.Sum(item => item.AmountPaid));

        var bookingCountDaily = successfulPayments
            .Where(item => item.PaymentDate != null)
            .Where(item => string.Equals(item.PaymentForType, "booking", StringComparison.OrdinalIgnoreCase))
            .GroupBy(item => item.PaymentDate!.Value.Date)
            .ToDictionary(group => group.Key, group => group.Count());

        var result = new List<DashboardRevenuePointDto>(days);
        for (var i = 0; i < days; i++)
        {
            var date = startDate.AddDays(i).Date;
            paymentDaily.TryGetValue(date, out var paymentRevenue);
            bookingCountDaily.TryGetValue(date, out var bookingCount);

            result.Add(new DashboardRevenuePointDto
            {
                Name = date.ToString("dd/MM"),
                Revenue = paymentRevenue,
                Bookings = bookingCount,
            });
        }

        return result;
    }

    private static bool IsSuccessfulPayment(PaymentProjection payment)
    {
        if (payment.PaymentDate == null)
        {
            return false;
        }

        // Backward compatibility: older rows may not have status but are already valid payments.
        return string.IsNullOrWhiteSpace(payment.Status)
            || string.Equals(payment.Status, "Completed", StringComparison.OrdinalIgnoreCase);
    }

    private AuditLogBucketPayload DeserializePayload(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return new AuditLogBucketPayload();
        }

        try
        {
            return JsonSerializer.Deserialize<AuditLogBucketPayload>(json, _jsonOptions) ?? new AuditLogBucketPayload();
        }
        catch
        {
            return new AuditLogBucketPayload();
        }
    }

    private static bool IsCleaningCompletedEvent(AuditLogEventDto evt)
    {
        if (!evt.EntityType.Equals("Rooms", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(evt.Message)
            && evt.Message.Contains("cleaning completed", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var newDataNode = JsonSerializer.SerializeToNode(evt.Changes.NewData);
        if (newDataNode is JsonObject obj
            && obj.TryGetPropertyValue("CleaningStatus", out var cleaningNode)
            && cleaningNode != null)
        {
            var value = cleaningNode.ToString();
            return value.Equals("Clean", StringComparison.OrdinalIgnoreCase)
                || value.Equals("Completed", StringComparison.OrdinalIgnoreCase);
        }

        return false;
    }
}