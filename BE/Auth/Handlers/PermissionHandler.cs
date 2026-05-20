using System.Security.Claims;
using HotelManagement.Data;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

public class PermissionHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly AppDbContext _context;
    private readonly IDistributedCache _cache;

    private sealed class PermissionCacheEntry
    {
        public bool IsActive { get; set; }
        public List<string> Permissions { get; set; } = new();
    }

    public PermissionHandler(AppDbContext context, IDistributedCache cache)
    {
        _context = context;
        _cache = cache;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        if (!context.User.Identity?.IsAuthenticated ?? false)
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }
        var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier);

        if (userIdClaim == null)
            throw new UnauthorizedAccessException("User ID claim not found.");

        var userId = int.Parse(userIdClaim.Value);

        var cacheKey = PermissionCacheKeys.ForUser(userId);
        PermissionCacheEntry? cached = null;
        var cachedJson = await _cache.GetStringAsync(cacheKey);
        if (!string.IsNullOrWhiteSpace(cachedJson))
        {
            try
            {
                cached = JsonSerializer.Deserialize<PermissionCacheEntry>(cachedJson);
            }
            catch
            {
                cached = null;
            }
        }

        if (cached != null)
        {
            if (!cached.IsActive)
            {
                throw new UnauthorizedAccessException("User account is inactive.");
            }

            if (context.User.FindFirst(ClaimTypes.Role)?.Value == "Admin")
            {
                context.Succeed(requirement);
                return;
            }

            var hasCachedPermission = cached.Permissions
                .Any(permission => string.Equals(permission?.Trim(), requirement.Permission.Trim(), StringComparison.OrdinalIgnoreCase));

            if (hasCachedPermission)
            {
                context.Succeed(requirement);
                return;
            }

            throw new ForbiddenException("User does not have the required permission.");
        }

        var user = await _context.Users
            .AsNoTracking()
            .Include(u => u.Role)
                .ThenInclude(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            throw new UnauthorizedAccessException("User not found.");
        }

        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("User account is inactive.");
        }

        // if (context.User.FindFirst(ClaimTypes.Role)?.Value == "Admin")
        // {
        //     context.Succeed(requirement);
        //     return;
        // }

        var rawPermissionNames = user.Role?.RolePermissions
            .Select(rp => rp.Permission.Name)
            .ToList() ?? new List<string>();

        var normalizedUserPermissions = rawPermissionNames
            .Where(permission => !string.IsNullOrWhiteSpace(permission))
            .Select(permission => permission.Trim())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var cacheEntry = new PermissionCacheEntry
        {
            IsActive = user.IsActive,
            Permissions = normalizedUserPermissions.ToList()
        };

        var cacheOptions = new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
        };

        await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(cacheEntry), cacheOptions);

        var hasPermission = normalizedUserPermissions.Contains(requirement.Permission.Trim());

        if (hasPermission)
        {
            context.Succeed(requirement);
        }
        else
        {
            throw new ForbiddenException("User does not have the required permission.");
        }
    }
}