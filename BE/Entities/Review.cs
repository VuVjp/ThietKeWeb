namespace HotelManagement.Entities;

public class Review
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public int? RoomTypeId { get; set; }
    public int? BookingId { get; set; }
    public int? Rating { get; set; }
    public string? Comment { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string Status { get; set; } = "Pending"; // Pending, Active, Inactive
    public bool IsActive { get; set; } = false;

    public User? User { get; set; }
    public RoomType? RoomType { get; set; }
    public Booking? Booking { get; set; }
}
