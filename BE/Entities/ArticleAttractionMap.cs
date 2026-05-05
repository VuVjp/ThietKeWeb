namespace HotelManagement.Entities;

/// <summary>
/// Junction entity for the many-to-many relationship between Article and Attraction.
/// </summary>
public class ArticleAttractionMap
{
    public int ArticleId { get; set; }
    public int AttractionId { get; set; }

    public Article Article { get; set; } = null!;
    public Attraction Attraction { get; set; } = null!;
}
