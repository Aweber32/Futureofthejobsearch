using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FutureOfTheJobSearch.Server.Data;
using FutureOfTheJobSearch.Server.Models;
using System.Security.Claims;

namespace FutureOfTheJobSearch.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AIAssistantController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AIAssistantController> _logger;

        public AIAssistantController(ApplicationDbContext context, ILogger<AIAssistantController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/AIAssistant
        [HttpGet]
        public async Task<ActionResult<AIAssistantDto>> GetAIAssistant()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User not authenticated" });
            }

            var aiAssistant = await _context.AIAssistants
                .FirstOrDefaultAsync(a => a.UserId == userId);

            if (aiAssistant == null)
            {
                return NotFound(new { exists = false });
            }

            return Ok(new AIAssistantDto
            {
                Id = aiAssistant.Id,
                Name = aiAssistant.Name,
                CreatedAt = aiAssistant.CreatedAt,
                UpdatedAt = aiAssistant.UpdatedAt
            });
        }

        // POST: api/AIAssistant
        [HttpPost]
        public async Task<ActionResult<AIAssistantDto>> CreateAIAssistant([FromBody] CreateAIAssistantDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User not authenticated" });
            }

            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest(new { error = "AI name is required" });
            }

            if (dto.Name.Length > 100)
            {
                return BadRequest(new { error = "AI name must be 100 characters or less" });
            }

            // Check if AI already exists for this user
            var existingAI = await _context.AIAssistants
                .FirstOrDefaultAsync(a => a.UserId == userId);

            if (existingAI != null)
            {
                return Conflict(new { error = "AI assistant already exists for this user" });
            }

            var aiAssistant = new AIAssistant
            {
                UserId = userId,
                Name = dto.Name.Trim(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.AIAssistants.Add(aiAssistant);
            await _context.SaveChangesAsync();

            _logger.LogInformation("AI Assistant created for user {UserId} with name {Name}", userId, aiAssistant.Name);

            return CreatedAtAction(nameof(GetAIAssistant), new AIAssistantDto
            {
                Id = aiAssistant.Id,
                Name = aiAssistant.Name,
                CreatedAt = aiAssistant.CreatedAt,
                UpdatedAt = aiAssistant.UpdatedAt
            });
        }

        // PUT: api/AIAssistant
        [HttpPut]
        public async Task<ActionResult<AIAssistantDto>> UpdateAIAssistant([FromBody] UpdateAIAssistantDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User not authenticated" });
            }

            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest(new { error = "AI name is required" });
            }

            if (dto.Name.Length > 100)
            {
                return BadRequest(new { error = "AI name must be 100 characters or less" });
            }

            var aiAssistant = await _context.AIAssistants
                .FirstOrDefaultAsync(a => a.UserId == userId);

            if (aiAssistant == null)
            {
                return NotFound(new { error = "AI assistant not found" });
            }

            aiAssistant.Name = dto.Name.Trim();
            aiAssistant.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("AI Assistant updated for user {UserId} with new name {Name}", userId, aiAssistant.Name);

            return Ok(new AIAssistantDto
            {
                Id = aiAssistant.Id,
                Name = aiAssistant.Name,
                CreatedAt = aiAssistant.CreatedAt,
                UpdatedAt = aiAssistant.UpdatedAt
            });
        }
    }

    // DTOs
    public class AIAssistantDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateAIAssistantDto
    {
        public string Name { get; set; } = null!;
    }

    public class UpdateAIAssistantDto
    {
        public string Name { get; set; } = null!;
    }
}
