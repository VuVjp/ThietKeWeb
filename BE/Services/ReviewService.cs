using HotelManagement.Dtos;
using HotelManagement.Entities;
using HotelManagement.Repositories.Interfaces;
using HotelManagement.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

public class ReviewService : IReviewService
{
    private readonly IReviewRepository _repository;
    private readonly IBookingRepository _bookingRepository;

    public ReviewService(IReviewRepository repository, IBookingRepository bookingRepository)
    {
        _repository = repository;
        _bookingRepository = bookingRepository;
    }

    public async Task<IEnumerable<ReviewDto>> GetAllAsync()
    {
        var reviews = await _repository.GetAllWithDetailsAsync();
        return reviews.Select(r => new ReviewDto
        {
            Id = r.Id,
            UserId = r.UserId,
            UserName = r.User?.FullName,
            UserAvatarUrl = r.User?.AvatarUrl,
            RoomTypeId = r.RoomTypeId,
            RoomTypeName = r.RoomType?.Name,
            Rating = r.Rating,
            Comment = r.Comment,
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt,
            Status = r.Status,
            IsActive = r.IsActive
        });
    }

    public async Task<PaginatedResultDto<ReviewDto>> GetPagedAsync(ReviewQueryDto query)
    {
        var queryable = _repository.GetQueryable()
            .Include(r => r.User)
            .Include(r => r.RoomType)
            .AsNoTracking();

        // Search by ID or UserName
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var searchTerm = query.Search.Trim().ToLower();
            if (int.TryParse(searchTerm, out var id))
            {
                queryable = queryable.Where(r => r.Id == id || (r.User != null && r.User.FullName.ToLower().Contains(searchTerm)));
            }
            else
            {
                queryable = queryable.Where(r => r.User != null && r.User.FullName.ToLower().Contains(searchTerm));
            }
        }

        if (query.RoomTypeId.HasValue)
        {
            queryable = queryable.Where(r => r.RoomTypeId == query.RoomTypeId.Value);
        }

        if (query.Rating.HasValue)
        {
            queryable = queryable.Where(r => r.Rating == query.Rating.Value);
        }



        if (query.StartDate.HasValue)
        {
            queryable = queryable.Where(r => r.CreatedAt.HasValue && r.CreatedAt.Value >= query.StartDate.Value);
        }

        if (query.EndDate.HasValue)
        {
            queryable = queryable.Where(r => r.CreatedAt.HasValue && r.CreatedAt.Value <= query.EndDate.Value);
        }

        if (query.IsActive.HasValue)
        {
            queryable = queryable.Where(r => r.IsActive == query.IsActive.Value);
        }

        // Sorting
        queryable = query.SortOrder?.ToLower() == "asc"
            ? queryable.OrderBy(r => r.Id)
            : queryable.OrderByDescending(r => r.Id);

        var total = await queryable.CountAsync();
        var items = await queryable
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(r => new ReviewDto
            {
                Id = r.Id,
                UserId = r.UserId,
                UserName = r.User != null ? r.User.FullName : "Anonymous",
                UserAvatarUrl = r.User != null ? r.User.AvatarUrl : null,
                RoomTypeId = r.RoomTypeId,
                RoomTypeName = r.RoomType != null ? r.RoomType.Name : "N/A",
                Rating = r.Rating,
                Comment = r.Comment,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt,
                Status = r.Status,
                IsActive = r.IsActive
            })
            .ToListAsync();

