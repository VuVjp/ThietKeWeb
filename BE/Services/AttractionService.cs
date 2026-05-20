using HotelManagement.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using HotelManagement.Services.Interfaces;
using HotelManagement.Dtos;
using HotelManagement.Data;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace HotelManagement.Services;

public class AttractionService : IAttractionService
{
	private readonly IAttractionRepository _repository;
	private readonly ICloudinaryService _cloudinaryService;
	private readonly AppDbContext _context;
	private readonly IDistributedCache _cache;
	private static readonly DistributedCacheEntryOptions CacheOptions = new()
	{
		AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
	};

	public AttractionService(IAttractionRepository repository, ICloudinaryService cloudinaryService, AppDbContext context, IDistributedCache cache)
	{
		_repository = repository;
		_cloudinaryService = cloudinaryService;
		_context = context;
		_cache = cache;
	}

	public async Task<IEnumerable<AttractionDto>> GetAllAsync()
	{
		var cacheVersion = await GetCacheVersionAsync(CacheVersionKeys.Attractions);
		var cacheKey = $"attractions:v{cacheVersion}:all";
		var cached = await _cache.GetStringAsync(cacheKey);
		if (!string.IsNullOrWhiteSpace(cached))
		{
			var cachedResult = JsonSerializer.Deserialize<List<AttractionDto>>(cached);
			if (cachedResult != null)
			{
				return cachedResult;
			}
		}

		var attractions = await _repository.GetAllActiveAsync();
		var result = attractions.Select(a => new AttractionDto
		{
			Id = a.Id,
			Name = a.Name,
			Description = a.Description,
			DistanceKm = a.DistanceKm,
			Latitude = a.Latitude,
			Longitude = a.Longitude,
			ImageUrl = a.ImageUrl,
			IsActive = a.IsActive,
			MapEmbedLink = a.MapEmbedLink
		}).ToList();
		await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(result), CacheOptions);
		return result;
	}

	public async Task<AttractionDto?> GetByIdAsync(int id)
	{
		var cacheVersion = await GetCacheVersionAsync(CacheVersionKeys.Attractions);
		var cacheKey = $"attractions:v{cacheVersion}:id:{id}";
		var cached = await _cache.GetStringAsync(cacheKey);
		if (!string.IsNullOrWhiteSpace(cached))
		{
			return JsonSerializer.Deserialize<AttractionDto>(cached);
		}

		var a = await _repository.GetByIdAsync(id);
		if (a == null) return null;

		var result = new AttractionDto
		{
			Id = a.Id,
			Name = a.Name,
			Description = a.Description,
			DistanceKm = a.DistanceKm,
			Latitude = a.Latitude,
			Longitude = a.Longitude,
			ImageUrl = a.ImageUrl,
			IsActive = a.IsActive,
			MapEmbedLink = a.MapEmbedLink
		};
		await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(result), CacheOptions);
		return result;
	}

	public async Task<bool> CreateAsync(CreateAttractionDto dto)
	{
		var entity = new Attraction
		{
			Name = dto.Name,
			Description = dto.Description,
			Latitude = dto.Latitude,
			Longitude = dto.Longitude,
			IsActive = dto.IsActive,
			MapEmbedLink = dto.MapEmbedLink
		};

		var hotelLoc = await GetHotelLocationAsync();
		if (double.TryParse(entity.Latitude, out double attrLat) && double.TryParse(entity.Longitude, out double attrLng))
		{
			entity.DistanceKm = (decimal)CalculateDistance(hotelLoc.Latitude, hotelLoc.Longitude, attrLat, attrLng);
		}
		else
		{
			entity.DistanceKm = dto.DistanceKm;
		}

		if (dto.File != null)
		{
			entity.ImageUrl = await _cloudinaryService.UploadImageAsync(dto.File, $"attractions");
		}

		await _repository.AddAsync(entity);
		await _repository.SaveChangesAsync();
		await IncrementCacheVersionAsync(CacheVersionKeys.Attractions);
		await IncrementCacheVersionAsync(CacheVersionKeys.Articles);

		return true;
	}

	public async Task<bool> UpdateAsync(int id, UpdateAttractionDto dto)
	{
		var attraction = await _repository.GetByIdAsync(id);
		if (attraction == null || !attraction.IsActive) return false;

		attraction.Name = dto.Name;
		attraction.Description = dto.Description;
		attraction.Latitude = dto.Latitude;
		attraction.Longitude = dto.Longitude;
		if (dto.IsActive.HasValue) attraction.IsActive = dto.IsActive.Value;
		attraction.MapEmbedLink = dto.MapEmbedLink;

		var hotelLoc = await GetHotelLocationAsync();
		if (double.TryParse(attraction.Latitude, out double attrLat) && double.TryParse(attraction.Longitude, out double attrLng))
		{
			attraction.DistanceKm = (decimal)CalculateDistance(hotelLoc.Latitude, hotelLoc.Longitude, attrLat, attrLng);
		}
		else
		{
			attraction.DistanceKm = dto.DistanceKm;
		}

		if (dto.File != null)
		{
			attraction.ImageUrl = await _cloudinaryService.UploadImageAsync(dto.File, $"attractions");
		}

		_repository.Update(attraction);
		await _repository.SaveChangesAsync();
		await IncrementCacheVersionAsync(CacheVersionKeys.Attractions);
		await IncrementCacheVersionAsync(CacheVersionKeys.Articles);
		return true;
	}

	public async Task<bool> DeleteAsync(int id)
	{
		var attraction = await _repository.GetByIdAsync(id);
		if (attraction == null || !attraction.IsActive) return false;

		attraction.IsActive = false;
		_repository.Update(attraction);
		await _repository.SaveChangesAsync();
		await IncrementCacheVersionAsync(CacheVersionKeys.Attractions);
		await IncrementCacheVersionAsync(CacheVersionKeys.Articles);
		return true;
	}

	public async Task<HotelLocationDto> GetHotelLocationAsync()
	{
		try
		{
			var latSetting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == "hotel_base_latitude");
			var lngSetting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == "hotel_base_longitude");

			if (latSetting != null && lngSetting != null &&
				double.TryParse(latSetting.Value, out double lat) &&
				double.TryParse(lngSetting.Value, out double lng))
			{
				return new HotelLocationDto { Latitude = lat, Longitude = lng };
			}
		}
		catch (Exception ex)
		{
			Console.WriteLine($"[Error Reading Hotel Location from DB] {ex.Message}");
		}

		// Fallback default
		return new HotelLocationDto
		{
			Latitude = 10.9539722,
			Longitude = 106.8019444
		};
	}

	public async Task UpdateHotelLocationAsync(HotelLocationDto dto)
	{
		if (dto == null) throw new ArgumentNullException(nameof(dto));

		// 1. Save or update the settings in the DB
		var latSetting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == "hotel_base_latitude");
		if (latSetting == null)
		{
			latSetting = new SystemSetting { Key = "hotel_base_latitude", Value = dto.Latitude.ToString() };
			await _context.SystemSettings.AddAsync(latSetting);
		}
		else
		{
			latSetting.Value = dto.Latitude.ToString();
			_context.SystemSettings.Update(latSetting);
		}

		var lngSetting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == "hotel_base_longitude");
		if (lngSetting == null)
		{
			lngSetting = new SystemSetting { Key = "hotel_base_longitude", Value = dto.Longitude.ToString() };
			await _context.SystemSettings.AddAsync(lngSetting);
		}
		else
		{
			lngSetting.Value = dto.Longitude.ToString();
			_context.SystemSettings.Update(lngSetting);
		}

		await _context.SaveChangesAsync();

		// 2. Recalculate and update the DistanceKm for all attractions in DB
		var attractions = await _repository.GetAllAsync();
		foreach (var a in attractions)
		{
			if (double.TryParse(a.Latitude, out double attrLat) && double.TryParse(a.Longitude, out double attrLng))
			{
				var dist = CalculateDistance(dto.Latitude, dto.Longitude, attrLat, attrLng);
				a.DistanceKm = (decimal)dist;
				_repository.Update(a);
			}
		}
		await _repository.SaveChangesAsync();
		await IncrementCacheVersionAsync(CacheVersionKeys.Attractions);
		await IncrementCacheVersionAsync(CacheVersionKeys.Articles);
		await IncrementCacheVersionAsync(CacheVersionKeys.Attractions);
		await IncrementCacheVersionAsync(CacheVersionKeys.Articles);
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

	private double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
	{
		var R = 6371; // Radius of the earth in km
		var dLat = ToRadians(lat2 - lat1);
		var dLon = ToRadians(lon2 - lon1);
		var a =
			Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
			Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
			Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
		var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
		return Math.Round(R * c, 1);
	}

	private static double ToRadians(double val)
	{
		return (Math.PI / 180) * val;
	}
}