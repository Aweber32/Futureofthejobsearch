using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FutureOfTheJobSearch.Server.Data;
using FutureOfTheJobSearch.Server.Models;
using Microsoft.AspNetCore.Authorization;

namespace FutureOfTheJobSearch.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SeekerInterestsController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<SeekerInterestsController> _logger;

        public SeekerInterestsController(ApplicationDbContext db, ILogger<SeekerInterestsController> logger)
        {
            _db = db;
            _logger = logger;
        }

        // GET api/seekerinterests/mine
        // Seeker view: list employer interest decisions about the current seeker across all positions.
        // Returns lightweight objects: [{ positionId, employerInterested, reviewedAt }]
        [HttpGet("mine")]
        [Authorize]
        public async Task<IActionResult> Mine()
        {
            // verify seeker claim
            var seekerClaim = User.Claims.FirstOrDefault(c => c.Type == "seekerId");
            if (seekerClaim == null || !int.TryParse(seekerClaim.Value, out var seekerId))
                return Unauthorized(new { error = "No seeker associated with this account" });

            var list = await _db.SeekerInterests
                .Where(si => si.SeekerId == seekerId)
                .Select(si => new {
                    positionId = si.PositionId,
                    employerInterested = si.Interested,
                    reviewedAt = si.ReviewedAt
                })
                .ToListAsync();

            return Ok(list);
        }

        // GET api/seekerinterests?positionId=123
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> List([FromQuery] int positionId)
        {
            if (positionId <= 0) return BadRequest(new { error = "positionId required" });

            // Verify the employer owns this position
            var employerClaim = User.Claims.FirstOrDefault(c => c.Type == "employerId");
            if (employerClaim == null || string.IsNullOrEmpty(employerClaim.Value)) 
                return Unauthorized(new { error = "No employer associated with this account" });
            if (!int.TryParse(employerClaim.Value, out var employerId)) 
                return Unauthorized(new { error = "Invalid employer id" });

            // Check if position belongs to this employer
            var position = await _db.Positions.FirstOrDefaultAsync(p => p.Id == positionId && p.EmployerId == employerId);
            if (position == null) 
                return Forbid(); // Position not found or doesn't belong to this employer

            var list = await _db.SeekerInterests
                .Where(si => si.PositionId == positionId && si.EmployerId == employerId)
                .Include(si => si.Seeker)
                    .OrderBy(si => si.Rank.HasValue ? si.Rank.Value : int.MaxValue)
                    .ThenByDescending(si => si.ReviewedAt)
                .ToListAsync();

            return Ok(list);
        }

        // POST api/seekerinterests
        // body: { positionId, seekerId, interested }
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateOrUpdate([FromBody] DTOs.SeekerInterestRequest req)
        {
            try
            {
                _logger.LogInformation("SeekerInterest CreateOrUpdate called with payload: {@req}", req);
                // get employerId from claims
                var employerClaim = User.Claims.FirstOrDefault(c => c.Type == "employerId");
                if (employerClaim == null || string.IsNullOrEmpty(employerClaim.Value)) return Unauthorized(new { error = "No employer associated with this account" });
                if (!int.TryParse(employerClaim.Value, out var employerId)) return Unauthorized(new { error = "Invalid employer id" });

                if (req == null || req.PositionId <= 0 || req.SeekerId <= 0) return BadRequest(new { error = "positionId and seekerId required" });

                var existing = await _db.SeekerInterests
                    .FirstOrDefaultAsync(si => si.PositionId == req.PositionId && si.SeekerId == req.SeekerId && si.EmployerId == employerId);

                if (existing != null)
                {
                    existing.Interested = req.Interested;
                    existing.ReviewedAt = DateTime.UtcNow;
                    _logger.LogInformation("Updated existing SeekerInterest for EmployerId={EmployerId}, PositionId={PositionId}, SeekerId={SeekerId}", employerId, req.PositionId, req.SeekerId);
                }
                else
                {
                    existing = new SeekerInterest
                    {
                        PositionId = req.PositionId,
                        SeekerId = req.SeekerId,
                        EmployerId = employerId,
                        Interested = req.Interested,
                        ReviewedAt = DateTime.UtcNow
                    };
                    _db.SeekerInterests.Add(existing);
                    _logger.LogInformation("Inserted new SeekerInterest for EmployerId={EmployerId}, PositionId={PositionId}, SeekerId={SeekerId}", employerId, req.PositionId, req.SeekerId);
                }

                await _db.SaveChangesAsync();
                return Ok(existing);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CreateOrUpdate SeekerInterest failed");
                return StatusCode(500, new { error = "Server error" });
            }
        }

        // PATCH api/seekerinterests/{id}
        // body: { interested }
        [HttpPatch("{id}")]
        [Authorize]
        public async Task<IActionResult> Patch(int id, [FromBody] DTOs.SeekerInterestUpdateRequest req)
        {
            try
            {
                if (req == null) return BadRequest(new { error = "Invalid payload" });

                var employerClaim = User.Claims.FirstOrDefault(c => c.Type == "employerId");
                if (employerClaim == null || string.IsNullOrEmpty(employerClaim.Value)) return Unauthorized(new { error = "No employer associated with this account" });
                if (!int.TryParse(employerClaim.Value, out var employerId)) return Unauthorized(new { error = "Invalid employer id" });

                var existing = await _db.SeekerInterests.FirstOrDefaultAsync(si => si.Id == id && si.EmployerId == employerId);
                if (existing == null) return NotFound(new { error = "Not found" });

                existing.Interested = req.Interested;
                existing.ReviewedAt = DateTime.UtcNow;

                // Update pipeline stage if provided
                if (!string.IsNullOrWhiteSpace(req.PipelineStage))
                {
                    existing.PipelineStage = req.PipelineStage;
                    existing.PipelineStageUpdatedAt = DateTime.UtcNow;
                }

                await _db.SaveChangesAsync();
                _logger.LogInformation("Patched SeekerInterest Id={Id} by EmployerId={EmployerId}", id, employerId);
                return Ok(existing);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Patch SeekerInterest failed");
                return StatusCode(500, new { error = "Server error" });
            }
        }

        // POST api/seekerinterests/updateranks
        // body: { positionId, rankings: [{seekerInterestId, rank}] }
        [HttpPost("updateranks")]
        [Authorize]
        public async Task<IActionResult> UpdateRanks([FromBody] DTOs.UpdateRanksRequest req)
        {
            try
            {
                if (req == null || req.PositionId <= 0 || req.Rankings == null)
                    return BadRequest(new { error = "positionId and rankings required" });

                var employerClaim = User.Claims.FirstOrDefault(c => c.Type == "employerId");
                if (employerClaim == null || string.IsNullOrEmpty(employerClaim.Value))
                    return Unauthorized(new { error = "No employer associated with this account" });
                if (!int.TryParse(employerClaim.Value, out var employerId))
                    return Unauthorized(new { error = "Invalid employer id" });

                // Verify all seeker interests belong to this employer and position
                var ids = req.Rankings.Select(r => r.SeekerInterestId).ToList();
                var interests = await _db.SeekerInterests
                    .Where(si => ids.Contains(si.Id) && si.EmployerId == employerId && si.PositionId == req.PositionId)
                    .ToListAsync();

                if (interests.Count != ids.Count)
                    return BadRequest(new { error = "Some seeker interests not found or unauthorized" });

                // Update ranks
                foreach (var rankData in req.Rankings)
                {
                    var interest = interests.FirstOrDefault(i => i.Id == rankData.SeekerInterestId);
                    if (interest != null)
                    {
                        interest.Rank = rankData.Rank;
                    }
                }

                await _db.SaveChangesAsync();
                _logger.LogInformation("Updated ranks for {Count} candidates in position {PositionId} by employer {EmployerId}",
                    req.Rankings.Count, req.PositionId, employerId);

                return Ok(new { success = true, updated = req.Rankings.Count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "UpdateRanks failed");
                return StatusCode(500, new { error = "Server error" });
            }
        }
    }
}
