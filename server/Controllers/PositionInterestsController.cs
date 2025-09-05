using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FutureOfTheJobSearch.Server.Data;
using FutureOfTheJobSearch.Server.Models;
using Microsoft.AspNetCore.Authorization;

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

        // GET api/positioninterests?positionId=123
        [HttpGet]
        public async Task<IActionResult> List([FromQuery] int? positionId)
        {
            var q = _db.PositionInterests.Include(pi => pi.Position).Include(pi => pi.Seeker).AsQueryable();
            if (positionId.HasValue) q = q.Where(pi => pi.PositionId == positionId.Value);
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