        return new PaginatedResultDto<ReviewDto>
        {
            Items = items,
            Total = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<ReviewDto?> GetByIdAsync(int id)
    {
        var review = await _repository.GetByIdWithDetailsAsync(id);
        if (review == null) return null;

        return new ReviewDto
        {
            Id = review.Id,
            UserId = review.UserId,
            UserName = review.User?.FullName,
            UserAvatarUrl = review.User?.AvatarUrl,
            RoomTypeId = review.RoomTypeId,
            RoomTypeName = review.RoomType?.Name,
            Rating = review.Rating,
            Comment = review.Comment,
            CreatedAt = review.CreatedAt,
            UpdatedAt = review.UpdatedAt,
            Status = review.Status,
            IsActive = review.IsActive
        };
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var review = await _repository.GetByIdAsync(id);
        if (review == null) return false;

        _repository.Delete(review);
        await _repository.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ToggleActiveAsync(int id)
    {
        var review = await _repository.GetByIdAsync(id);
        if (review == null) return false;

        if (review.IsActive)
        {
            // If currently active, we can always deactivate (mark as inactive/rejected)
            review.IsActive = false;
            review.Status = "Inactive";
        }
        else
        {
            // If currently inactive or pending
            if (review.Status == "Pending")
            {
                var hoursSinceCreation = (DateTime.Now - (review.CreatedAt ?? DateTime.Now)).TotalHours;
                if (hoursSinceCreation < 12)
                {
                    // Within 12 hours, admin can only mark as Inactive (reject)
                    // Since it's already IsActive = false, let's allow setting status to Inactive
                    review.Status = "Inactive";
                }
                else
                {
                    // After 12 hours, allow activation
                    review.IsActive = true;
                    review.Status = "Active";
                }
            }
            else if (review.Status == "Inactive")
            {
                // If explicitly inactive, allow reactivation
                review.IsActive = true;
                review.Status = "Active";
            }
        }

        _repository.Update(review);
        await _repository.SaveChangesAsync();
        return true;
    }

    public async Task<bool> CreateAsync(int userId, CreateReviewDto dto)
    {
        // 1. Verify booking exists, belongs to user, and is checked out
        var booking = await _bookingRepository.GetBookingByIdWithDetailsAsync(dto.BookingId);
        if (booking == null || booking.UserId != userId || booking.Status != "CheckedOut")
        {
            return false;
        }

        // 2. Verify no existing review for this booking
        var existingReview = await _repository.GetByBookingIdAsync(dto.BookingId);
        if (existingReview != null)
        {
            return false;
        }

        var review = new Review
        {
            UserId = userId,
            RoomTypeId = dto.RoomTypeId,
            BookingId = dto.BookingId,
            Rating = dto.Rating,
            Comment = dto.Comment,
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now,
            Status = "Pending",
            IsActive = false
        };

        await _repository.AddAsync(review);
        await _repository.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateAsync(int id, int userId, UpdateReviewDto dto)
    {
        var review = await _repository.GetByIdAsync(id);
        if (review == null || review.UserId != userId) return false;

        // Verify within 12 hours and still pending
        if (review.Status != "Pending") return false;

        var hoursSinceCreation = (DateTime.Now - (review.CreatedAt ?? DateTime.Now)).TotalHours;
        if (hoursSinceCreation > 12) return false;

        review.Rating = dto.Rating;
        review.Comment = dto.Comment;
        review.UpdatedAt = DateTime.Now;

        _repository.Update(review);
        await _repository.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<ReviewDto>> GetRoomTypeReviewsAsync(int roomTypeId, int? userId = null)
    {
        var reviews = await _repository.GetQueryable()
            .Include(r => r.User)
            .Where(r => r.RoomTypeId == roomTypeId)
            .Where(r => r.IsActive || (userId.HasValue && r.UserId == userId && r.Status == "Pending"))
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return reviews.Select(r => new ReviewDto
        {
            Id = r.Id,
            UserId = r.UserId,
            UserName = r.User != null ? r.User.FullName : "Anonymous",
            UserAvatarUrl = r.User?.AvatarUrl,
            RoomTypeId = r.RoomTypeId,
            BookingId = r.BookingId,
            Rating = r.Rating,
            Comment = r.Comment,
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt,
            Status = r.Status,
            IsActive = r.IsActive,
            CanEdit = r.UserId == userId && r.Status == "Pending" && (DateTime.Now - (r.CreatedAt ?? DateTime.Now)).TotalHours <= 12
        });
    }
}
