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
                var position = await _context.Positions
                    .Include(p => p.Employer)
                    .FirstOrDefaultAsync(p => p.Id == positionId && p.EmployerId == employerId);
                
                if (position == null)
                {
                    return NotFound(new { error = "Position not found or access denied" });
                }

                // Get preferences if they exist
                var prefs = await _context.PositionPreferences.FirstOrDefaultAsync(pp => pp.PositionId == positionId);
                
                if (prefs == null)
                {
                    _logger.LogInformation("[GetPreferences] No preferences found for PositionId {PositionId}, returning position defaults", positionId);
                    // Return position data as defaults with all priorities as "None"
                    return Ok(new PositionPreferencesResponse
                    {
                        PositionId = positionId,
                        JobCategory = position.Category,
                        JobCategoryPriority = "None",
                        EducationLevel = null,
                        EducationLevelPriority = "None",
                        YearsExpMin = null,
                        YearsExpPriority = "None",
                        WorkSetting = position.WorkSetting,
                        WorkSettingPriority = "None",
                        TravelRequirements = position.TravelRequirements,
                        TravelRequirementsPriority = "None",
                        PreferredSalary = null,
                        PreferredSalaryPriority = "None"
                    });
                }

                _logger.LogInformation("[GetPreferences] Found preferences for PositionId {PositionId}", positionId);
                _logger.LogInformation("[GetPreferences] Returning stored priorities: JobCat={JobCatPri}, Edu={EduPri}, Years={YearsPri}, Work={WorkPri}, Travel={TravelPri}, Salary={SalaryPri}",
                    prefs.JobCategoryPriority, prefs.EducationLevelPriority, prefs.YearsExpPriority, 
                    prefs.WorkSettingPriority, prefs.TravelRequirementsPriority, prefs.PreferredSalaryPriority);
                // Return saved preferences, but fall back to position data for empty fields
                return Ok(new PositionPreferencesResponse
                {
                    Id = prefs.Id,
                    PositionId = prefs.PositionId,
                    JobCategory = !string.IsNullOrEmpty(prefs.JobCategory) ? prefs.JobCategory : position.Category,
                    EducationLevel = !string.IsNullOrEmpty(prefs.EducationLevel) ? prefs.EducationLevel : null,
                    YearsExpMin = prefs.YearsExpMin,
                    WorkSetting = !string.IsNullOrEmpty(prefs.WorkSetting) ? prefs.WorkSetting : position.WorkSetting,
                    TravelRequirements = !string.IsNullOrEmpty(prefs.TravelRequirements) ? prefs.TravelRequirements : position.TravelRequirements,
                    PreferredSalary = !string.IsNullOrEmpty(prefs.PreferredSalary) ? prefs.PreferredSalary : null,
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

                _logger.LogInformation("=== SAVING POSITION PREFERENCES ===");
                _logger.LogInformation("PositionId: {PositionId}, EmployerId: {EmployerId}", positionId, employerId);
                _logger.LogInformation("Request: JobCat={Cat} (Pri={CatPri}), EduLevel={Edu} (Pri={EduPri}), WorkSetting={Work} (Pri={WorkPri})",
                    request.JobCategory, request.JobCategoryPriority, request.EducationLevel, request.EducationLevelPriority,
                    request.WorkSetting, request.WorkSettingPriority);
                _logger.LogInformation("  YearsExp={YearsMin} (Pri={YearsPri}), Travel={Travel} (Pri={TravelPri}), Salary={Salary} (Pri={SalPri})",
                    request.YearsExpMin, request.YearsExpPriority,
                    request.TravelRequirements, request.TravelRequirementsPriority,
                    request.PreferredSalary, request.PreferredSalaryPriority);

                // Normalize priorities: if value is empty/null, set to "None"; otherwise use the provided priority
                var normalizedJobCatPri = string.IsNullOrEmpty(request.JobCategory) ? "None" : request.JobCategoryPriority;
                var normalizedEduPri = string.IsNullOrEmpty(request.EducationLevel) ? "None" : request.EducationLevelPriority;
                var normalizedYearsPri = request.YearsExpMin == null ? "None" : request.YearsExpPriority;
                var normalizedWorkPri = string.IsNullOrEmpty(request.WorkSetting) ? "None" : request.WorkSettingPriority;
                var normalizedTravelPri = string.IsNullOrEmpty(request.TravelRequirements) ? "None" : request.TravelRequirementsPriority;
                var normalizedSalaryPri = string.IsNullOrEmpty(request.PreferredSalary) ? "None" : request.PreferredSalaryPriority;

                _logger.LogInformation("[Normalization] Priorities normalized based on values: JobCat={JobCat}, Edu={Edu}, Years={Years}, Work={Work}, Travel={Travel}, Salary={Salary}",
                    normalizedJobCatPri, normalizedEduPri, normalizedYearsPri, normalizedWorkPri, normalizedTravelPri, normalizedSalaryPri);

                // Check if preferences already exist
                var existingPrefs = await _context.PositionPreferences.FirstOrDefaultAsync(pp => pp.PositionId == positionId);

                if (existingPrefs != null)
                {
                    // Update existing
                    _logger.LogInformation("[Update] Updating existing preferences for PositionId {PositionId}", positionId);
                    existingPrefs.JobCategory = request.JobCategory;
                    existingPrefs.EducationLevel = request.EducationLevel;
                    existingPrefs.YearsExpMin = request.YearsExpMin;
                    existingPrefs.WorkSetting = request.WorkSetting;
                    existingPrefs.TravelRequirements = request.TravelRequirements;
                    existingPrefs.PreferredSalary = request.PreferredSalary;
                    existingPrefs.JobCategoryPriority = normalizedJobCatPri;
                    existingPrefs.EducationLevelPriority = normalizedEduPri;
                    existingPrefs.YearsExpPriority = normalizedYearsPri;
                    existingPrefs.WorkSettingPriority = normalizedWorkPri;
                    existingPrefs.TravelRequirementsPriority = normalizedTravelPri;
                    existingPrefs.PreferredSalaryPriority = normalizedSalaryPri;
                    existingPrefs.UpdatedAt = DateTime.UtcNow;

                    await _context.SaveChangesAsync();

                    _logger.LogInformation("[Update] Preferences updated successfully");
                    return Ok(new { message = "Preferences updated successfully", preferences = existingPrefs });
                }
                else
                {
                    // Create new
                    _logger.LogInformation("[Create] Creating new preferences for PositionId {PositionId}", positionId);
                    var newPrefs = new PositionPreferences
                    {
                        PositionId = positionId,
                        JobCategory = request.JobCategory,
                        EducationLevel = request.EducationLevel,
                        YearsExpMin = request.YearsExpMin,
                        WorkSetting = request.WorkSetting,
                        TravelRequirements = request.TravelRequirements,
                        PreferredSalary = request.PreferredSalary,
                        JobCategoryPriority = normalizedJobCatPri,
                        EducationLevelPriority = normalizedEduPri,
                        YearsExpPriority = normalizedYearsPri,
                        WorkSettingPriority = normalizedWorkPri,
                        TravelRequirementsPriority = normalizedTravelPri,
                        PreferredSalaryPriority = normalizedSalaryPri,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.PositionPreferences.Add(newPrefs);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("[Create] Preferences created successfully with ID {Id}", newPrefs.Id);
                    return Ok(new { message = "Preferences created successfully", preferences = newPrefs });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving position preferences for position {PositionId}", positionId);
                return StatusCode(500, new { error = "Failed to save preferences" });
            }
        }

        // Helper method to extract salary min/max from string like "Annual: $5,000 - $6,000"
        private void ExtractSalaryFromString(string salaryString, out decimal? min, out decimal? max)
        {
            min = null;
            max = null;

            if (string.IsNullOrEmpty(salaryString)) return;

            // Extract all numbers from the string
            var numbers = System.Text.RegularExpressions.Regex.Matches(salaryString, @"\d+(?:,\d{3})*");
            if (numbers.Count >= 1)
            {
                if (decimal.TryParse(numbers[0].Value.Replace(",", ""), out var firstNum))
                {
                    min = firstNum;
                }
            }

            if (numbers.Count >= 2)
            {
                if (decimal.TryParse(numbers[1].Value.Replace(",", ""), out var secondNum))
                {
                    max = secondNum;
                }
            }
        }
    }
}
