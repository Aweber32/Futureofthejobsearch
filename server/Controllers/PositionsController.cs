using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FutureOfTheJobSearch.Server.Data;
using FutureOfTheJobSearch.Server.DTOs;
using FutureOfTheJobSearch.Server.Models;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System;
using System.Linq;
using FutureOfTheJobSearch.Server.Services;

namespace FutureOfTheJobSearch.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PositionsController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<PositionsController> _logger;
        private readonly IConfiguration _config;
        private readonly IEmbeddingQueueService _embeddingQueue;
        private readonly IGeocodingService _geocodingService;

        public PositionsController(ApplicationDbContext db, ILogger<PositionsController> logger, IConfiguration config, IEmbeddingQueueService embeddingQueue, IGeocodingService geocodingService)
        {
            _db = db;
            _logger = logger;
            _config = config;
            _embeddingQueue = embeddingQueue;
            _geocodingService = geocodingService;
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

                // Copy employer's geolocation to position
                var employer = await _db.Employers.AsNoTracking().FirstOrDefaultAsync(e => e.Id == employerId);
                if (employer != null)
                {
                    pos.Latitude = employer.Latitude;
                    pos.Longitude = employer.Longitude;
                }

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

                // Queue embedding generation request
                try
                {
                    await _embeddingQueue.QueueEmbeddingRequestAsync("Position", pos.Id);
                }
                catch (Exception ex)
                {
                    // Log but don't block position creation on queue failure
                    _logger.LogWarning(ex, "Failed to queue embedding for Position {PositionId}", pos.Id);
                }

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
            // Get seeker ID from claims if authenticated
            int? seekerId = null;
            var seekerClaim = User.Claims.FirstOrDefault(c => c.Type == "seekerId");
            if (seekerClaim != null && int.TryParse(seekerClaim.Value, out var sid))
            {
                seekerId = sid;
            }

            // Start with base query
            IQueryable<Position> query = _db.Positions
                .Include(p => p.Employer)
                .Include(p => p.Educations)
                .Include(p => p.Experiences)
                .Include(p => p.SkillsList);

            // Apply pre-filtering based on seeker preferences if seeker is authenticated
            if (seekerId.HasValue)
            {
                var prefs = await _db.SeekerPreferences
                    .FirstOrDefaultAsync(sp => sp.SeekerId == seekerId.Value);

                if (prefs != null)
                {
                    query = ApplyPreferences(query, prefs);
                }
            }

            var positions = await query
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return Ok(positions);
        }

        private IQueryable<Position> ApplyPreferences(IQueryable<Position> query, SeekerPreferences prefs)
        {
            // Job Category filtering
            if (!string.IsNullOrEmpty(prefs.JobCategory) && prefs.JobCategoryPriority == "DealBreaker")
            {
                query = query.Where(p => p.Category == prefs.JobCategory);
            }

            // Work Setting filtering
            if (!string.IsNullOrEmpty(prefs.WorkSetting) && prefs.WorkSettingPriority == "DealBreaker")
            {
                var workSettings = prefs.WorkSetting.Split(',').Select(s => s.Trim()).ToList();
                query = query.Where(p => workSettings.Contains(p.WorkSetting));
            }

            // Employment Type filtering
            if (!string.IsNullOrEmpty(prefs.EmploymentType) && prefs.EmploymentTypePriority == "DealBreaker")
            {
                query = query.Where(p => p.EmploymentType == prefs.EmploymentType);
            }

            // Travel Requirements filtering
            if (!string.IsNullOrEmpty(prefs.TravelRequirements) && prefs.TravelRequirementsPriority == "DealBreaker")
            {
                query = query.Where(p => p.TravelRequirements == prefs.TravelRequirements);
            }

            // Company Size filtering (requires join with Employer)
            if (!string.IsNullOrEmpty(prefs.CompanySize) && prefs.CompanySizePriority == "DealBreaker")
            {
                // Parse string to enum
                if (Enum.TryParse<CompanySize>(prefs.CompanySize, out var companySizeEnum))
                {
                    query = query.Where(p => p.Employer != null && p.Employer.CompanySize == companySizeEnum);
                }
            }

            // Salary filtering - only apply if Deal Breaker
            // This is complex as we need to parse salary strings, so we'll do basic filtering
            if (!string.IsNullOrEmpty(prefs.Salary) && prefs.SalaryPriority == "DealBreaker")
            {
                // Try to extract min salary from preferences (e.g., "$100,000 - $120,000")
                var salaryMatch = System.Text.RegularExpressions.Regex.Match(prefs.Salary, @"\$?([\d,]+)");
                if (salaryMatch.Success && decimal.TryParse(salaryMatch.Groups[1].Value.Replace(",", ""), out var minSalary))
                {
                    // Filter positions where SalaryMin or SalaryMax is >= preferred minimum
                    query = query.Where(p => 
                        (p.SalaryMin.HasValue && p.SalaryMin >= minSalary) ||
                        (p.SalaryMax.HasValue && p.SalaryMax >= minSalary) ||
                        (p.SalaryValue.HasValue && p.SalaryValue >= minSalary)
                    );
                }
            }

            // Location/City filtering - only if preferences include cities and Work Setting includes Hybrid or In-Person
            if (!string.IsNullOrEmpty(prefs.PreferredCities) && 
                !string.IsNullOrEmpty(prefs.WorkSetting) &&
                (prefs.WorkSetting.Contains("Hybrid") || prefs.WorkSetting.Contains("In-Person")))
            {
                try
                {
                    var cityCoords = System.Text.Json.JsonSerializer.Deserialize<List<DTOs.CityCoordinates>>(prefs.CityLatLongs ?? "[]");
                    if (cityCoords != null && cityCoords.Any(c => c.Latitude.HasValue && c.Longitude.HasValue))
                    {
                        // For now, we'll do a simple coordinate-based filter
                        // In production, you'd want to calculate distance using Haversine formula
                        // This filters positions that have coordinates within a reasonable range
                        var validCoords = cityCoords.Where(c => c.Latitude.HasValue && c.Longitude.HasValue).ToList();
                        if (validCoords.Any())
                        {
                            // Simple bounding box filter (within ~50 miles = ~0.75 degrees latitude/longitude)
                            const double rangeDegrees = 0.75;
                            query = query.Where(p => 
                                p.Latitude.HasValue && p.Longitude.HasValue &&
                                validCoords.Any(coord =>
                                    Math.Abs(p.Latitude.Value - coord.Latitude!.Value) <= rangeDegrees &&
                                    Math.Abs(p.Longitude.Value - coord.Longitude!.Value) <= rangeDegrees
                                )
                            );
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to parse city coordinates for filtering");
                }
            }

            return query;
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

            // If user is authenticated as an employer, verify they own this position
            var employerClaim = User.Claims.FirstOrDefault(c => c.Type == "employerId");
            if (employerClaim != null && !string.IsNullOrEmpty(employerClaim.Value))
            {
                if (int.TryParse(employerClaim.Value, out var employerId))
                {
                    if (pos.EmployerId != employerId)
                    {
                        // Employer trying to access another employer's position - return sanitized view
                        return Ok(new
                        {
                            id = pos.Id,
                            title = pos.Title,
                            category = pos.Category,
                            description = pos.Description,
                            employmentType = pos.EmploymentType,
                            workSetting = pos.WorkSetting,
                            isOpen = pos.IsOpen
                            // Don't include sensitive employer details
                        });
                    }
                }
            }

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

                // Queue embedding generation request
                try
                {
                    await _embeddingQueue.QueueEmbeddingRequestAsync("Position", id);
                }
                catch (Exception ex)
                {
                    // Log but don't block position update on queue failure
                    _logger.LogWarning(ex, "Failed to queue embedding for Position {PositionId}", id);
                }

                return Ok(new { message = "Position updated" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Update position failed");
                return StatusCode(500, new { error = "Server error" });
            }
        }

        // Issue a time-limited share link token for a specific position (job posting)
        // Allow any authenticated user (employer or seeker) to share OPEN positions.
        // Ownership is not required for open positions — this supports seekers sharing jobs while browsing.
        [HttpPost("share-link/{id:int}")]
        [Authorize]
        public async Task<IActionResult> CreateShareLinkForPosition([FromRoute] int id)
        {
            var pos = await _db.Positions.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
            if (pos == null) return NotFound(new { error = "Position not found" });
            if (!pos.IsOpen) return BadRequest(new { error = "Position is not visible. Open the position before sharing." });

            var jwtKey = _config["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY");
            var jwtIssuer = _config["Jwt:Issuer"] ?? Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "futureofthejobsearch";
            if (string.IsNullOrEmpty(jwtKey)) return StatusCode(500, new { error = "JWT signing key not configured" });

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var days = 7;
            if (int.TryParse(_config["Sharing:PositionDays"] ?? Environment.GetEnvironmentVariable("SHARING__POSITIONDAYS"), out var cfgDays) && cfgDays > 0)
                days = cfgDays;

            var claims = new[]
            {
                new Claim("typ", "public-position"),
                new Claim("pid", pos.Id.ToString()),
            };

            var token = new JwtSecurityToken(
                issuer: jwtIssuer,
                audience: null,
                claims: claims,
                notBefore: DateTime.UtcNow.AddMinutes(-2),
                expires: DateTime.UtcNow.AddDays(days),
                signingCredentials: creds
            );

            var handler = new JwtSecurityTokenHandler();
            var t = handler.WriteToken(token);

            var frontendBase = _config["FrontendBaseUrl"] ?? Environment.GetEnvironmentVariable("FRONTEND_BASE_URL") ?? "http://localhost:3000";
            var url = $"{frontendBase.TrimEnd('/')}/share/position?t={Uri.EscapeDataString(t)}";
            return Ok(new { url, expiresDays = days });
        }

        // Public, unauthenticated job posting preview by share token
        [HttpGet("public/by-token")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicPositionByToken([FromQuery] string t)
        {
            if (string.IsNullOrWhiteSpace(t)) return BadRequest(new { error = "Missing token" });

            var jwtKey = _config["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY");
            var jwtIssuer = _config["Jwt:Issuer"] ?? Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "futureofthejobsearch";
            if (string.IsNullOrEmpty(jwtKey)) return StatusCode(500, new { error = "JWT signing key not configured" });

            var handler = new JwtSecurityTokenHandler();
            try
            {
                var principal = handler.ValidateToken(t, new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwtIssuer,
                    ValidateAudience = false,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                    ClockSkew = TimeSpan.FromMinutes(1)
                }, out var _);

                var typ = principal.FindFirst("typ")?.Value;
                var pid = principal.FindFirst("pid")?.Value;
                if (typ != "public-position" || string.IsNullOrEmpty(pid)) return Unauthorized(new { error = "Invalid token" });
                if (!int.TryParse(pid, out var positionId)) return Unauthorized(new { error = "Invalid token subject" });

                var pos = await _db.Positions
                    .AsNoTracking()
                    .Include(p => p.Educations)
                    .Include(p => p.Experiences)
                    .Include(p => p.SkillsList)
                    .Include(p => p.Employer)
                    .FirstOrDefaultAsync(p => p.Id == positionId);
                if (pos == null) return NotFound(new { error = "Position not found" });
                if (!pos.IsOpen) return Unauthorized(new { error = "Position is not publicly available" });

                var dto = new PublicPositionDto
                {
                    Id = pos.Id,
                    Title = pos.Title,
                    Category = pos.Category,
                    Description = pos.Description,
                    EmploymentType = pos.EmploymentType,
                    WorkSetting = pos.WorkSetting,
                    TravelRequirements = pos.TravelRequirements,
                    SalaryType = pos.SalaryType,
                    SalaryValue = pos.SalaryValue,
                    SalaryMin = pos.SalaryMin,
                    SalaryMax = pos.SalaryMax,
                    PosterVideoUrl = pos.PosterVideoUrl,
                    Skills = pos.SkillsList?.Select(s => s.Skill).ToArray() ?? Array.Empty<string>(),
                    EducationLevels = pos.Educations?.Select(e => e.Education).ToArray() ?? Array.Empty<string>(),
                    Experiences = pos.Experiences?.Select(x => x.Experience).ToArray() ?? Array.Empty<string>(),
                    EmployerName = pos.Employer?.CompanyName,
                    EmployerLogoUrl = pos.Employer?.LogoUrl,
                    EmployerCity = pos.Employer?.City,
                    EmployerState = pos.Employer?.State,
                    EmployerCompanySize = pos.Employer?.CompanySize.HasValue == true ? (int?)pos.Employer.CompanySize.Value : null
                };

                return Ok(dto);
            }
            catch (SecurityTokenException ste)
            {
                return Unauthorized(new { error = "Invalid or expired token", detail = ste.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to validate token", detail = ex.Message });
            }
        }
    }
}
