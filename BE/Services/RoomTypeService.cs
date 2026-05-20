using HotelManagement.Dtos;
using HotelManagement.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Distributed;
using System;
using System.Text.Json;
using System.Transactions;

public class RoomTypeService : IRoomTypeService
{
    private readonly IRoomTypeRepository _roomTypeRepository;
    private readonly IRoomImageRepository _roomImageRepository;
    private readonly IAmenityRepository _amenityRepository;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly IDistributedCache _cache;
    private static readonly DistributedCacheEntryOptions CacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
    };

    public RoomTypeService(
        IRoomTypeRepository roomTypeRepository,
        IRoomImageRepository roomImageRepository,
        IAmenityRepository amenityRepository,
        ICloudinaryService cloudinaryService,
        IDistributedCache cache)
    {
        _roomTypeRepository = roomTypeRepository;
        _roomImageRepository = roomImageRepository;
        _amenityRepository = amenityRepository;
        _cloudinaryService = cloudinaryService;
        _cache = cache;
    }

    public async Task<IEnumerable<RoomTypeDto>> GetAllRoomTypesAsync()
    {
        var cacheVersion = await GetCacheVersionAsync(CacheVersionKeys.RoomTypes);
        var cacheKey = $"roomtypes:v{cacheVersion}:all";
        var cached = await _cache.GetStringAsync(cacheKey);
        if (!string.IsNullOrWhiteSpace(cached))
        {
            var cachedResult = JsonSerializer.Deserialize<List<RoomTypeDto>>(cached);
            if (cachedResult != null)
            {
                return cachedResult;
            }
        }

        var roomTypes = await _roomTypeRepository.GetAllWithImagesAndAmenitiesAsync();
        var result = roomTypes.Select(ToDto).ToList();
        await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(result), CacheOptions);
        return result;
    }
    public async Task<RoomTypeDto?> GetRoomTypeByIdAsync(int id)
    {
        var cacheVersion = await GetCacheVersionAsync(CacheVersionKeys.RoomTypes);
        var cacheKey = $"roomtypes:v{cacheVersion}:id:{id}";
        var cached = await _cache.GetStringAsync(cacheKey);
        if (!string.IsNullOrWhiteSpace(cached))
        {
            return JsonSerializer.Deserialize<RoomTypeDto>(cached);
        }

        var roomType = await _roomTypeRepository.GetByIdWithImagesAndAmenitiesAsync(id);
        if (roomType == null) return null;

        var result = ToDto(roomType);
        await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(result), CacheOptions);
        return result;
    }
    public async Task<bool> CreateRoomTypeAsync(CreateRoomTypeDto dto)
    {
        var roomType = new RoomType
        {
            Name = dto.Name,
            BasePrice = dto.BasePrice,
            CapacityAdults = dto.CapacityAdults,
            CapacityChildren = dto.CapacityChildren,
            Description = dto.Description,
            View = dto.View,
            BedType = dto.BedType,
            SizeM2 = dto.SizeM2,
            IsActive = true
        };

        if (dto.Files != null && dto.Files.Count > 0)
        {
            roomType.RoomImages = new List<RoomImage>();

            foreach (var file in dto.Files)
            {
                var imageUrl = await _cloudinaryService.UploadImageAsync(file, $"room-types/{roomType.Name}");
                roomType.RoomImages.Add(new RoomImage
                {
                    ImageUrl = imageUrl,
                    IsPrimary = false
                });
            }

            // Set the first image as primary if there are any images
            roomType.RoomImages.First().IsPrimary = true;
        }

        await _roomTypeRepository.AddAsync(roomType);
        await _roomTypeRepository.SaveChangesAsync();

        await IncrementCacheVersionAsync(CacheVersionKeys.RoomTypes);
        await IncrementCacheVersionAsync(CacheVersionKeys.Rooms);

        return true;
    }

    public async Task<bool> UpdateRoomTypeAsync(int id, UpdateRoomTypeDto dto)
    {
        var roomType = await _roomTypeRepository.GetByIdAsync(id);
        if (roomType == null) return false;

        roomType.Name = dto.Name;
        roomType.BasePrice = dto.BasePrice;
        roomType.CapacityAdults = dto.CapacityAdults;
        roomType.CapacityChildren = dto.CapacityChildren;
        roomType.Description = dto.Description;
        roomType.View = dto.View;
        roomType.BedType = dto.BedType;
        roomType.SizeM2 = dto.SizeM2;

        if (dto.Files != null && dto.Files.Count > 0)
        {
            foreach (var file in dto.Files)
            {
                var imageUrl = await _cloudinaryService.UploadImageAsync(file, $"room-types/{roomType.Name}");
                var roomImage = new RoomImage
                {
                    RoomTypeId = id,
                    ImageUrl = imageUrl,
                    IsPrimary = false
                };
                await _roomImageRepository.AddAsync(roomImage);
            }
        }

        _roomTypeRepository.Update(roomType);
        await _roomTypeRepository.SaveChangesAsync();

        await IncrementCacheVersionAsync(CacheVersionKeys.RoomTypes);
        await IncrementCacheVersionAsync(CacheVersionKeys.Rooms);

        return true;
    }

    public async Task<bool> ToggleActiveAsync(int id)
    {
        var roomType = await _roomTypeRepository.GetByIdAsync(id);
        if (roomType == null) return false;

        roomType.IsActive = !roomType.IsActive;

        _roomTypeRepository.Update(roomType);
        await _roomTypeRepository.SaveChangesAsync();

        await IncrementCacheVersionAsync(CacheVersionKeys.RoomTypes);
        await IncrementCacheVersionAsync(CacheVersionKeys.Rooms);

        return true;
    }

    public async Task<bool> AddImageAsync(int id, AddRoomImageDto dto)
    {
        var roomType = await _roomTypeRepository.GetByIdAsync(id);
        if (roomType == null)
            throw new Exception("Room type not found");

        var imageUrl = dto.ImageUrl;
        if (dto.File != null)
        {
            imageUrl = await _cloudinaryService.UploadImageAsync(dto.File, "room-types", roomType.Name);
        }

        if (string.IsNullOrWhiteSpace(imageUrl))
        {
            throw new Exception("Image file or image URL is required.");
        }

        var existingImages = await _roomImageRepository.GetImagesByRoomTypeIdAsync(id);

        var roomImage = new RoomImage
        {
            RoomTypeId = id,
            ImageUrl = imageUrl,
            IsPrimary = !existingImages.Any()
        };

        await _roomImageRepository.AddAsync(roomImage);
        await _roomImageRepository.SaveChangesAsync();

        await IncrementCacheVersionAsync(CacheVersionKeys.RoomTypes);
        await IncrementCacheVersionAsync(CacheVersionKeys.Rooms);

        return true;
    }
    public async Task<bool> DeleteImageAsync(int imageId)
    {
        var image = await _roomImageRepository.GetByIdAsync(imageId);
        if (image == null) return false;

        if (image.RoomTypeId == null) return false;

        if (image.IsPrimary ?? false)
        {
            var images = await _roomImageRepository
                .GetImagesByRoomTypeIdAsync(image.RoomTypeId.Value);

            var next = images.FirstOrDefault(x => x.Id != image.Id);
            if (next != null)
            {
                next.IsPrimary = true;
                _roomImageRepository.Update(next);
            }
        }

        _roomImageRepository.Delete(image);
        await _roomImageRepository.SaveChangesAsync();

        await IncrementCacheVersionAsync(CacheVersionKeys.RoomTypes);
        await IncrementCacheVersionAsync(CacheVersionKeys.Rooms);

        return true;
    }

    public async Task<bool> SetPrimaryRoomImageAsync(int roomTypeId, int imageId)
    {
        var images = (await _roomImageRepository
            .GetImagesByRoomTypeIdAsync(roomTypeId)).ToList();

        var targetImage = images.FirstOrDefault(x => x.Id == imageId);
        if (targetImage == null) return false;

        images.ForEach(img => img.IsPrimary = false);

        targetImage.IsPrimary = true;

        foreach (var img in images)
        {
            _roomImageRepository.Update(img);
        }

        await _roomImageRepository.SaveChangesAsync();
        await IncrementCacheVersionAsync(CacheVersionKeys.RoomTypes);
        await IncrementCacheVersionAsync(CacheVersionKeys.Rooms);
        return true;
    }

    public async Task<IEnumerable<AmenityDto>> GetAmenitiesAsync(int roomTypeId)
    {
        var roomType = await _roomTypeRepository.GetByIdWithImagesAndAmenitiesAsync(roomTypeId);
        if (roomType == null)
        {
            throw new NotFoundException($"Room type with ID {roomTypeId} not found.");
        }

        return roomType.RoomTypeAmenities
            .Where(x => x.Amenity != null)
            .Select(x => new AmenityDto
            {
                Id = x.Amenity.Id,
                Name = x.Amenity.Name,
                IconUrl = x.Amenity.IconUrl,
                IsActive = x.Amenity.IsActive
            });
    }

    public async Task<bool> AddAmenityAsync(int roomTypeId, AddRoomTypeAmenityDto dto)
    {
        if (dto.AmenityId <= 0)
        {
            throw new ArgumentException("AmenityId is required.");
        }

        var amenity = await _amenityRepository.GetByIdAsync(dto.AmenityId);
        if (amenity == null || !amenity.IsActive)
        {
            throw new NotFoundException($"Amenity with ID {dto.AmenityId} not found.");
        }

        var result = await _roomTypeRepository.AddAmenityAsync(roomTypeId, dto.AmenityId);
        if (!result)
        {
            throw new NotFoundException($"Room type with ID {roomTypeId} not found.");
        }

        await IncrementCacheVersionAsync(CacheVersionKeys.RoomTypes);
        await IncrementCacheVersionAsync(CacheVersionKeys.Rooms);

        return true;
    }

    public async Task<bool> AddAmenitiesAsync(int roomTypeId, AddRoomTypeAmenitiesDto dto)
    {
        if (dto.AmenityIds == null || dto.AmenityIds.Count == 0)
        {
            throw new ArgumentException("AmenityIds is required.");
        }

        var result = await _roomTypeRepository.AddAmenitiesAsync(roomTypeId, dto.AmenityIds);
        if (!result)
        {
            throw new NotFoundException("Room type or one of the amenities was not found.");
        }

        await IncrementCacheVersionAsync(CacheVersionKeys.RoomTypes);
        await IncrementCacheVersionAsync(CacheVersionKeys.Rooms);

        return true;
    }

    public async Task<bool> RemoveAmenityAsync(int roomTypeId, int amenityId)
    {
        var result = await _roomTypeRepository.RemoveAmenityAsync(roomTypeId, amenityId);
        if (!result)
        {
            throw new NotFoundException("Room type amenity relation not found.");
        }

        await IncrementCacheVersionAsync(CacheVersionKeys.RoomTypes);
        await IncrementCacheVersionAsync(CacheVersionKeys.Rooms);

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

    private static RoomTypeDto ToDto(RoomType roomType)
    {
        return new RoomTypeDto
        {
            Id = roomType.Id,
            Name = roomType.Name,
            BasePrice = roomType.BasePrice,
            CapacityAdults = roomType.CapacityAdults,
            CapacityChildren = roomType.CapacityChildren,
            Description = roomType.Description,
            View = roomType.View,
            BedType = roomType.BedType,
            SizeM2 = roomType.SizeM2,
            IsActive = roomType.IsActive,
            AverageRating = roomType.Reviews != null && roomType.Reviews.Any(r => r.IsActive)
                ? Math.Round(roomType.Reviews.Where(r => r.IsActive).Average(r => r.Rating ?? 0), 1)
                : 0,
            ReviewCount = roomType.Reviews?.Count(r => r.IsActive) ?? 0,
            Amenities = roomType.RoomTypeAmenities
                .Where(x => x.Amenity != null)
                .Select(x => new AmenityDto
                {
                    Id = x.Amenity.Id,
                    Name = x.Amenity.Name,
                    IconUrl = x.Amenity.IconUrl,
                    IsActive = x.Amenity.IsActive
                })
                .ToList(),
            RoomImages = roomType.RoomImages.Select(i => new RoomImageDto
            {
                Id = i.Id,
                ImageUrl = i.ImageUrl,
                IsPrimary = i.IsPrimary ?? false
            }).ToList(),
            Equipments = roomType.Rooms
                .SelectMany(r => r.RoomInventories)
                .Where(i => i.Equipment != null && i.IsActive)
                .Select(i => i.Equipment!)
                .GroupBy(e => e.Id)
                .Select(g => g.First())
                .Select(e => new EquipmentDto
                {
                    Id = e.Id,
                    ItemCode = e.ItemCode,
                    Name = e.Name,
                    Category = e.Category,
                    Unit = e.Unit,
                    ImageUrl = e.ImageUrl,
                    IsActive = e.IsActive
                })
                .ToList()
        };
    }
}
