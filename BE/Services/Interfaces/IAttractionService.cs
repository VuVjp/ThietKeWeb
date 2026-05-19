using HotelManagement.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;
using HotelManagement.Dtos;

public interface IAttractionService
{
	Task<IEnumerable<AttractionDto>> GetAllAsync();
	Task<AttractionDto?> GetByIdAsync(int id);
	Task<bool> CreateAsync(CreateAttractionDto dto);
	Task<bool> UpdateAsync(int id, UpdateAttractionDto dto);
	Task<bool> DeleteAsync(int id);
	Task<HotelLocationDto> GetHotelLocationAsync();
	Task UpdateHotelLocationAsync(HotelLocationDto dto);
}