using HotelManagement.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using HotelManagement.Dtos;
using System;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace HotelManagement.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReviewsController : ControllerBase
{
    private readonly IReviewService _service;
    private readonly INotificationService _notificationService;

    public ReviewsController(IReviewService service, INotificationService notificationService)
    {
        _service = service;
        _notificationService = notificationService;
    }

    private async Task NotifyRolesAsync(IEnumerable<RoleName> roles, CreateNotificationDto dto)
    {
        var tasks = roles.Distinct().Select(role => _notificationService.SendByRoleAsync(role, dto));
        await Task.WhenAll(tasks);
    }

    private async Task TryNotifyRolesAsync(IEnumerable<RoleName> roles, CreateNotificationDto dto)
    {
        try
        {
            await NotifyRolesAsync(roles, dto);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Notification Warning] {ex.Message}");
        }
    }

    private static IEnumerable<RoleName> GetRoles()
    {
        return new[] { RoleName.Admin, RoleName.Manager };
    }

    private int? GetCurrentUserId()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(userIdStr, out var userId) ? userId : (int?)null;
    }

    private string? GetCurrentUserEmail()
    {
        return User.FindFirst(ClaimTypes.Email)?.Value;
    }

    [HttpGet]
    public async Task<IActionResult> GetPaged([FromQuery] ReviewQueryDto query)
    {
        return Ok(await _service.GetPagedAsync(query));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var data = await _service.GetByIdAsync(id);
        if (data == null) return NotFound();
        return Ok(data);
    }

    [HttpGet("room-type/{roomTypeId}")]
    public async Task<IActionResult> GetRoomTypeReviews(int roomTypeId)
    {
        var userId = GetCurrentUserId();
        var reviews = await _service.GetRoomTypeReviewsAsync(roomTypeId, userId);
        return Ok(reviews);
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReviewDto dto)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var ok = await _service.CreateAsync(userId.Value, dto);
        if (!ok) return BadRequest("Unable to create review. Ensure you have checked out of this room and haven't reviewed it yet.");

        return Ok(new { message = "Review submitted for moderation." });
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateReviewDto dto)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var ok = await _service.UpdateAsync(id, userId.Value, dto);
        if (!ok) return BadRequest("Unable to update review. Reviews can only be edited within 12 hours of submission.");

        return Ok(new { message = "Review updated successfully." });
    }

    [Permission(PermissionNames.ManageReviews)]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _service.DeleteAsync(id);
        if (!ok) return NotFound();

        await TryNotifyRolesAsync(
            GetRoles(),
            new CreateNotificationDto
            {
                Title = "Review deleted",
                Content = $"Review #{id} was deleted.",
                Type = NotificationAction.ReviewDeleted,
                ReferenceLink = "admin/reviews"
            });

        return NoContent();
    }

    [Permission(PermissionNames.ManageReviews)]
    [HttpPatch("{id}/toggle-active")]
    public async Task<IActionResult> ToggleActive(int id)
    {
        var ok = await _service.ToggleActiveAsync(id);
        if (!ok) return NotFound();

        var review = await _service.GetByIdAsync(id);
        var isActive = review?.IsActive ?? true;

        await TryNotifyRolesAsync(
            GetRoles(),
            new CreateNotificationDto
            {
                Title = isActive ? "Review activated" : "Review deactivated",
                Content = $"Review #{id} is now {(isActive ? "active" : "inactive")}.",
                Type = isActive ? NotificationAction.ReviewActivated : NotificationAction.ReviewDeactivated,
                ReferenceLink = $"admin/reviews/{id}"
            });

        return Ok(new { message = "Review active status toggled successfully." });
    }

    [Permission(PermissionNames.ManageReviews)]
    [HttpPatch("{id}/approve")]
    public async Task<IActionResult> Approve(int id)
    {
        var ok = await _service.ApproveAsync(id);
        if (!ok) return BadRequest("Review cannot be approved. It might not exist or is not in Pending status.");

        await TryNotifyRolesAsync(
            GetRoles(),
            new CreateNotificationDto
            {
                Title = "Review approved",
                Content = $"Review #{id} was approved and is now active.",
                Type = NotificationAction.ReviewActivated,
                ReferenceLink = $"admin/reviews/{id}"
            });

        return Ok(new { message = "Review approved successfully." });
    }

    [Permission(PermissionNames.ManageReviews)]
    [HttpPatch("{id}/reject")]
    public async Task<IActionResult> Reject(int id)
    {
        var ok = await _service.RejectAsync(id);
        if (!ok) return BadRequest("Review cannot be rejected. It might not exist or is not in Pending status.");

        await TryNotifyRolesAsync(
            GetRoles(),
            new CreateNotificationDto
            {
                Title = "Review rejected",
                Content = $"Review #{id} was rejected and is now inactive.",
                Type = NotificationAction.ReviewDeactivated,
                ReferenceLink = $"admin/reviews/{id}"
            });

        return Ok(new { message = "Review rejected successfully." });
    }
}
