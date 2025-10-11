using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FutureOfTheJobSearch.Server.Data;
using FutureOfTheJobSearch.Server.DTOs;
using FutureOfTheJobSearch.Server.Models;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace FutureOfTheJobSearch.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PositionsController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<PositionsController> _logger;

        public PositionsController(ApplicationDbContext db, ILogger<PositionsController> logger)
        {
            _db = db;
            _logger = logger;
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Create([FromBody] CreatePositionRequest req)
        {
            try
            {
                // get employerId from claims
                var employerClaim = User.Claims.FirstOrDefault(c => c.Type == "employerId");
                if (employerClaim == null || string.IsNullOrEmpty(employerClaim.Value)) return Unauthorized(new { error = "No employer associated with this account" });
                if (!int.TryParse(employerClaim.Value, out var employerId)) return Unauthorized(new { error = "Invalid employer id" });

                var emp = await _db.Employers.FirstOrDefaultAsync(e => e.Id == employerId);
                if (emp == null) return Unauthorized(new { error = "Employer not found" });

                var requiredFields = new Dictionary<string, string?>
                {
                    [nameof(req.Title)] = req.Title,
                    [nameof(req.Category)] = req.Category,
                    [nameof(req.Description)] = req.Description,
                    [nameof(req.EmploymentType)] = req.EmploymentType,
                    [nameof(req.WorkSetting)] = req.WorkSetting,
                    [nameof(req.TravelRequirements)] = req.TravelRequirements,
                    [nameof(req.SalaryType)] = req.SalaryType
                };

                var missingFields = requiredFields
                    .Where(kvp => string.IsNullOrWhiteSpace(kvp.Value))
                    .Select(kvp => kvp.Key)
                    .ToList();

                if (missingFields.Count > 0)
                {
                    return BadRequest(new { error = "Missing required fields", fields = missingFields });
                }

                var pos = new Position
                {
                    EmployerId = employerId,
                    Title = req.Title!,
                    Category = req.Category!,
                    Description = req.Description!,
                    EmploymentType = req.EmploymentType!,
                    WorkSetting = req.WorkSetting!,
                    TravelRequirements = req.TravelRequirements!,
                    SalaryType = req.SalaryType!,
                    SalaryValue = req.SalaryValue,
                    SalaryMin = req.SalaryMin,
                    SalaryMax = req.SalaryMax,
                    PosterVideoUrl = req.PosterVideoUrl,
                    IsOpen = req.IsOpen ?? true,
                    Educations = new List<PositionEducation>(),
                    Experiences = new List<PositionExperience>(),
                    SkillsList = new List<PositionSkill>()
                };

                // map nested lists to normalized child entities
                if (req.EducationLevels != null && req.EducationLevels.Any())
                {
                    pos.Educations = req.EducationLevels
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .Select(x => new PositionEducation { Education = x.Trim() })
                        .ToList();
                }

                if (req.Experiences != null && req.Experiences.Any())
                {
                    pos.Experiences = req.Experiences
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .Select(x => new PositionExperience { Experience = x.Trim() })
                        .ToList();
                }

                if (req.Skills != null && req.Skills.Any())
                {
                    pos.SkillsList = req.Skills
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .Select(x => new PositionSkill { Skill = x.Trim() })
                        .ToList();
                }

                _db.Positions.Add(pos);
                await _db.SaveChangesAsync();

                return Ok(new { message = "Position created", id = pos.Id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Create position failed");
                return StatusCode(500, new { error = "Server error" });
            }
        }

        [HttpGet]
        public async Task<IActionResult> List()
        {
            var positions = await _db.Positions
                .Include(p => p.Employer)
                .Include(p => p.Educations)
                .Include(p => p.Experiences)
                .Include(p => p.SkillsList)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return Ok(positions);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById([FromRoute] int id)
        {
            var pos = await _db.Positions
                .Include(p => p.Employer)
                .Include(p => p.Educations)
                .Include(p => p.Experiences)
                .Include(p => p.SkillsList)
                .FirstOrDefaultAsync(p => p.Id == id);
            if (pos == null) return NotFound(new { error = "Position not found" });

            // Debug logging
            _logger.LogInformation($"Position {id} retrieved. Employer: {pos.Employer?.CompanyName}, CompanySize: {pos.Employer?.CompanySize}");

            return Ok(pos);
        }

        [HttpPatch("{id}")]
        [Authorize]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] CreatePositionRequest req)
        {
            try
            {
                var pos = await _db.Positions
                    .Include(p => p.Educations)
                    .Include(p => p.Experiences)
                    .Include(p => p.SkillsList)
                    .FirstOrDefaultAsync(p => p.Id == id);
                if (pos == null) return NotFound(new { error = "Position not found" });

                // get employerId from claims
                var employerClaim = User.Claims.FirstOrDefault(c => c.Type == "employerId");
                if (employerClaim == null || string.IsNullOrEmpty(employerClaim.Value)) return Unauthorized(new { error = "No employer associated with this account" });
                if (!int.TryParse(employerClaim.Value, out var employerId)) return Unauthorized(new { error = "Invalid employer id" });
                if (pos.EmployerId != employerId) return Forbid();

                // update scalar fields
                pos.Title = req.Title ?? pos.Title;
                pos.Category = req.Category ?? pos.Category;
                pos.Description = req.Description ?? pos.Description;
                pos.EmploymentType = req.EmploymentType ?? pos.EmploymentType;
                pos.WorkSetting = req.WorkSetting ?? pos.WorkSetting;
                pos.TravelRequirements = req.TravelRequirements ?? pos.TravelRequirements;
                if (req.IsOpen.HasValue) pos.IsOpen = req.IsOpen.Value;
                pos.SalaryType = req.SalaryType ?? pos.SalaryType;
                pos.SalaryValue = req.SalaryValue ?? pos.SalaryValue;
                pos.SalaryMin = req.SalaryMin ?? pos.SalaryMin;
                pos.SalaryMax = req.SalaryMax ?? pos.SalaryMax;

                // Handle PosterVideoUrl - allow null to clear the field
                if (req.PosterVideoUrl != null)
                {
                    pos.PosterVideoUrl = req.PosterVideoUrl;
                }

                // replace collections: remove existing and add new ones
                if (pos.Educations != null) _db.PositionEducations.RemoveRange(pos.Educations);
                if (req.EducationLevels != null && req.EducationLevels.Any())
                {
                    pos.Educations = req.EducationLevels
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .Select(x => new PositionEducation { Education = x.Trim() })
                        .ToList();
                }

                if (pos.Experiences != null) _db.PositionExperiences.RemoveRange(pos.Experiences);
                if (req.Experiences != null && req.Experiences.Any())
                {
                    pos.Experiences = req.Experiences
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .Select(x => new PositionExperience { Experience = x.Trim() })
                        .ToList();
                }

                if (pos.SkillsList != null) _db.PositionSkills.RemoveRange(pos.SkillsList);
                if (req.Skills != null && req.Skills.Any())
                {
                    pos.SkillsList = req.Skills
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .Select(x => new PositionSkill { Skill = x.Trim() })
                        .ToList();
                }

                await _db.SaveChangesAsync();
                return Ok(new { message = "Position updated" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Update position failed");
                return StatusCode(500, new { error = "Server error" });
            }
        }
    }
}
