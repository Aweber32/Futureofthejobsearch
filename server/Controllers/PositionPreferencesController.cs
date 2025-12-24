using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FutureOfTheJobSearch.Server.Data;
using FutureOfTheJobSearch.Server.Models;
using FutureOfTheJobSearch.Server.DTOs;

namespace FutureOfTheJobSearch.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PositionPreferencesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PositionPreferencesController> _logger;

        public PositionPreferencesController(ApplicationDbContext context, ILogger<PositionPreferencesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/positionpreferences/{positionId}
        [HttpGet("{positionId}")]
        public async Task<IActionResult> GetPreferences(int positionId)
        {
            try
            {
                // Verify the position exists and user has access
                var employerIdClaim = User.Claims.FirstOrDefault(c => c.Type == "employerId");
                if (employerIdClaim == null)
                {
                    return Unauthorized(new { error = "Employer access required" });
                }

                var employerId = int.Parse(employerIdClaim.Value);
                var position = await _context.Positions.FirstOrDefaultAsync(p => p.Id == positionId && p.EmployerId == employerId);
                
                if (position == null)
                {
                    return NotFound(new { error = "Position not found or access denied" });
                }

                // Get preferences if they exist
                var prefs = await _context.PositionPreferences.FirstOrDefaultAsync(pp => pp.PositionId == positionId);
                
                if (prefs == null)
                {
                    return Ok(new PositionPreferencesResponse
                    {
                        PositionId = positionId,
                        JobCategoryPriority = "None",
                        EducationLevelPriority = "None",
                        YearsExpPriority = "None",
                        WorkSettingPriority = "None",
                        TravelRequirementsPriority = "None",
                        PreferredSalaryPriority = "None"
                    });
                }

                return Ok(new PositionPreferencesResponse
                {
                    Id = prefs.Id,
                    PositionId = prefs.PositionId,
                    JobCategory = prefs.JobCategory,
                    EducationLevel = prefs.EducationLevel,
                    YearsExpMin = prefs.YearsExpMin,
                    YearsExpMax = prefs.YearsExpMax,
                    WorkSetting = prefs.WorkSetting,
                    TravelRequirements = prefs.TravelRequirements,
                    PreferredSalary = prefs.PreferredSalary,
                    JobCategoryPriority = prefs.JobCategoryPriority,
                    EducationLevelPriority = prefs.EducationLevelPriority,
                    YearsExpPriority = prefs.YearsExpPriority,
                    WorkSettingPriority = prefs.WorkSettingPriority,
                    TravelRequirementsPriority = prefs.TravelRequirementsPriority,
                    PreferredSalaryPriority = prefs.PreferredSalaryPriority,
                    CreatedAt = prefs.CreatedAt,
                    UpdatedAt = prefs.UpdatedAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting position preferences for position {PositionId}", positionId);
                return StatusCode(500, new { error = "Failed to retrieve preferences" });
            }
        }

        // POST: api/positionpreferences/{positionId}
        [HttpPost("{positionId}")]
        public async Task<IActionResult> SavePreferences(int positionId, [FromBody] SavePositionPreferencesRequest request)
        {
            try
            {
                // Verify the position exists and user has access
                var employerIdClaim = User.Claims.FirstOrDefault(c => c.Type == "employerId");
                if (employerIdClaim == null)
                {
                    return Unauthorized(new { error = "Employer access required" });
                }

                var employerId = int.Parse(employerIdClaim.Value);
                var position = await _context.Positions.FirstOrDefaultAsync(p => p.Id == positionId && p.EmployerId == employerId);
                
                if (position == null)
                {
                    return NotFound(new { error = "Position not found or access denied" });
                }

                // Check if preferences already exist
                var existingPrefs = await _context.PositionPreferences.FirstOrDefaultAsync(pp => pp.PositionId == positionId);

                if (existingPrefs != null)
                {
                    // Update existing
                    existingPrefs.JobCategory = request.JobCategory;
                    existingPrefs.EducationLevel = request.EducationLevel;
                    existingPrefs.YearsExpMin = request.YearsExpMin;
                    existingPrefs.YearsExpMax = request.YearsExpMax;
                    existingPrefs.WorkSetting = request.WorkSetting;
                    existingPrefs.TravelRequirements = request.TravelRequirements;
                    existingPrefs.PreferredSalary = request.PreferredSalary;
                    existingPrefs.JobCategoryPriority = request.JobCategoryPriority ?? "None";
                    existingPrefs.EducationLevelPriority = request.EducationLevelPriority ?? "None";
                    existingPrefs.YearsExpPriority = request.YearsExpPriority ?? "None";
                    existingPrefs.WorkSettingPriority = request.WorkSettingPriority ?? "None";
                    existingPrefs.TravelRequirementsPriority = request.TravelRequirementsPriority ?? "None";
                    existingPrefs.PreferredSalaryPriority = request.PreferredSalaryPriority ?? "None";
                    existingPrefs.UpdatedAt = DateTime.UtcNow;

                    await _context.SaveChangesAsync();

                    return Ok(new { message = "Preferences updated successfully", preferences = existingPrefs });
                }
                else
                {
                    // Create new
                    var newPrefs = new PositionPreferences
                    {
                        PositionId = positionId,
                        JobCategory = request.JobCategory,
                        EducationLevel = request.EducationLevel,
                        YearsExpMin = request.YearsExpMin,
                        YearsExpMax = request.YearsExpMax,
                        WorkSetting = request.WorkSetting,
                        TravelRequirements = request.TravelRequirements,
                        PreferredSalary = request.PreferredSalary,
                        JobCategoryPriority = request.JobCategoryPriority ?? "None",
                        EducationLevelPriority = request.EducationLevelPriority ?? "None",
                        YearsExpPriority = request.YearsExpPriority ?? "None",
                        WorkSettingPriority = request.WorkSettingPriority ?? "None",
                        TravelRequirementsPriority = request.TravelRequirementsPriority ?? "None",
                        PreferredSalaryPriority = request.PreferredSalaryPriority ?? "None",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.PositionPreferences.Add(newPrefs);
                    await _context.SaveChangesAsync();

                    return Ok(new { message = "Preferences created successfully", preferences = newPrefs });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving position preferences for position {PositionId}", positionId);
                return StatusCode(500, new { error = "Failed to save preferences" });
            }
        }
    }
}
