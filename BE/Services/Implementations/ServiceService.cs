using HotelManagement.Dtos;
using HotelManagement.Entities;
using HotelManagement.Repositories.Interfaces;
using HotelManagement.Services.Interfaces;
using Microsoft.Extensions.Caching.Distributed;
using System;
using System.Text.Json;

namespace HotelManagement.Services.Implementations;

public class ServiceService : IServiceService
{
    private readonly IServiceRepository _repository;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly IDistributedCache _cache;
    private static readonly DistributedCacheEntryOptions CacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
    };

    public ServiceService(IServiceRepository repository, ICloudinaryService cloudinaryService, IDistributedCache cache)
    {
        _repository = repository;
        _cloudinaryService = cloudinaryService;
        _cache = cache;
    }

    public async Task<PaginatedResultDto<ServiceDto>> GetPagedAsync(ServiceQueryDto query)
    {
        var cacheVersion = await GetCacheVersionAsync(CacheVersionKeys.Services);
        var cacheKey = BuildPagedCacheKey(cacheVersion, query);
        var cached = await _cache.GetStringAsync(cacheKey);
        if (!string.IsNullOrWhiteSpace(cached))
        {
            var cachedResult = JsonSerializer.Deserialize<PaginatedResultDto<ServiceDto>>(cached);
            if (cachedResult != null)
            {
                return cachedResult;
            }
        }

        var (items, total) = await _repository.GetPagedAsync(
            query.Search, query.CategoryId, query.SortBy, query.SortOrder, query.Page, query.PageSize, query.IsActive);

        var result = new PaginatedResultDto<ServiceDto>
        {
            Items = items.Select(s => new ServiceDto
            {
                Id = s.Id,
                CategoryId = s.CategoryId,
                CategoryName = s.Category?.Name ?? string.Empty,
                Name = s.Name,
                Price = s.Price,
                Unit = s.Unit,
                ImageUrl = s.ImageUrl,
                Description = s.Description,
                Features = s.Features,
                IsActive = s.IsActive
            }).ToList(),
            Total = total,
            Page = query.Page,
            PageSize = query.PageSize
        };

        await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(result), CacheOptions);
        return result;
    }

    public async Task<ServiceDto?> GetByIdAsync(int id)
    {
        var cacheVersion = await GetCacheVersionAsync(CacheVersionKeys.Services);
        var cacheKey = $"services:v{cacheVersion}:id:{id}";
        var cached = await _cache.GetStringAsync(cacheKey);
        if (!string.IsNullOrWhiteSpace(cached))
        {
            return JsonSerializer.Deserialize<ServiceDto>(cached);
        }

        var s = await _repository.GetByIdWithCategoryAsync(id);
        if (s == null) return null;
        var result = new ServiceDto
        {
            Id = s.Id,
            CategoryId = s.CategoryId,
            CategoryName = s.Category?.Name ?? string.Empty,
            Name = s.Name,
            Price = s.Price,
            Unit = s.Unit,
            ImageUrl = s.ImageUrl,
            Description = s.Description,
            Features = s.Features,
            IsActive = s.IsActive
        };

        await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(result), CacheOptions);
        return result;
    }

    public async Task<bool> CreateAsync(CreateServiceDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) throw new ArgumentException("Name is required.");
        if (dto.Price <= 0) throw new ArgumentException("Price must be greater than 0.");
        if (string.IsNullOrWhiteSpace(dto.Unit)) throw new ArgumentException("Unit is required.");

        string? imageUrl = null;
        if (dto.Image != null)
        {
            imageUrl = await _cloudinaryService.UploadImageAsync(dto.Image, "services");
        }

        var service = new Service
        {
            CategoryId = dto.CategoryId,
            Name = dto.Name,
            Price = dto.Price,
            Unit = dto.Unit,
            ImageUrl = imageUrl,
            Description = dto.Description,
            Features = dto.Features,
            IsActive = true
        };

        await _repository.AddAsync(service);
        await _repository.SaveChangesAsync();
        await IncrementCacheVersionAsync(CacheVersionKeys.Services);
        return true;
    }

    public async Task<bool> UpdateAsync(int id, UpdateServiceDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) throw new ArgumentException("Name is required.");
        if (dto.Price <= 0) throw new ArgumentException("Price must be greater than 0.");
        if (string.IsNullOrWhiteSpace(dto.Unit)) throw new ArgumentException("Unit is required.");

        var service = await _repository.GetByIdAsync(id);
        if (service == null) return false;

        if (dto.Image != null)
        {
            service.ImageUrl = await _cloudinaryService.UploadImageAsync(dto.Image, "services");
        }

        service.CategoryId = dto.CategoryId;
        service.Name = dto.Name;
        service.Price = dto.Price;
        service.Unit = dto.Unit;
        service.Description = dto.Description;
        service.Features = dto.Features;
        service.IsActive = dto.IsActive;

        _repository.Update(service);
        await _repository.SaveChangesAsync();
        await IncrementCacheVersionAsync(CacheVersionKeys.Services);
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var service = await _repository.GetByIdAsync(id);
        if (service == null) return false;

        service.IsActive = false;
        _repository.Update(service);
        await _repository.SaveChangesAsync();
        await IncrementCacheVersionAsync(CacheVersionKeys.Services);
        return true;
    }

    public async Task<bool> ToggleActiveAsync(int id)
    {
        var service = await _repository.GetByIdAsync(id);
        if (service == null) return false;

        service.IsActive = !service.IsActive;
        _repository.Update(service);
        await _repository.SaveChangesAsync();
        await IncrementCacheVersionAsync(CacheVersionKeys.Services);
        return true;
    }

    public async Task<bool> RestoreAsync(int id)
    {
        var service = await _repository.GetByIdAsync(id);
        if (service == null) return false;

        service.IsActive = true;
        _repository.Update(service);
        await _repository.SaveChangesAsync();
        await IncrementCacheVersionAsync(CacheVersionKeys.Services);
        return true;
    }

    private static string BuildPagedCacheKey(string cacheVersion, ServiceQueryDto query)
    {
        var search = (query.Search ?? string.Empty).Trim().ToLowerInvariant();
        var sortBy = (query.SortBy ?? string.Empty).Trim().ToLowerInvariant();
        var sortOrder = (query.SortOrder ?? string.Empty).Trim().ToLowerInvariant();
        return $"services:v{cacheVersion}:paged:{search}:{query.CategoryId}:{sortBy}:{sortOrder}:{query.Page}:{query.PageSize}:{query.IsActive}";
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
