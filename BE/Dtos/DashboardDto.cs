using System.Text.Json.Serialization;

namespace HotelManagement.Dtos;

public class DashboardOverviewDto
{
    public DashboardMetaDto Meta { get; set; } = new();
    public DashboardSummaryDto Summary { get; set; } = new();
    public DashboardWidgetsDto Widgets { get; set; } = new();
    public DashboardBreakdownDto Breakdown { get; set; } = new();
    public List<DashboardCriticalAlertDto> Alerts { get; set; } = new();
    public List<DashboardEventDto> Events { get; set; } = new();
}

public class DashboardMetaDto
{
    public int SchemaVersion { get; set; } = 1;
    public string DashboardCode { get; set; } = "HOTEL_OVERVIEW";
    public string RoleName { get; set; } = "Admin";
    public string PeriodType { get; set; } = string.Empty; // DAILY, WEEKLY, MONTHLY, YEARLY
    public string PeriodKey { get; set; } = string.Empty;
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public string Status { get; set; } = "OPEN";
    public DateTime GeneratedAt { get; set; } = DateTime.Now;
}

public class DashboardSummaryDto
{
    public decimal TotalRevenue { get; set; }
    public int BookingCount { get; set; }
    public decimal NetProfit { get; set; }
    public int AuditLogTotal { get; set; }
    public int ArticlesCount { get; set; }
    public int ServiceOrdersCount { get; set; }
    public DashboardComparisonDto Comparison { get; set; } = new();
}

public class DashboardWidgetsDto
{
    public List<DashboardRevenuePointDto> RevenueChart { get; set; } = new();
    public List<DashboardRoomStatusPointDto> RoomStatusChart { get; set; } = new();
    public List<DashboardRecentBookingDto> RecentBookings { get; set; } = new();
    public List<DashboardPendingServiceDto> PendingServices { get; set; } = new();
}

public class DashboardBreakdownDto
{
    public RoomOccupancySummaryDto Occupancy { get; set; } = new();
    public int InspectingCount { get; set; }
    public List<DashboardRoomTaskDto> PendingCleaningRooms { get; set; } = new();
}

public class DashboardComparisonDto
{
    public DashboardComparisonBaseDto Base { get; set; } = new();
    public DashboardMetricsComparisonContainer Metrics { get; set; } = new();
}

public class DashboardComparisonBaseDto
{
    public string ComparisonType { get; set; } = "PREVIOUS_PERIOD";
    public string CurrentPeriodKey { get; set; } = string.Empty;
    public string PreviousPeriodKey { get; set; } = string.Empty;
}

public class DashboardMetricsComparisonContainer
{
    public DashboardMetricComparisonDto? Revenue { get; set; }
    public DashboardMetricComparisonDto? Bookings { get; set; }
    public DashboardMetricComparisonDto? NetProfit { get; set; }
    public DashboardMetricComparisonDto? DamageReports { get; set; }
    public DashboardMetricComparisonDto? LowStockItems { get; set; }
    public DashboardMetricComparisonDto? CleaningRequests { get; set; }
    public DashboardMetricComparisonDto? Articles { get; set; }
    public DashboardMetricComparisonDto? ServiceOrders { get; set; }
}

public class DashboardMetricComparisonDto
{
    public decimal Current { get; set; }
    public decimal Previous { get; set; }
    public decimal Difference { get; set; }
    public decimal GrowthRate { get; set; }
    public string Trend { get; set; } = string.Empty; // "up" | "down" | "flat"
    public string DirectionMeaning { get; set; } = string.Empty; // "positive" | "negative" | "neutral"
}

public class DashboardEventDto
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string Severity { get; set; } = "Info"; // Info, Warning, Success, Error
}

public class RoomOccupancySummaryDto
{
    public int Total { get; set; }
    public int Occupied { get; set; }
    public int Maintenance { get; set; }
    public int Available { get; set; }
}

public class DashboardRevenuePointDto
{
    public string Name { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public int Bookings { get; set; }
}

public class DashboardRoomStatusPointDto
{
    public string Name { get; set; } = string.Empty;
    public int Value { get; set; }
    public string Color { get; set; } = string.Empty;
}

public class DashboardRecentBookingDto
{
    public int Id { get; set; }
    public string GuestName { get; set; } = string.Empty;
    public DateTime CheckInDate { get; set; }
    public DateTime CheckOutDate { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class DashboardCriticalAlertDto
{
    public int Id { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string Room { get; set; } = string.Empty;
    public decimal Penalty { get; set; }
    public string Description { get; set; } = string.Empty;
}

public class DashboardPendingServiceDto
{
    public int Id { get; set; }
    public string RoomNumber { get; set; } = string.Empty;
    public string GuestName { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
}

public class DashboardRoomTaskDto
{
    public int Id { get; set; }
    public string RoomNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string CleaningStatus { get; set; } = string.Empty;
    public bool CleaningRequested { get; set; }
}

public class HousekeeperDashboardDto
{
    public int CleanedToday { get; set; }
    public int CleanedInRange { get; set; }
    public int CleaningRequests { get; set; }
    public int InspectionRequests { get; set; }
    public int InspectingCount { get; set; }
    public List<DashboardRoomTaskDto> PendingCleaningRooms { get; set; } = new();
    public List<DashboardRoomTaskDto> InspectingRooms { get; set; } = new();
}

public class DashboardTopInvoiceDto
{
    public int Id { get; set; }
    public string InvoiceCode { get; set; } = string.Empty;
    public decimal FinalTotal { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class AccountantDashboardDto
{
    public decimal TotalRevenue { get; set; }
    public decimal TotalLossPenalty { get; set; }
    public decimal NetProfit { get; set; }
    public List<DashboardRevenuePointDto> RevenueChartData { get; set; } = new();
    public List<DashboardTopInvoiceDto> TopInvoices { get; set; } = new();
}

public class ReceptionistDashboardDto
{
    public int PublishedArticles { get; set; }
    public int PendingArticles { get; set; }
    public int PendingServiceOrders { get; set; }
    public int CompletedServiceOrdersToday { get; set; }
    public List<DashboardPendingServiceDto> ServiceQueue { get; set; } = new();
}

public class ManagerDashboardDto
{
    public int PendingCleaningRequests { get; set; }
    public int PendingServiceOrders { get; set; }
    public decimal TotalLossPenalty { get; set; }
    public decimal NetProfit { get; set; }
    public int PendingArticles { get; set; }
    public int InspectingCount { get; set; }
    public List<DashboardRoomTaskDto> PendingCleaningRooms { get; set; } = new();
    public List<DashboardRoomTaskDto> InspectingRooms { get; set; } = new();
}

public class RoleDashboardDto
{
    public string Role { get; set; } = string.Empty;
    public DashboardOverviewDto? Overview { get; set; }
    public HousekeeperDashboardDto? Housekeeper { get; set; }
    public AccountantDashboardDto? Accountant { get; set; }
    public ReceptionistDashboardDto? Receptionist { get; set; }
    public ManagerDashboardDto? Manager { get; set; }
}