using System;

namespace HotelManagement.Dtos;

public class ReviewEligibilityDto
{
    public int Id { get; set; }
    public int RoomTypeId { get; set; }
    public string RoomTypeName { get; set; } = string.Empty;
    public int BookingId { get; set; }
    public string BookingCode { get; set; } = string.Empty;
    public bool IsReviewed { get; set; }
    public DateTime ExpiresAt { get; set; }
}
