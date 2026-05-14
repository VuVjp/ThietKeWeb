using HotelManagement.Dtos;
using HotelManagement.Entities;
using HotelManagement.Repositories.Interfaces;
using HotelManagement.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HotelManagement.Services.Implementations;

public class VoucherService : IVoucherService
{
    private readonly IVoucherRepository _repo;
    private readonly IUserRepository _userRepo;
    private readonly IEmailService _emailService;

    public VoucherService(
        IVoucherRepository repo,
        IUserRepository userRepo,
        IEmailService emailService)
    {
        _repo = repo;
        _userRepo = userRepo;
        _emailService = emailService;
    }

    public async Task<IEnumerable<VoucherDto>> GetAllAsync()
    {
        var data = await _repo.GetAllAsync();
        return data.OrderByDescending(item => item.Id).Select(ToDto);
    }

    public async Task<VoucherDto?> GetByIdAsync(int id)
    {
        var entity = await _repo.GetByIdAsync(id);
        if (entity == null)
        {
            return null;
        }

        return ToDto(entity);
    }

    public async Task<bool> CreateAsync(CreateVoucherDto dto)
    {
        ValidateCreate(dto);

        var normalizedCode = dto.Code.Trim().ToUpperInvariant();
        var existed = await _repo.GetByCodeAsync(normalizedCode);
        if (existed != null)
        {
            throw new ConflictException("Voucher code already exists.");
        }

        var entity = new Voucher
        {
            Code = normalizedCode,
            DiscountType = dto.DiscountType.Trim(),
            DiscountValue = dto.DiscountValue,
            MinBookingValue = dto.MinBookingValue,
            MaxDiscountValue = dto.MaxDiscountValue,
            ValidFrom = dto.ValidFrom,
            ValidTo = dto.ValidTo,
            UsageLimit = dto.UsageLimit,
            UsageCount = 0,
            IsActive = true,
        };

        await _repo.AddAsync(entity);
        await _repo.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateAsync(int id, UpdateVoucherDto dto)
    {
        var entity = await _repo.GetByIdAsync(id);
        if (entity == null)
        {
            return false;
        }

        ValidateUpdate(dto, entity);

        if (!string.IsNullOrWhiteSpace(dto.Code))
        {
            var normalizedCode = dto.Code.Trim().ToUpperInvariant();
            if (!string.Equals(entity.Code, normalizedCode, StringComparison.OrdinalIgnoreCase))
            {
                var existed = await _repo.GetByCodeAsync(normalizedCode);
                if (existed != null && existed.Id != entity.Id)
                {
                    throw new ConflictException("Voucher code already exists.");
                }
            }

            entity.Code = normalizedCode;
        }

        if (!string.IsNullOrWhiteSpace(dto.DiscountType))
        {
            entity.DiscountType = dto.DiscountType.Trim();
        }

        if (dto.DiscountValue.HasValue)
        {
            entity.DiscountValue = dto.DiscountValue.Value;
        }

        if (dto.MinBookingValue.HasValue)
        {
            entity.MinBookingValue = dto.MinBookingValue.Value;
        }

        if (dto.MaxDiscountValue.HasValue)
        {
            entity.MaxDiscountValue = dto.MaxDiscountValue.Value;
        }

        if (dto.ValidFrom.HasValue)
        {
            entity.ValidFrom = dto.ValidFrom;
        }

        if (dto.ValidTo.HasValue)
        {
            entity.ValidTo = dto.ValidTo;
        }

        if (dto.UsageLimit.HasValue)
        {
            entity.UsageLimit = dto.UsageLimit;
        }

        _repo.Update(entity);
        await _repo.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ToggleActiveAsync(int id)
    {
        var entity = await _repo.GetByIdAsync(id);
        if (entity == null)
        {
            return false;
        }

        entity.IsActive = !entity.IsActive;
        _repo.Update(entity);
        await _repo.SaveChangesAsync();
        return true;
    }

    private static VoucherDto ToDto(Voucher entity)
    {
        return new VoucherDto
        {
            Id = entity.Id,
            Code = entity.Code,
            DiscountType = entity.DiscountType,
            DiscountValue = entity.DiscountValue,
            MinBookingValue = entity.MinBookingValue,
            MaxDiscountValue = entity.MaxDiscountValue,
            ValidFrom = entity.ValidFrom,
            ValidTo = entity.ValidTo,
            UsageLimit = entity.UsageLimit,
            UsageCount = entity.UsageCount,
            IsActive = entity.IsActive,
        };
    }

    private static void ValidateCreate(CreateVoucherDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Code))
        {
            throw new ArgumentException("Code is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.DiscountType))
        {
            throw new ArgumentException("DiscountType is required.");
        }

        if (dto.DiscountValue <= 0)
        {
            throw new ArgumentException("DiscountValue must be greater than 0.");
        }

        if (dto.MinBookingValue.HasValue && dto.MinBookingValue.Value < 0)
        {
            throw new ArgumentException("MinBookingValue cannot be negative.");
        }

        if (dto.MaxDiscountValue.HasValue && dto.MaxDiscountValue.Value < 0)
        {
            throw new ArgumentException("MaxDiscountValue cannot be negative.");
        }

        if (dto.UsageLimit.HasValue && dto.UsageLimit.Value < 0)
        {
            throw new ArgumentException("UsageLimit cannot be negative.");
        }

        if (dto.ValidFrom.HasValue && dto.ValidTo.HasValue && dto.ValidTo < dto.ValidFrom)
        {
            throw new ArgumentException("ValidTo must be greater than or equal to ValidFrom.");
        }
    }

    public async Task<VoucherDto> ValidateCodeAsync(string code, decimal? bookingAmount)
    {
        return ToDto(await ValidateCodeAsync(code, bookingAmount, _repo));
    }
    private static async Task<Voucher> ValidateCodeAsync(string code, decimal? bookingAmount, IVoucherRepository repo)
    {
        var normalized = code.Trim().ToUpperInvariant();
        var voucher = await repo.GetByCodeAsync(normalized);
        if (voucher == null || !voucher.IsActive)
        {
            throw new ArgumentException("Invalid voucher code.");
        }

        if (voucher.ValidFrom.HasValue && voucher.ValidFrom > DateTime.Now)
        {
            throw new ArgumentException("Voucher is not valid yet.");
        }

        if (voucher.ValidTo.HasValue && voucher.ValidTo < DateTime.Now)
        {
            throw new ArgumentException("Voucher has expired.");
        }

        if (voucher.UsageLimit.HasValue && voucher.UsageCount >= voucher.UsageLimit.Value)
        {
            throw new ArgumentException("Voucher usage limit has been reached.");
        }

        if (bookingAmount.HasValue && voucher.MinBookingValue.HasValue && bookingAmount.Value < voucher.MinBookingValue.Value)
        {
            throw new ArgumentException($"Minimum booking amount for this voucher is {voucher.MinBookingValue.Value}.");
        }
        return voucher;
    }

    public async Task<bool> SendVoucherToUsersAsync(SendVoucherToUsersDto dto)
    {
        // 1. Create the voucher first
        var voucherOk = await CreateAsync(dto.VoucherData);
        if (!voucherOk) return false;

        var voucherCode = dto.VoucherData.Code.Trim().ToUpperInvariant();

        // 2. Get users
        var users = await _userRepo.GetQueryable()
            .Where(u => dto.UserIds.Contains(u.Id))
            .ToListAsync();

        if (!users.Any()) return true; // Nothing to send to

        // 3. Prepare email body
        var discountText = dto.VoucherData.DiscountType == "Percentage" 
            ? $"{dto.VoucherData.DiscountValue}% OFF" 
            : $"${dto.VoucherData.DiscountValue} OFF";

        var validityText = "";
        if (dto.VoucherData.ValidFrom.HasValue && dto.VoucherData.ValidTo.HasValue)
        {
            validityText = $"Valid from {dto.VoucherData.ValidFrom.Value:dd/MM/yyyy} to {dto.VoucherData.ValidTo.Value:dd/MM/yyyy}";
        }

        foreach (var user in users)
        {
            try
            {
                var emailBody = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;'>
                        <h2 style='color: #00838f; text-align: center;'>A Special Gift For You! 🎁</h2>
                        <p>Hello {user.FullName},</p>
                        <p>We are excited to share a special voucher with you for your next stay at Nhom8 Hotel.</p>
                        <div style='background-color: #e0f7fa; border: 2px dashed #00acc1; padding: 15px; text-align: center; margin: 20px 0;'>
                            <span style='font-size: 24px; font-weight: bold; color: #006064;'>{voucherCode}</span>
                            <p style='margin-top: 10px; color: #00838f;'><strong>{discountText}</strong> your next booking</p>
                        </div>
                        <p style='font-size: 14px; color: #666;'>
                            {validityText}<br/>
                            * Usage limit: {dto.VoucherData.UsageLimit ?? 1} time(s).
                        </p>
                        <p style='margin-top: 30px; text-align: center;'>We look forward to seeing you soon!<br/><strong>The Nhom8 Hotel Team</strong></p>
                    </div>";

                await _emailService.SendAsync(user.Email, "Special Gift: Your Exclusive Voucher", emailBody);
            }
            catch (Exception)
            {
                // Log error or continue to next user
            }
        }

        return true;
    }

    private static void ValidateUpdate(UpdateVoucherDto dto, Voucher current)
    {
        var discountValue = dto.DiscountValue ?? current.DiscountValue;
        var minBooking = dto.MinBookingValue ?? current.MinBookingValue;
        var usageLimit = dto.UsageLimit ?? current.UsageLimit;
        var validFrom = dto.ValidFrom ?? current.ValidFrom;
        var validTo = dto.ValidTo ?? current.ValidTo;

        if (discountValue <= 0)
        {
            throw new ArgumentException("DiscountValue must be greater than 0.");
        }

        if (minBooking.HasValue && minBooking.Value < 0)
        {
            throw new ArgumentException("MinBookingValue cannot be negative.");
        }

        if (dto.MaxDiscountValue.HasValue && dto.MaxDiscountValue.Value < 0)
        {
            throw new ArgumentException("MaxDiscountValue cannot be negative.");
        }

        if (usageLimit.HasValue && usageLimit.Value < 0)
        {
            throw new ArgumentException("UsageLimit cannot be negative.");
        }

        if (validFrom.HasValue && validTo.HasValue && validTo < validFrom)
        {
            throw new ArgumentException("ValidTo must be greater than or equal to ValidFrom.");
        }
    }
}