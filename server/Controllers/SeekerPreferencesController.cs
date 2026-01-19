using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using FutureOfTheJobSearch.Server.Data;
using FutureOfTheJobSearch.Server.Models;
using FutureOfTheJobSearch.Server.DTOs;
using FutureOfTheJobSearch.Server.Services;

namespace FutureOfTheJobSearch.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SeekerPreferencesController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly IGeocodingService _geocodingService;
        private readonly ILogger<SeekerPreferencesController> _logger;

        public SeekerPreferencesController(
            ApplicationDbContext db,
            IGeocodingService geocodingService,
            ILogger<SeekerPreferencesController> logger)
        {
            _db = db;
            _geocodingService = geocodingService;
            _logger = logger;
        }

        // GET: api/SeekerPreferences
        [HttpGet]
        public async Task<IActionResult> GetPreferences()
        {
            var seekerIdClaim = User.Claims.FirstOrDefault(c => c.Type == "seekerId");
            if (seekerIdClaim == null || !int.TryParse(seekerIdClaim.Value, out var seekerId))
            {
                return Unauthorized(new { error = "Not a job seeker" });
            }

            var prefs = await _db.SeekerPreferences
                .FirstOrDefaultAsync(sp => sp.SeekerId == seekerId);

            if (prefs == null)
            {
                // Return default preferences
                return Ok(new PreferencesResponse
                {
                    JobCategoryPriority = "None",
                    WorkSettingPriority = "None",
                    SalaryPriority = "None",
                    TravelRequirementsPriority = "None",
                    CompanySizePriority = "None",
                    EmploymentTypePriority = "None"
                });
            }

            // Deserialize JSON fields
            List<string>? cities = null;
            List<CityCoordinates>? cityCoords = null;

            if (!string.IsNullOrEmpty(prefs.PreferredCities))
            {
                try
                {
                    cities = JsonSerializer.Deserialize<List<string>>(prefs.PreferredCities);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error deserializing PreferredCities");
                }
            }

            if (!string.IsNullOrEmpty(prefs.CityLatLongs))
            {
                try
                {
                    cityCoords = JsonSerializer.Deserialize<List<CityCoordinates>>(prefs.CityLatLongs);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error deserializing CityLatLongs");
                }
            }

            return Ok(new PreferencesResponse
            {
                Id = prefs.Id,
                JobCategory = prefs.JobCategory,
                JobCategoryPriority = prefs.JobCategoryPriority,
                WorkSetting = prefs.WorkSetting,
                WorkSettingPriority = prefs.WorkSettingPriority,
                PreferredCities = cities,
                CityLatLongs = cityCoords,
                Salary = prefs.Salary,
                SalaryPriority = prefs.SalaryPriority,
                TravelRequirements = prefs.TravelRequirements,
                TravelRequirementsPriority = prefs.TravelRequirementsPriority,
                CompanySize = prefs.CompanySize,
                CompanySizePriority = prefs.CompanySizePriority,
                EmploymentType = prefs.EmploymentType,
                EmploymentTypePriority = prefs.EmploymentTypePriority,
                CreatedAt = prefs.CreatedAt,
                UpdatedAt = prefs.UpdatedAt
            });
        }

        // POST: api/SeekerPreferences
        [HttpPost]
        public async Task<IActionResult> SavePreferences([FromBody] SavePreferencesRequest request)
        {
            var seekerIdClaim = User.Claims.FirstOrDefault(c => c.Type == "seekerId");
            if (seekerIdClaim == null || !int.TryParse(seekerIdClaim.Value, out var seekerId))
            {
                return Unauthorized(new { error = "Not a job seeker" });
            }

            _logger.LogInformation("=== SAVING SEEKER PREFERENCES ===");
            _logger.LogInformation("SeekerId: {SeekerId}", seekerId);
            _logger.LogInformation("Request: JobCat={Cat} (Pri={CatPri}), WorkSetting={Work} (Pri={WorkPri}), Cities={Cities}", 
                request.JobCategory, request.JobCategoryPriority, request.WorkSetting, request.WorkSettingPriority, 
                request.PreferredCities != null ? string.Join("|", request.PreferredCities) : "null");

            var seeker = await _db.Seekers.FindAsync(seekerId);
            if (seeker == null)
            {
                return NotFound(new { error = "Seeker not found" });
            }

            // Normalize priorities: if value is empty/null, default to "None"; otherwise use the provided priority
            var normalizedJobCatPri = string.IsNullOrEmpty(request.JobCategory) ? "None" : request.JobCategoryPriority;
            var normalizedWorkPri = string.IsNullOrEmpty(request.WorkSetting) ? "None" : request.WorkSettingPriority;
            var normalizedSalaryPri = string.IsNullOrEmpty(request.Salary) ? "None" : request.SalaryPriority;
            var normalizedTravelPri = string.IsNullOrEmpty(request.TravelRequirements) ? "None" : request.TravelRequirementsPriority;
            var normalizedCompanyPri = string.IsNullOrEmpty(request.CompanySize) ? "None" : request.CompanySizePriority;
            var normalizedEmpPri = string.IsNullOrEmpty(request.EmploymentType) ? "None" : request.EmploymentTypePriority;

            _logger.LogInformation("[Normalization] Priorities normalized based on values: JobCat={JobCat}, Work={Work}, Salary={Salary}, Travel={Travel}, Company={Company}, Emp={Emp}",
                normalizedJobCatPri, normalizedWorkPri, normalizedSalaryPri, normalizedTravelPri, normalizedCompanyPri, normalizedEmpPri);

            // Geocode cities if provided
            List<CityCoordinates>? cityCoordinates = null;
            if (request.PreferredCities != null && request.PreferredCities.Any())
            {
                // Limit to 3 cities
                var citiesToGeocode = request.PreferredCities.Take(3).ToList();
                cityCoordinates = new List<CityCoordinates>();

                foreach (var cityName in citiesToGeocode)
                {
                    if (string.IsNullOrWhiteSpace(cityName)) continue;

                    try
                    {
                        // Extract city and state if format is "City, State"
                        var parts = cityName.Split(',');
                        var city = parts[0].Trim();
                        var state = parts.Length > 1 ? parts[1].Trim() : seeker.State;

                        var (lat, lon) = await _geocodingService.GetCoordinatesAsync(city, state);
                        
                        cityCoordinates.Add(new CityCoordinates
                        {
                            City = cityName,
                            Latitude = lat,
                            Longitude = lon
                        });
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, $"Failed to geocode city: {cityName}");
                        // Add city without coordinates
                        cityCoordinates.Add(new CityCoordinates
                        {
                            City = cityName,
                            Latitude = null,
                            Longitude = null
                        });
                    }
                }
            }

            // Find existing preferences or create new
            var prefs = await _db.SeekerPreferences
                .FirstOrDefaultAsync(sp => sp.SeekerId == seekerId);

            if (prefs == null)
            {
                // Create new preferences
                prefs = new SeekerPreferences
                {
                    SeekerId = seekerId,
                    JobCategory = request.JobCategory,
                    JobCategoryPriority = normalizedJobCatPri,
                    WorkSetting = request.WorkSetting,
                    WorkSettingPriority = normalizedWorkPri,
                    PreferredCities = request.PreferredCities != null && request.PreferredCities.Any() 
                        ? JsonSerializer.Serialize(request.PreferredCities.Take(3)) 
                        : null,
                    CityLatLongs = cityCoordinates != null && cityCoordinates.Any() 
                        ? JsonSerializer.Serialize(cityCoordinates) 
                        : null,
                    Salary = request.Salary,
                    SalaryPriority = normalizedSalaryPri,
                    TravelRequirements = request.TravelRequirements,
                    TravelRequirementsPriority = normalizedTravelPri,
                    CompanySize = request.CompanySize,
                    CompanySizePriority = normalizedCompanyPri,
                    EmploymentType = request.EmploymentType,
                    EmploymentTypePriority = normalizedEmpPri,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.SeekerPreferences.Add(prefs);
            }
            else
            {
                // Update existing preferences
                prefs.JobCategory = request.JobCategory;
                prefs.JobCategoryPriority = normalizedJobCatPri;
                prefs.WorkSetting = request.WorkSetting;
                prefs.WorkSettingPriority = normalizedWorkPri;
                prefs.PreferredCities = request.PreferredCities != null && request.PreferredCities.Any() 
                    ? JsonSerializer.Serialize(request.PreferredCities.Take(3)) 
                    : null;
                prefs.CityLatLongs = cityCoordinates != null && cityCoordinates.Any() 
                    ? JsonSerializer.Serialize(cityCoordinates) 
                    : null;
                prefs.Salary = request.Salary;
                prefs.SalaryPriority = normalizedSalaryPri;
                prefs.TravelRequirements = request.TravelRequirements;
                prefs.TravelRequirementsPriority = normalizedTravelPri;
                prefs.CompanySize = request.CompanySize;
                prefs.CompanySizePriority = normalizedCompanyPri;
                prefs.EmploymentType = request.EmploymentType;
                prefs.EmploymentTypePriority = normalizedEmpPri;
                prefs.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();

            _logger.LogInformation("=== PREFERENCES SAVED SUCCESSFULLY ===");
            _logger.LogInformation("Stored: JobCat={Cat} (Pri={CatPri}), WorkSetting={Work} (Pri={WorkPri}), CityLatLongs={Cities}",
                prefs.JobCategory, prefs.JobCategoryPriority, prefs.WorkSetting, prefs.WorkSettingPriority, prefs.CityLatLongs);

            return Ok(new { message = "Preferences saved successfully", id = prefs.Id });
        }
    }
}
