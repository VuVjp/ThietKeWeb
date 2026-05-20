using HotelManagement.Entities;
using Microsoft.EntityFrameworkCore;
using HotelManagement.Data;
using Microsoft.AspNetCore.Http;
using HotelManagement.Services.Interfaces;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

public class ArticleService : IArticleService
{
    private readonly IArticleRepository _repo;
    private readonly IArticleCategoryRepository _categoryRepo;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly AppDbContext _context;
    private readonly IDashboardService _dashboardService;
    private readonly IDistributedCache _cache;
    private static readonly DistributedCacheEntryOptions CacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
    };

    public ArticleService(
        IArticleRepository repo,
        IArticleCategoryRepository categoryRepo,
        ICloudinaryService cloudinaryService,
        AppDbContext context,
        IDashboardService dashboardService,
        IDistributedCache cache)
    {
        _repo = repo;
        _categoryRepo = categoryRepo;
        _cloudinaryService = cloudinaryService;
        _context = context;
        _dashboardService = dashboardService;
        _cache = cache;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static ArticleDto MapToDto(Article a) => new()
    {
        Id = a.Id,
        AuthorId = a.AuthorId,
        Title = a.Title,
        Subtitle = a.Subtitle,
        Slug = a.Slug,
        Content = null, // Omitted in list — use GetByIdAsync for full content
        ThumbnailUrl = a.ThumbnailUrl,
        PublishedAt = a.PublishedAt,
        AuthorName = a.Author?.FullName,
        IsActive = a.IsActive,
        Categories = a.ArticleCategoryMaps
            .Where(m => m.Category != null)
            .Select(m => new ArticleCategoryDto
            {
                Id = m.Category!.Id,
                Name = m.Category.Name,
                IsActive = m.Category.IsActive,
            })
            .ToList(),
        Attractions = a.ArticleAttractionMaps
            .Where(m => m.Attraction != null)
            .Select(m => new AttractionDto
            {
                Id = m.Attraction!.Id,
                Name = m.Attraction.Name,
                Description = m.Attraction.Description,
                DistanceKm = m.Attraction.DistanceKm,
                IsActive = m.Attraction.IsActive,
                MapEmbedLink = m.Attraction.MapEmbedLink,
                Latitude = m.Attraction.Latitude,
                Longitude = m.Attraction.Longitude,
                ImageUrl = m.Attraction.ImageUrl,
            })
            .ToList(),
    };

    private static ArticleDto MapToDtoWithContent(Article a) => new()
    {
        Id = a.Id,
        AuthorId = a.AuthorId,
        Title = a.Title,
        Subtitle = a.Subtitle,
        Slug = a.Slug,
        Content = a.Content,
        ThumbnailUrl = a.ThumbnailUrl,
        PublishedAt = a.PublishedAt,
        AuthorName = a.Author?.FullName,
        IsActive = a.IsActive,
        Categories = a.ArticleCategoryMaps
            .Where(m => m.Category != null)
            .Select(m => new ArticleCategoryDto
            {
                Id = m.Category!.Id,
                Name = m.Category.Name,
                IsActive = m.Category.IsActive,
            })
            .ToList(),
        Attractions = a.ArticleAttractionMaps
            .Where(m => m.Attraction != null)
            .Select(m => new AttractionDto
            {
                Id = m.Attraction!.Id,
                Name = m.Attraction.Name,
                Description = m.Attraction.Description,
                DistanceKm = m.Attraction.DistanceKm,
                IsActive = m.Attraction.IsActive,
                MapEmbedLink = m.Attraction.MapEmbedLink,
                Latitude = m.Attraction.Latitude,
                Longitude = m.Attraction.Longitude,
                ImageUrl = m.Attraction.ImageUrl,
            })
            .ToList(),
    };

    /// <summary>
    /// Validates that all provided IDs correspond to active categories.
    /// Throws <see cref="BadRequestException"/> on the first invalid ID.
    /// </summary>
    private async Task ValidateCategoryIdsAsync(IEnumerable<int> categoryIds)
    {
        foreach (var id in categoryIds)
        {
            var cat = await _categoryRepo.GetByIdAsync(id);
            if (cat == null)
                throw new BadRequestException($"Category with ID {id} does not exist.");
            if (!cat.IsActive)
                throw new BadRequestException($"Category '{cat.Name}' (ID {id}) is inactive and cannot be assigned to an article.");
        }
    }

    /// <summary>Replaces the entire set of junction rows for an article with the new list.</summary>
    private async Task SyncCategoryMapsAsync(int articleId, IEnumerable<int> newCategoryIds)
    {
        var existing = await _context.Set<ArticleCategoryMap>()
            .Where(m => m.ArticleId == articleId)
            .ToListAsync();
        _context.Set<ArticleCategoryMap>().RemoveRange(existing);

        foreach (var catId in newCategoryIds.Distinct())
        {
            await _context.Set<ArticleCategoryMap>().AddAsync(new ArticleCategoryMap
            {
                ArticleId = articleId,
                CategoryId = catId,
            });
        }
    }

    /// <summary>Replaces the entire set of attraction junction rows for an article.</summary>
    private async Task SyncAttractionMapsAsync(int articleId, IEnumerable<int> newAttractionIds)
    {
        var existing = await _context.Set<ArticleAttractionMap>()
            .Where(m => m.ArticleId == articleId)
            .ToListAsync();
        _context.Set<ArticleAttractionMap>().RemoveRange(existing);

        foreach (var attrId in newAttractionIds.Distinct())
        {
            await _context.Set<ArticleAttractionMap>().AddAsync(new ArticleAttractionMap
            {
                ArticleId = articleId,
                AttractionId = attrId,
            });
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    public async Task<IEnumerable<ArticleDto>> GetAllAsync()
    {
        var cacheVersion = await GetCacheVersionAsync(CacheVersionKeys.Articles);
        var cacheKey = $"articles:v{cacheVersion}:all";
        var cached = await _cache.GetStringAsync(cacheKey);
        if (!string.IsNullOrWhiteSpace(cached))
        {
            var cachedResult = JsonSerializer.Deserialize<List<ArticleDto>>(cached);
            if (cachedResult != null)
            {
                return cachedResult;
            }
        }

        var data = await _repo.GetAllActiveAsync();
        var result = data.Select(MapToDto).ToList();
        await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(result), CacheOptions);
        return result;
    }

    public async Task<ArticleDto?> GetByIdAsync(int id)
    {
        var cacheVersion = await GetCacheVersionAsync(CacheVersionKeys.Articles);
        var cacheKey = $"articles:v{cacheVersion}:id:{id}";
        var cached = await _cache.GetStringAsync(cacheKey);
        if (!string.IsNullOrWhiteSpace(cached))
        {
            return JsonSerializer.Deserialize<ArticleDto>(cached);
        }

        var a = await _repo.GetByIdWithCategoriesAsync(id);
        if (a == null) throw new NotFoundException($"Article with ID {id} not found.");
        var result = MapToDtoWithContent(a);
        await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(result), CacheOptions);
        return result;
    }

    public async Task<bool> CreateAsync(CreateArticleDto dto)
    {
        // Validate that every supplied category ID exists and is active
        if (dto.CategoryIds.Count > 0)
            await ValidateCategoryIdsAsync(dto.CategoryIds);

        var thumbnailUrl = dto.ThumbnailUrl;
        if (dto.ThumbnailFile != null)
            thumbnailUrl = await _cloudinaryService.UploadImageAsync(dto.ThumbnailFile, "articles/thumbnail");

        var entity = new Article
        {
            AuthorId = dto.AuthorId,
            Title = dto.Title,
            Subtitle = dto.Subtitle,
            Content = dto.Content,
            ThumbnailUrl = thumbnailUrl,
            IsActive = dto.IsActive ?? true,
            PublishedAt = (dto.IsActive ?? true) ? DateTime.Now : null
        };

        await _repo.AddAsync(entity);
        await _repo.SaveChangesAsync(); // entity.Id is now set

        // Insert category junction rows
        await SyncCategoryMapsAsync(entity.Id, dto.CategoryIds);
        // Insert attraction junction rows
        await SyncAttractionMapsAsync(entity.Id, dto.AttractionIds);
        await _context.SaveChangesAsync();

        if (entity.PublishedAt != null)
        {
            await _dashboardService.IncrementMetricAsync("Articles", 1, entity.PublishedAt.Value);
        }

        await IncrementCacheVersionAsync(CacheVersionKeys.Articles);

        return true;
    }

    public async Task<bool> UpdateAsync(int id, UpdateArticleDto dto)
    {
        var entity = await _repo.GetByIdAsync(id);
        if (entity == null) throw new NotFoundException($"Article with ID {id} not found.");

        // Validate that every supplied category ID exists and is active
        if (dto.CategoryIds.Count > 0)
            await ValidateCategoryIdsAsync(dto.CategoryIds);

        var thumbnailUrl = entity.ThumbnailUrl;
        if (dto.ThumbnailFile != null)
            thumbnailUrl = await _cloudinaryService.UploadImageAsync(dto.ThumbnailFile, "articles/thumbnail");
        else if (dto.ThumbnailUrl != null)
            thumbnailUrl = string.IsNullOrWhiteSpace(dto.ThumbnailUrl) ? null : dto.ThumbnailUrl;

        if (dto.AuthorId.HasValue)
            entity.AuthorId = dto.AuthorId.Value;
        entity.Title = dto.Title;
        entity.Subtitle = dto.Subtitle;
        entity.Content = dto.Content;
        entity.ThumbnailUrl = thumbnailUrl;

        bool originallyPublished = entity.IsActive && entity.PublishedAt != null;

        if (dto.IsActive.HasValue)
        {
            entity.IsActive = dto.IsActive.Value;
            if (entity.IsActive && entity.PublishedAt == null)
            {
                entity.PublishedAt = DateTime.Now;
            }
        }

        _repo.Update(entity);

        // Replace junction rows atomically
        await SyncCategoryMapsAsync(entity.Id, dto.CategoryIds);
        // Replace attraction junction rows
        await SyncAttractionMapsAsync(entity.Id, dto.AttractionIds);

        bool isNowPublished = entity.IsActive && entity.PublishedAt != null;
        bool wasJustPublished = !originallyPublished && isNowPublished;

        await _context.SaveChangesAsync();

        if (wasJustPublished)
        {
            await _dashboardService.IncrementMetricAsync("Articles", 1, entity.PublishedAt!.Value);
        }

        await IncrementCacheVersionAsync(CacheVersionKeys.Articles);

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

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _repo.GetByIdAsync(id);
        if (entity == null) throw new NotFoundException($"Article with ID {id} not found.");

        entity.IsActive = false;
        _repo.Update(entity);
        await _repo.SaveChangesAsync();

        return true;
    }

    public async Task<bool> RestoreAsync(int id)
    {
        var entity = await _repo.GetByIdAsync(id);
        if (entity == null) throw new NotFoundException($"Article with ID {id} not found.");

        entity.IsActive = true;
        _repo.Update(entity);
        await _repo.SaveChangesAsync();

        return true;
    }

    public async Task<bool> UpdateThumbnailAsync(int id, UpdateArticleThumbnailDto dto)
    {
        var entity = await _repo.GetByIdAsync(id);
        if (entity == null) throw new NotFoundException($"Article with ID {id} not found.");

        if (dto.ThumbnailFile != null)
            entity.ThumbnailUrl = await _cloudinaryService.UploadImageAsync(dto.ThumbnailFile, "articles/thumbnail");
        else if (dto.ThumbnailUrl != null)
            entity.ThumbnailUrl = string.IsNullOrWhiteSpace(dto.ThumbnailUrl) ? null : dto.ThumbnailUrl;

        _repo.Update(entity);
        await _repo.SaveChangesAsync();

        return true;
    }

    public async Task<string> UploadImageAsync(IFormFile file)
    {
        return await _cloudinaryService.UploadImageAsync(file, "articles/content");
    }
}