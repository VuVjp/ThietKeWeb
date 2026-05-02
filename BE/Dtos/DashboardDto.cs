namespace HotelManagement.Dtos;

public class DashboardOverviewDto
{
    public decimal TotalRevenue { get; set; }
    public int BookingCount { get; set; }
    public int OccupancyRate { get; set; }
    public int AuditLogTotal { get; set; } = 0;
    public RoomOccupancySummaryDto Occupancy { get; set; } = new();
    public List<DashboardRevenuePointDto> RevenueChartData { get; set; } = new();
    public List<DashboardRoomStatusPointDto> StatusChartData { get; set; } = new();
    public List<DashboardRecentBookingDto> RecentBookings { get; set; } = new();
    public List<DashboardCriticalAlertDto> CriticalAlerts { get; set; } = new();
    public List<DashboardPendingServiceDto> PendingServices { get; set; } = new();
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
}

public class ManagerDashboardDto
{
    public DashboardOverviewDto Overview { get; set; } = new();
    public int PendingCleaningRequests { get; set; }
    public int PendingServiceOrders { get; set; }
    public decimal TotalLossPenalty { get; set; }
    public int PendingArticles { get; set; }
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