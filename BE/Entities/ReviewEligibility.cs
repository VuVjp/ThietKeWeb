using System;

namespace HotelManagement.Entities;

public class ReviewEligibility
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int RoomTypeId { get; set; }
    public int BookingId { get; set; }
    public bool IsReviewed { get; set; }
    public DateTime ExpiresAt { get; set; }

    // Navigation properties
    public User? User { get; set; }
    public RoomType? RoomType { get; set; }
    public Booking? Booking { get; set; }
}
