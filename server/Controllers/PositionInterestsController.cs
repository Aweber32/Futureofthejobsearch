using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FutureOfTheJobSearch.Server.Data;
using FutureOfTheJobSearch.Server.Models;
using Microsoft.AspNetCore.Authorization;
using System.Linq;

namespace FutureOfTheJobSearch.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PositionInterestsController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<PositionInterestsController> _logger;

        public PositionInterestsController(ApplicationDbContext db, ILogger<PositionInterestsController> logger)
        {
            _db = db;
            _logger = logger;
        }

        // GET api/positioninterests/for-position?positionId=123
        // Employer view: list all candidate self-declared interests (Interested=true) for a position the employer owns.
        [HttpGet("for-position")]
        [Authorize]
        public async Task<IActionResult> ListForPosition([FromQuery] int positionId)
        {
            if (positionId <= 0) return BadRequest(new { error = "positionId required" });

            // Verify employer
            var employerClaim = User.Claims.FirstOrDefault(c => c.Type == "employerId");
            if (employerClaim == null || string.IsNullOrEmpty(employerClaim.Value))
                return Unauthorized(new { error = "No employer associated with this account" });
            if (!int.TryParse(employerClaim.Value, out var employerId))
                return Unauthorized(new { error = "Invalid employer id" });

            // Ensure position belongs to employer
            var position = await _db.Positions.FirstOrDefaultAsync(p => p.Id == positionId && p.EmployerId == employerId);
            if (position == null)
                return Forbid();

            var list = await _db.PositionInterests
                .Where(pi => pi.PositionId == positionId && pi.Interested == true)
                .Include(pi => pi.Seeker)
                .OrderByDescending(pi => pi.ReviewedAt)
                .ToListAsync();

            return Ok(list);
        }

        // GET api/positioninterests?positionId=123
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> List([FromQuery] int? positionId)
        {
            // Get seeker ID from claims (only seekers should access this)
            var seekerClaim = User.Claims.FirstOrDefault(c => c.Type == "seekerId");
            if (seekerClaim == null || !int.TryParse(seekerClaim.Value, out var seekerId))
                return Unauthorized(new { error = "No seeker associated with this account" });

            // Only return position interests for this specific seeker
            var q = _db.PositionInterests
                .Where(pi => pi.SeekerId == seekerId)
                // Include Position + nested navigation properties for rich review modal (Employer + collections)
                .Include(pi => pi.Position)
                    .ThenInclude(p => p!.Employer)
                .Include(pi => pi.Position)
                    .ThenInclude(p => p!.Educations)
                .Include(pi => pi.Position)
                    .ThenInclude(p => p!.Experiences)
                .Include(pi => pi.Position)
                    .ThenInclude(p => p!.SkillsList)
                .Include(pi => pi.Seeker)
                .AsQueryable();
                
            if (positionId.HasValue) 
                q = q.Where(pi => pi.PositionId == positionId.Value);
                
            var list = await q.OrderByDescending(pi => pi.ReviewedAt).ToListAsync();
            return Ok(list);
        }

        // POST api/positioninterests
        // body: { positionId, seekerId, interested }
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateOrUpdate([FromBody] DTOs.PositionInterestRequest req)
        {
            try
            {
                if (req == null || req.PositionId <= 0) return BadRequest(new { error = "positionId required" });

                // try to get seekerId from token if not provided
                int seekerId = req.SeekerId;
                if (seekerId <= 0)
                {
                    var seekerClaim = User.Claims.FirstOrDefault(c => c.Type == "seekerId");
                    if (seekerClaim != null && int.TryParse(seekerClaim.Value, out var sid)) seekerId = sid;
                }
                if (seekerId <= 0) return BadRequest(new { error = "seekerId required" });

                var existing = await _db.PositionInterests.FirstOrDefaultAsync(pi => pi.PositionId == req.PositionId && pi.SeekerId == seekerId);
                if (existing != null)
                {
                    existing.Interested = req.Interested;
                    existing.ReviewedAt = DateTime.UtcNow;
                    _db.PositionInterests.Update(existing);
                }
                else
                {
                    existing = new PositionInterest
                    {
                        PositionId = req.PositionId,
                        SeekerId = seekerId,
                        Interested = req.Interested,
                        ReviewedAt = DateTime.UtcNow
                    };
                    _db.PositionInterests.Add(existing);
                }
                await _db.SaveChangesAsync();
                return Ok(existing);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CreateOrUpdate PositionInterest failed");
                return StatusCode(500, new { error = "Server error" });
            }
        }

        // PATCH api/positioninterests/{id}
        [HttpPatch("{id}")]
        [Authorize]
        public async Task<IActionResult> Patch(int id, [FromBody] DTOs.PositionInterestUpdateRequest req)
        {
            try
            {
                var existing = await _db.PositionInterests.FirstOrDefaultAsync(pi => pi.Id == id);
                if (existing == null) return NotFound(new { error = "PositionInterest not found" });

                // verify token seeker matches the record
                var seekerClaim = User.Claims.FirstOrDefault(c => c.Type == "seekerId");
                if (seekerClaim == null || !int.TryParse(seekerClaim.Value, out var seekerId) || seekerId != existing.SeekerId) return Forbid();

                existing.Interested = req.Interested;
                existing.ReviewedAt = DateTime.UtcNow;
                _db.PositionInterests.Update(existing);
                await _db.SaveChangesAsync();
                return Ok(existing);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Patch PositionInterest failed");
                return StatusCode(500, new { error = "Server error" });
            }
        }
    }
}
