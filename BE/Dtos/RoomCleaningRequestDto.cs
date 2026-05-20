namespace HotelManagement.Dtos;

public class RoomCleaningRequestDto
{
    public bool Requested { get; set; }
    public byte[]? RowVersion { get; set; }
}
