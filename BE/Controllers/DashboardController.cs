using HotelManagement.Services.Interfaces;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace HotelManagement.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("overview")]
    [Permission(PermissionNames.ViewDashboard)]
    public async Task<IActionResult> GetOverview([FromQuery] int days = 7)
    {
        var data = await _dashboardService.GetOverviewAsync(days);
        return Ok(data);
    }

    [HttpGet("role")]
    [Permission(PermissionNames.ViewDashboard)]
    public async Task<IActionResult> GetRoleDashboard([FromQuery] int days = 7)
    {
        var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userId = int.TryParse(userIdClaim, out var parsed) ? parsed : (int?)null;

        if (!Enum.TryParse<RoleName>(roleClaim, ignoreCase: true, out var role))
        {
            role = RoleName.Admin;
        }

        var data = await _dashboardService.GetRoleDashboardAsync(role, userId, days);
        return Ok(data);
    }
}