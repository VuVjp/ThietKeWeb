using System.ComponentModel.DataAnnotations;

namespace HotelManagement.Entities.Snapshots;

public class DashboardSnapshot
{
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// Type of snapshot: 1 for Daily, 7 for Weekly, 30 for Monthly
    /// </summary>
    public int SnapshotType { get; set; }

    /// <summary>
    /// Structured dashboard data stored as JSON in the database
    /// </summary>
    public HotelManagement.Dtos.DashboardOverviewDto Data { get; set; } = new();

    public DateTime SnapshotDate { get; set; } = DateTime.Now;

    public DateTime LastUpdated { get; set; } = DateTime.Now;
}
