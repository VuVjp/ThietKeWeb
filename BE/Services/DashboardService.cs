using HotelManagement.Data;
using HotelManagement.Dtos;
using HotelManagement.Enums;
using HotelManagement.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.Json.Nodes;

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

    public async Task<DashboardOverviewDto> GetOverviewAsync(int days = 7)
    {
        var normalizedDays = Math.Clamp(days, 1, 31);
        var endDate = DateTime.Today;
        var startDate = endDate.AddDays(-(normalizedDays - 1));

        var bookings = await _context.Bookings
            .AsNoTracking()
            .Select(booking => new BookingProjection
            {
                Id = booking.Id,
                GuestName = booking.GuestName,
                Status = booking.Status,
                FinalPrice = booking.FinalPrice,
                CheckInDate = booking.BookingDetails
                    .OrderBy(detail => detail.CheckInDate)
                    .Select(detail => (DateTime?)detail.CheckInDate)
                    .FirstOrDefault(),
                CheckOutDate = booking.BookingDetails
                    .OrderByDescending(detail => detail.CheckOutDate)
                    .Select(detail => (DateTime?)detail.CheckOutDate)
                    .FirstOrDefault(),
            })
            .ToListAsync();

        var orders = await _context.OrderServices
            .AsNoTracking()
            .Select(order => new OrderProjection
            {
                Id = order.Id,
                Status = order.Status,
                OrderDate = order.OrderDate,
                TotalAmount = order.TotalAmount,
                RoomNumber = order.BookingDetail != null && order.BookingDetail.Room != null
                    ? order.BookingDetail.Room.RoomNumber
                    : null,
                GuestName = order.BookingDetail != null && order.BookingDetail.Booking != null
                    ? order.BookingDetail.Booking.GuestName
                    : null,
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

        var auditLogCount = await _context.AuditLogs.CountAsync();

        var payments = await _context.Payments
            .AsNoTracking()
            .Select(payment => new PaymentProjection
            {
                AmountPaid = payment.AmountPaid,
                PaymentDate = payment.PaymentDate,
                Status = payment.Status,
                PaymentForType = payment.PaymentForType,
            })
            .ToListAsync();

        var criticalAlerts = await _context.LossAndDamages
            .AsNoTracking()
            .OrderByDescending(item => item.CreatedAt)
            .Take(3)
            .Select(item => new DashboardCriticalAlertDto
            {
                Id = item.Id,
                ItemName = item.RoomInventory != null && !string.IsNullOrWhiteSpace(item.RoomInventory.ItemName)
                    ? item.RoomInventory.ItemName!
                    : "Unknown",
                Room = item.RoomInventory != null && item.RoomInventory.Room != null && !string.IsNullOrWhiteSpace(item.RoomInventory.Room.RoomNumber)
                    ? item.RoomInventory.Room.RoomNumber
                    : "Unknown",
                Penalty = item.PenaltyAmount,
                Description = string.IsNullOrWhiteSpace(item.Description) ? "No description" : item.Description,
            })
            .ToListAsync();

        var confirmedBookings = bookings
            .Where(item => !string.IsNullOrWhiteSpace(item.Status) && RevenueBookingStatuses.Contains(item.Status!))
            .ToList();

        var successfulPayments = payments
            .Where(IsSuccessfulPayment)
            .ToList();

        var totalRevenue = successfulPayments.Sum(item => item.AmountPaid);

        var occupancy = BuildOccupancySummary(rooms);

        var revenueChartData = BuildRevenueChartData(startDate, normalizedDays, successfulPayments);

        var statusChartData = new List<DashboardRoomStatusPointDto>
        {
            new() { Name = "Available", Value = occupancy.Available, Color = "#0ea5e9" },
            new() { Name = "Occupied", Value = occupancy.Occupied, Color = "#6366f1" },
            new() { Name = "Maintenance", Value = occupancy.Maintenance, Color = "#f59e0b" },
        };

        var recentBookings = confirmedBookings
            .OrderByDescending(item => item.Id)
            .Take(5)
            .Select(item => new DashboardRecentBookingDto
            {
                Id = item.Id,
                GuestName = string.IsNullOrWhiteSpace(item.GuestName) ? "Unknown" : item.GuestName,
                CheckInDate = item.CheckInDate ?? DateTime.Today,
                CheckOutDate = item.CheckOutDate ?? DateTime.Today,
                TotalAmount = item.FinalPrice,
                Status = string.IsNullOrWhiteSpace(item.Status) ? "Pending" : item.Status,
            })
            .ToList();

        var pendingServices = orders
            .Where(item => item.Status == OrderServiceStatus.Pending)
            .OrderByDescending(item => item.OrderDate)
            .Take(3)
            .Select(item => new DashboardPendingServiceDto
            {
                Id = item.Id,
                RoomNumber = string.IsNullOrWhiteSpace(item.RoomNumber) ? "N/A" : item.RoomNumber,
                GuestName = string.IsNullOrWhiteSpace(item.GuestName) ? "Unknown" : item.GuestName,
                OrderDate = item.OrderDate,
            })
            .ToList();

        var totalLossPenalty = await _context.LossAndDamages
            .AsNoTracking()
            .SumAsync(item => item.PenaltyAmount);

        var netProfit = totalRevenue - totalLossPenalty;
        var inspectingCount = rooms.Count(room => string.Equals(room.CleaningStatus, "Inspecting", StringComparison.OrdinalIgnoreCase));

        return new DashboardOverviewDto
        {
            TotalRevenue = totalRevenue,
            BookingCount = confirmedBookings.Count,
            OccupancyRate = occupancy.Total == 0 ? 0 : (int)Math.Round((double)occupancy.Occupied / occupancy.Total * 100),
            AuditLogTotal = auditLogCount,
            NetProfit = netProfit,
            InspectingCount = inspectingCount,
            Occupancy = occupancy,
            RevenueChartData = revenueChartData,
            StatusChartData = statusChartData,
            RecentBookings = recentBookings,
            CriticalAlerts = criticalAlerts,
            PendingServices = pendingServices,
        };
    }

    public async Task<RoleDashboardDto> GetRoleDashboardAsync(RoleName role, int? userId, int days = 7)
    {
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
                Manager = await BuildManagerDashboardAsync(days),
                Overview = await GetOverviewAsync(days),
            },
            _ => new RoleDashboardDto
            {
                Role = role.ToString(),
                Overview = await GetOverviewAsync(days),
            },
        };
    }

    private async Task<HousekeeperDashboardDto> BuildHousekeeperDashboardAsync(int? userId, int days)
    {
        var normalizedDays = Math.Clamp(days, 1, 31);
        var endDate = DateTime.Today;
        var startDate = endDate.AddDays(-(normalizedDays - 1));

        var cleaningRequests = await _context.Rooms.AsNoTracking().CountAsync(room => room.CleaningRequested);
        var inspectionRequests = await _context.Rooms.AsNoTracking()
            .CountAsync(room => room.CleaningStatus != null
                && room.CleaningStatus.ToLower() == "inspecting");

        if (!userId.HasValue)
        {
            return new HousekeeperDashboardDto
            {
                CleanedToday = 0,
                CleanedInRange = 0,
                CleaningRequests = cleaningRequests,
                InspectionRequests = inspectionRequests,
                InspectingCount = inspectionRequests,
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
        };
    }

    private async Task<AccountantDashboardDto> BuildAccountantDashboardAsync(int days)
    {
        var normalizedDays = Math.Clamp(days, 1, 31);
        var endDate = DateTime.Today;
        var startDate = endDate.AddDays(-(normalizedDays - 1));

        var payments = await _context.Payments
            .AsNoTracking()
            .Select(payment => new PaymentProjection
            {
                AmountPaid = payment.AmountPaid,
                PaymentDate = payment.PaymentDate,
                Status = payment.Status,
                PaymentForType = payment.PaymentForType,
            })
            .ToListAsync();

        var successfulPayments = payments.Where(IsSuccessfulPayment).ToList();
        var totalRevenue = successfulPayments.Sum(item => item.AmountPaid);

        var totalLossPenalty = await _context.LossAndDamages
            .AsNoTracking()
            .SumAsync(item => item.PenaltyAmount);

        var revenueChartData = BuildRevenueChartData(startDate, normalizedDays, successfulPayments);

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
            TotalRevenue = totalRevenue,
            TotalLossPenalty = totalLossPenalty,
            NetProfit = totalRevenue - totalLossPenalty,
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

        return new ReceptionistDashboardDto
        {
            PublishedArticles = publishedArticles,
            PendingArticles = pendingArticles,
            PendingServiceOrders = pendingServiceOrders,
            CompletedServiceOrdersToday = completedServiceOrdersToday,
            ServiceQueue = serviceQueue,
        };
    }

    private async Task<ManagerDashboardDto> BuildManagerDashboardAsync(int days)
    {
        var overview = await GetOverviewAsync(days);
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

        var netProfit = overview.TotalRevenue - totalLossPenalty;

        return new ManagerDashboardDto
        {
            Overview = overview,
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