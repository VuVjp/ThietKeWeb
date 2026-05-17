using HotelManagement.Dtos;

namespace HotelManagement.Services.Interfaces;

public interface IReviewService
{
    Task<IEnumerable<ReviewDto>> GetAllAsync();
    Task<PaginatedResultDto<ReviewDto>> GetPagedAsync(ReviewQueryDto query);
    Task<ReviewDto?> GetByIdAsync(int id);
    Task<bool> DeleteAsync(int id);
    Task<bool> ToggleActiveAsync(int id);
    Task<bool> ApproveAsync(int id);
    Task<bool> RejectAsync(int id);
    Task<bool> CreateAsync(int userId, CreateReviewDto dto);
    Task<bool> UpdateAsync(int id, int userId, UpdateReviewDto dto);
    Task<IEnumerable<ReviewDto>> GetRoomTypeReviewsAsync(int roomTypeId, int? userId = null);
}
