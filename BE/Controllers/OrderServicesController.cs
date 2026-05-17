using HotelManagement.Dtos;
using HotelManagement.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelManagement.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrderServicesController : ControllerBase
{
    private readonly IOrderServiceService _service;
    private readonly IBookingService _bookingService;

    public OrderServicesController(IOrderServiceService service, IBookingService bookingService)
    {
        _service = service;
        _bookingService = bookingService;
    }

    [HttpGet]
    public async Task<IActionResult> GetPaged([FromQuery] OrderServiceQueryDto query)
    {
        return Ok(await _service.GetPagedAsync(query));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var data = await _service.GetByIdAsync(id);
        if (data == null) return NotFound();
        return Ok(data);
    }

    [Authorize]
    [HttpPost("client/create")]
    public async Task<IActionResult> CreateClientOrder(CreateOrderServiceDto dto)
    {
        var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
        {
            return Unauthorized();
        }

        // Verify ownership
        var myActiveRooms = await _bookingService.GetActiveRoomsByUserIdAsync(userId);
        if (!myActiveRooms.Any(r => r.BookingDetailId == dto.BookingDetailId))
        {
            return StatusCode(403, new { message = "You do not have access to this room." });
        }

        try 
        {
            var id = await _service.CreateAsync(dto);
            return Ok(new { id });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Permission(PermissionNames.ManageServices)]
    [HttpPost]
    public async Task<IActionResult> Create(CreateOrderServiceDto dto)
    {
        var id = await _service.CreateAsync(dto);
        return Ok(new { id });
    }

    [Authorize]
    [HttpPost("client/{id}/items")]
    public async Task<IActionResult> AddClientItem(int id, AddItemToOrderDto dto)
    {
        var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
        {
            return Unauthorized();
        }

        // Verify order belongs to user
        var order = await _service.GetByIdAsync(id);
        if (order == null) return NotFound();

        var myActiveRooms = await _bookingService.GetActiveRoomsByUserIdAsync(userId);
        if (!myActiveRooms.Any(r => r.BookingDetailId == order.BookingDetailId))
        {
            return StatusCode(403, new { message = "You do not have access to this order." });
        }

        try
        {
            var ok = await _service.AddItemAsync(id, dto);
            if (!ok) return NotFound();
            return Ok();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Permission(PermissionNames.ManageServices)]
    [HttpPost("{id}/items")]
    public async Task<IActionResult> AddItem(int id, AddItemToOrderDto dto)
    {
        try
        {
            var ok = await _service.AddItemAsync(id, dto);
            if (!ok) return NotFound();
            return Ok();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Permission(PermissionNames.ManageServices)]
    [HttpPut("{id}/items/{serviceId}")]
    public async Task<IActionResult> UpdateItem(int id, int serviceId, UpdateOrderItemDto dto)
    {
        try
        {
            var ok = await _service.UpdateItemAsync(id, serviceId, dto);
            if (!ok) return NotFound();
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Permission(PermissionNames.ManageServices)]
    [HttpDelete("{id}/items/{serviceId}")]
    public async Task<IActionResult> RemoveItem(int id, int serviceId)
    {
        try
        {
            var ok = await _service.RemoveItemAsync(id, serviceId);
            if (!ok) return NotFound();
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Permission(PermissionNames.ManageServices)]
    [HttpPatch("{id}/status")]
    public async Task<IActionResult> ChangeStatus(int id, [FromBody] string status)
    {
        try
        {
            var ok = await _service.ChangeStatusAsync(id, status);
            if (!ok) return NotFound();
            return NoContent();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
