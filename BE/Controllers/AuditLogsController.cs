using HotelManagement.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HotelManagement.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuditLogsController : ControllerBase
{
    private readonly IAuditLogService _auditLogService;

    public AuditLogsController(IAuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    [Permission(PermissionNames.ViewFullAuditLogs)]
    [Authorize]
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] AuditLogQueryDto query, CancellationToken cancellationToken)
    {
        var logs = await _auditLogService.GetAllAsync(query, null, cancellationToken);
        return Ok(logs);
    }

    [Permission(PermissionNames.ViewFullAuditLogs)]
    [Authorize]
    [HttpGet("paged")]
    public async Task<IActionResult> GetPaged([FromQuery] AuditLogQueryDto query, CancellationToken cancellationToken)
    {
        var logs = await _auditLogService.GetPagedAsync(query, null, cancellationToken);
        return Ok(logs);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMine([FromQuery] AuditLogQueryDto query, CancellationToken cancellationToken)
    {
        var userId = ResolveUserId();
        if (!userId.HasValue)
        {
            return Unauthorized();
        }

        var logs = await _auditLogService.GetAllAsync(query, userId, cancellationToken);
        return Ok(logs);
    }

    [Authorize]
    [HttpGet("me/paged")]
    public async Task<IActionResult> GetMinePaged([FromQuery] AuditLogQueryDto query, CancellationToken cancellationToken)
    {
        var userId = ResolveUserId();
        if (!userId.HasValue)
        {
            return Unauthorized();
        }

        var logs = await _auditLogService.GetPagedAsync(query, userId, cancellationToken);
        return Ok(logs);
    }

    private int? ResolveUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claim, out var userId) ? userId : null;
    }
}
