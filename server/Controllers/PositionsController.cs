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

                var pos = new Position
                {
                    EmployerId = employerId,
                    Title = req.Title,
                    Category = req.Category,
                    Description = req.Description,
                    EmploymentType = req.EmploymentType,
                    WorkSetting = req.WorkSetting,
                    TravelRequirements = req.TravelRequirements,
                    SalaryType = req.SalaryType,
                    SalaryValue = req.SalaryValue,
                    SalaryMin = req.SalaryMin,
                    SalaryMax = req.SalaryMax,
                    PosterVideoUrl = req.PosterVideoUrl
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
    }
}
