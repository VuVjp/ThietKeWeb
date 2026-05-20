using HotelManagement.Dtos;
using HotelManagement.Entities;
using HotelManagement.Repositories.Interfaces;
using HotelManagement.Services.Interfaces;
using Microsoft.Extensions.Caching.Distributed;
using System;
using System.Text.Json;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace HotelManagement.Services.Implementations;

public class MembershipService : IMembershipService
{
    private readonly IMembershipRepository _repository;
    private readonly IDistributedCache _cache;
    private static readonly DistributedCacheEntryOptions CacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
    };

    public MembershipService(IMembershipRepository repository, IDistributedCache cache)
    {
        _repository = repository;
        _cache = cache;
    }

    public async Task<IEnumerable<MembershipDto>> GetAllAsync()
    {
        var cacheVersion = await GetCacheVersionAsync(CacheVersionKeys.Memberships);
        var cacheKey = $"memberships:v{cacheVersion}:all";
        var cached = await _cache.GetStringAsync(cacheKey);
        if (!string.IsNullOrWhiteSpace(cached))
        {
            var cachedResult = JsonSerializer.Deserialize<List<MembershipDto>>(cached);
            if (cachedResult != null)
            {
                return cachedResult;
            }
        }

        var memberships = await _repository.GetAllAsync();
        var result = memberships.Select(m => new MembershipDto
        {
            Id = m.Id,
            TierName = m.TierName,
            MinPoints = m.MinPoints,
            DiscountPercent = m.DiscountPercent,
            IsActive = m.IsActive
        }).ToList();
        await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(result), CacheOptions);
        return result;
    }

    public async Task<MembershipDto?> GetByIdAsync(int id)
    {
        var cacheVersion = await GetCacheVersionAsync(CacheVersionKeys.Memberships);
        var cacheKey = $"memberships:v{cacheVersion}:id:{id}";
        var cached = await _cache.GetStringAsync(cacheKey);
        if (!string.IsNullOrWhiteSpace(cached))
        {
            return JsonSerializer.Deserialize<MembershipDto>(cached);
        }

        var m = await _repository.GetByIdAsync(id);
        if (m == null) return null;

        var result = new MembershipDto
        {
            Id = m.Id,
            TierName = m.TierName,
            MinPoints = m.MinPoints,
            DiscountPercent = m.DiscountPercent,
            IsActive = m.IsActive
        };

        await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(result), CacheOptions);
        return result;
    }

    public async Task<bool> CreateAsync(CreateMembershipDto dto)
    {
        var entity = new Membership
        {
            TierName = dto.TierName,
            MinPoints = dto.MinPoints,
            DiscountPercent = dto.DiscountPercent,
            IsActive = dto.IsActive
        };

        await _repository.AddAsync(entity);
        await _repository.SaveChangesAsync();
        await IncrementCacheVersionAsync(CacheVersionKeys.Memberships);
        return true;
    }

    public async Task<bool> UpdateAsync(int id, UpdateMembershipDto dto)
    {
        var membership = await _repository.GetByIdAsync(id);
        if (membership == null) return false;

        membership.TierName = dto.TierName;
        membership.MinPoints = dto.MinPoints;
        membership.DiscountPercent = dto.DiscountPercent;
        membership.IsActive = dto.IsActive;

        _repository.Update(membership);
        await _repository.SaveChangesAsync();
        await IncrementCacheVersionAsync(CacheVersionKeys.Memberships);
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var membership = await _repository.GetByIdAsync(id);
        if (membership == null) return false;

        _repository.Delete(membership);
        await _repository.SaveChangesAsync();
        await IncrementCacheVersionAsync(CacheVersionKeys.Memberships);
        return true;
    }

    private async Task<string> GetCacheVersionAsync(string key)
    {
        var version = await _cache.GetStringAsync(key);
        return string.IsNullOrWhiteSpace(version) ? "0" : version;
    }

    private async Task IncrementCacheVersionAsync(string key)
    {
        var current = await GetCacheVersionAsync(key);
        if (!int.TryParse(current, out var version))
        {
            version = 0;
        }

        version++;
        await _cache.SetStringAsync(key, version.ToString());
    }
}
