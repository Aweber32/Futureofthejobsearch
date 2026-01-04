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
        // Grouped job categories to support "Flexible" matching by related category bucket
        private static readonly Dictionary<string, int> JobCategoryGroups = new(StringComparer.OrdinalIgnoreCase)
        {
            // Software / Data / Engineering (1)
            ["Software Engineering"] = 1, ["Data Engineering"] = 1, ["Data Science & Machine Learning"] = 1,
            ["Analytics & Business Intelligence"] = 1, ["Cloud & DevOps"] = 1, ["Cybersecurity"] = 1,
            ["IT Infrastructure & Networking"] = 1, ["QA & Test Engineering"] = 1, ["Mobile Development"] = 1,
            ["Game Development"] = 1,

            // Product / Design (2)
            ["Product Management"] = 2, ["Program & Project Management"] = 2, ["UX / UI Design"] = 2,
            ["User Research"] = 2, ["Technical Product Management"] = 2,

            // Strategy / Ops / Finance (3)
            ["Business Operations"] = 3, ["Strategy & Management Consulting"] = 3, ["Finance & Accounting"] = 3,
            ["Risk, Compliance & Audit"] = 3, ["Supply Chain & Logistics"] = 3, ["Procurement & Vendor Management"] = 3,

            // Sales / Marketing / Growth (4)
            ["Sales & Business Development"] = 4, ["Account Management & Customer Success"] = 4,
            ["Marketing & Growth"] = 4, ["Digital Marketing & SEO"] = 4, ["Content Marketing & Brand"] = 4,

            // People / Legal / Admin (5)
            ["Human Resources & Recruiting"] = 5, ["People Operations & Culture"] = 5, ["Legal & Corporate Affairs"] = 5,
            ["Office Administration"] = 5, ["Legal & Contracts"] = 5,

            // Healthcare & Life Sciences (6)
            ["Clinical Healthcare"] = 6, ["Clinical & Patient Care"] = 6, ["Healthcare Administration"] = 6,
            ["Health Informatics & Analytics"] = 6, ["Biomedical Engineering"] = 6,
            ["Pharmaceuticals & Research"] = 6, ["Medical Research & Biotech"] = 6,
            ["Pharmaceutical & Life Sciences"] = 6,

            // Creative / Media / Communications (7)
            ["Creative & Visual Design"] = 7, ["Creative Direction & Brand Design"] = 7,
            ["Content Writing & Editing"] = 7, ["Content Creation & Copywriting"] = 7,
            ["Media Production (Video / Audio)"] = 7, ["Media Production & Editing"] = 7,
            ["Public Relations & Communications"] = 7, ["Entertainment & Gaming"] = 7,

            // Industry / Field Roles (8)
            ["Manufacturing & Industrial Engineering"] = 8, ["Manufacturing & Engineering"] = 8,
            ["Construction & Facilities Management"] = 8, ["Construction & Real Estate"] = 8,
            ["Energy & Utilities"] = 8, ["Environmental & Sustainability"] = 8, ["Government & Public Sector"] = 8,
            ["Education & Training"] = 8,

            // Additional mapped categories used elsewhere in the app
            ["Retail & E-commerce"] = 8, ["Hospitality & Tourism"] = 8, ["Transportation & Logistics"] = 8,
            ["Agriculture & Food Services"] = 8, ["Nonprofit & Social Services"] = 8
        };

        private record BoundingBox(double MinLat, double MaxLat, double MinLon, double MaxLon);
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

            _logger.LogInformation("=== POSITIONS LIST REQUEST ===");
            _logger.LogInformation("User authenticated: {IsAuth}", User.Identity?.IsAuthenticated ?? false);
            _logger.LogInformation("SeekerId from claims: {SeekerId}", seekerId);
            _logger.LogInformation("All claims: {Claims}", string.Join(", ", User.Claims.Select(c => $"{c.Type}={c.Value}")));

            // Start with base query
            IQueryable<Position> query = _db.Positions
                .Include(p => p.Employer)
                .Include(p => p.Educations)
                .Include(p => p.Experiences)
                .Include(p => p.SkillsList);

            // Apply pre-filtering based on seeker preferences if seeker is authenticated
            SeekerPreferences? prefs = null;
            if (seekerId.HasValue)
            {
                prefs = await _db.SeekerPreferences
                    .FirstOrDefaultAsync(sp => sp.SeekerId == seekerId.Value);

                if (prefs != null)
                {
                    _logger.LogInformation("=== SEEKER PREFERENCES FOR ID {SeekerId} ===", seekerId);
                    _logger.LogInformation("JobCategory: {Cat} (Priority: {CatPri})", prefs.JobCategory, prefs.JobCategoryPriority);
                    _logger.LogInformation("WorkSetting: {Work} (Priority: {WorkPri})", prefs.WorkSetting, prefs.WorkSettingPriority);
                    _logger.LogInformation("CityLatLongs: {Cities}", prefs.CityLatLongs);
                    _logger.LogInformation("Salary: {Sal} (Priority: {SalPri})", prefs.Salary, prefs.SalaryPriority);
                    _logger.LogInformation("TravelRequirements: {Travel} (Priority: {TravelPri})", prefs.TravelRequirements, prefs.TravelRequirementsPriority);
                    
                    query = ApplyPreferences(query, prefs);
                }
                else
                {
                    _logger.LogInformation("No preferences found for SeekerId {SeekerId}", seekerId);
                }
            }
            else
            {
                _logger.LogInformation("No seekerId in claims - returning unfiltered positions");
            }

            // Log the SQL query BEFORE executing it
            _logger.LogInformation("=== EXECUTING SQL QUERY ===");
            _logger.LogInformation("Final SQL: {Query}", query.ToQueryString());

            var positions = await query
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
            
            _logger.LogInformation("=== POSITIONS FROM DATABASE ===");
            _logger.LogInformation("Count returned from DB: {Count}", positions.Count);
            foreach (var p in positions.Take(5))
            {
                _logger.LogInformation("  ID: {Id}, Title: {Title}, WorkSetting: {Work}, Lat: {Lat}, Lon: {Lon}", 
                    p.Id, p.Title, p.WorkSetting, p.Latitude, p.Longitude);
            }

            // Fail-closed in-memory geo filter to ensure Hybrid / In-Person respect preferred cities
            if (prefs != null && prefs.WorkSettingPriority != "None")
            {
                _logger.LogInformation("=== APPLYING GEO POST-FILTER ===");
                _logger.LogInformation("Positions before geo filter: {Count}", positions.Count);
                positions = ApplyGeoPostFilter(positions, prefs);
                _logger.LogInformation("Positions after geo filter: {Count}", positions.Count);
            }

            return Ok(positions);
        }

        private IQueryable<Position> ApplyPreferences(IQueryable<Position> query, SeekerPreferences prefs)
        {
            // Normalize work settings list (comma-separated in DB)
            var workSettings = (prefs.WorkSetting ?? "")
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(s => s.Trim())
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .ToList();

            var wantsRemote = workSettings.Any(ws => ws.Equals("Remote", StringComparison.OrdinalIgnoreCase));
            var wantsHybrid = workSettings.Any(ws => ws.Equals("Hybrid", StringComparison.OrdinalIgnoreCase));
            var wantsInPerson = workSettings.Any(ws =>
                ws.Equals("In-Person", StringComparison.OrdinalIgnoreCase) ||
                ws.Equals("In Person", StringComparison.OrdinalIgnoreCase) ||
                ws.Equals("In-Office", StringComparison.OrdinalIgnoreCase) ||
                ws.Equals("On-site", StringComparison.OrdinalIgnoreCase) ||
                ws.Equals("On-Site", StringComparison.OrdinalIgnoreCase));

            // JOB CATEGORY
            if (!string.IsNullOrEmpty(prefs.JobCategory))
            {
                if (prefs.JobCategoryPriority == "DealBreaker")
                {
                    query = query.Where(p => p.Category == prefs.JobCategory);
                }
                else if (prefs.JobCategoryPriority == "Flexible")
                {
                    if (JobCategoryGroups.TryGetValue(prefs.JobCategory, out var groupId))
                    {
                        var sameGroupCategories = JobCategoryGroups
                            .Where(kvp => kvp.Value == groupId)
                            .Select(kvp => kvp.Key)
                            .ToHashSet(StringComparer.OrdinalIgnoreCase);

                        query = query.Where(p => sameGroupCategories.Contains(p.Category));
                    }
                }
                // Priority "None" = no filter
            }

            // WORK SETTING - Skip entirely when priority is None
            // DealBreaker/Flexible: constrain to selected work settings; geo radius handled in post-filter
            _logger.LogInformation("WorkSetting filter: priority={Priority}, settings=[{Settings}]",
                prefs.WorkSettingPriority, prefs.WorkSetting);

            if (prefs.WorkSettingPriority != "None" && workSettings.Any())
            {
                query = query.Where(p =>
                    (wantsRemote && p.WorkSetting == "Remote")
                    || (wantsHybrid && p.WorkSetting == "Hybrid")
                    || (wantsInPerson && (p.WorkSetting == "In-Person" || p.WorkSetting == "In Person" ||
                                          p.WorkSetting == "In-Office" || p.WorkSetting == "On-site" ||
                                          p.WorkSetting == "On-Site"))
                );

                _logger.LogInformation("Applied work setting SQL filter: Remote={Remote}, Hybrid={Hybrid}, InPerson={InPerson}",
                    wantsRemote, wantsHybrid, wantsInPerson);
            }

            // EMPLOYMENT TYPE (DealBreaker only)
            if (!string.IsNullOrEmpty(prefs.EmploymentType) && prefs.EmploymentTypePriority == "DealBreaker")
            {
                query = query.Where(p => p.EmploymentType == prefs.EmploymentType);
            }

            // TRAVEL (DealBreaker only)
            if (!string.IsNullOrEmpty(prefs.TravelRequirements) && prefs.TravelRequirementsPriority == "DealBreaker")
            {
                query = query.Where(p => p.TravelRequirements == prefs.TravelRequirements);
            }

            // COMPANY SIZE (DealBreaker only)
            if (!string.IsNullOrEmpty(prefs.CompanySize) && prefs.CompanySizePriority == "DealBreaker")
            {
                if (Enum.TryParse<CompanySize>(prefs.CompanySize, out var companySizeEnum))
                {
                    query = query.Where(p => p.Employer != null && p.Employer.CompanySize == companySizeEnum);
                }
            }

            // SALARY (normalize all amounts to annual for comparison)
            decimal? preferredMin = ParseSalaryMinimum(prefs.Salary);
            if (preferredMin.HasValue)
            {
                var minAnnual = preferredMin.Value;

                if (prefs.SalaryPriority == "DealBreaker")
                {
                    query = query.Where(p =>
                        (p.SalaryMin.HasValue && (
                            ((p.SalaryType == null || p.SalaryType == "Annual") && p.SalaryMin.Value >= minAnnual) ||
                            (p.SalaryType == "Monthly" && p.SalaryMin.Value * 12m >= minAnnual) ||
                            (p.SalaryType == "Hourly" && p.SalaryMin.Value * 2080m >= minAnnual)
                        )) ||
                        (p.SalaryValue.HasValue && (
                            ((p.SalaryType == null || p.SalaryType == "Annual") && p.SalaryValue.Value >= minAnnual) ||
                            (p.SalaryType == "Monthly" && p.SalaryValue.Value * 12m >= minAnnual) ||
                            (p.SalaryType == "Hourly" && p.SalaryValue.Value * 2080m >= minAnnual)
                        )) ||
                        (p.SalaryMax.HasValue && (
                            ((p.SalaryType == null || p.SalaryType == "Annual") && p.SalaryMax.Value >= minAnnual) ||
                            (p.SalaryType == "Monthly" && p.SalaryMax.Value * 12m >= minAnnual) ||
                            (p.SalaryType == "Hourly" && p.SalaryMax.Value * 2080m >= minAnnual)
                        ))
                    );
                }
                else if (prefs.SalaryPriority == "Flexible")
                {
                    var flexibleFloor = Math.Max(0, minAnnual - 30000m);
                    query = query.Where(p =>
                        (p.SalaryMin.HasValue && (
                            ((p.SalaryType == null || p.SalaryType == "Annual") && p.SalaryMin.Value >= flexibleFloor) ||
                            (p.SalaryType == "Monthly" && p.SalaryMin.Value * 12m >= flexibleFloor) ||
                            (p.SalaryType == "Hourly" && p.SalaryMin.Value * 2080m >= flexibleFloor)
                        )) ||
                        (p.SalaryValue.HasValue && (
                            ((p.SalaryType == null || p.SalaryType == "Annual") && p.SalaryValue.Value >= flexibleFloor) ||
                            (p.SalaryType == "Monthly" && p.SalaryValue.Value * 12m >= flexibleFloor) ||
                            (p.SalaryType == "Hourly" && p.SalaryValue.Value * 2080m >= flexibleFloor)
                        )) ||
                        (p.SalaryMax.HasValue && (
                            ((p.SalaryType == null || p.SalaryType == "Annual") && p.SalaryMax.Value >= flexibleFloor) ||
                            (p.SalaryType == "Monthly" && p.SalaryMax.Value * 12m >= flexibleFloor) ||
                            (p.SalaryType == "Hourly" && p.SalaryMax.Value * 2080m >= flexibleFloor)
                        ))
                    );
                }
                // None = no salary filter
            }

            return query;
        }

        // In-memory safeguard to ensure Hybrid/In-Person positions are within preferred city radius
        private List<Position> ApplyGeoPostFilter(List<Position> positions, SeekerPreferences prefs)
        {
            // If priority is None, skip geo filtering entirely
            if (string.Equals(prefs.WorkSettingPriority, "None", StringComparison.OrdinalIgnoreCase))
                return positions;

            var workSettings = (prefs.WorkSetting ?? "")
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(s => s.Trim())
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .ToList();

            var wantsRemote = workSettings.Any(ws => ws.Equals("Remote", StringComparison.OrdinalIgnoreCase));
            var wantsHybrid = workSettings.Any(ws => ws.Equals("Hybrid", StringComparison.OrdinalIgnoreCase));
            var wantsInPerson = workSettings.Any(ws =>
                ws.Equals("In-Person", StringComparison.OrdinalIgnoreCase) ||
                ws.Equals("In Person", StringComparison.OrdinalIgnoreCase) ||
                ws.Equals("In-Office", StringComparison.OrdinalIgnoreCase) ||
                ws.Equals("On-site", StringComparison.OrdinalIgnoreCase) ||
                ws.Equals("On-Site", StringComparison.OrdinalIgnoreCase));

            if (!wantsRemote && !wantsHybrid && !wantsInPerson)
                return positions; // nothing to do

            // Radius depends on priority: DealBreaker => 50mi, Flexible => 300mi
            double radiusMiles = 90.0;
            if (string.Equals(prefs.WorkSettingPriority, "DealBreaker", StringComparison.OrdinalIgnoreCase)) radiusMiles = 50.0;
            else if (string.Equals(prefs.WorkSettingPriority, "Flexible", StringComparison.OrdinalIgnoreCase)) radiusMiles = 300.0;

            var inPersonSettings = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            { "In-Office", "On-site", "On-Site", "In-Person", "In Person" };

            List<BoundingBox> cityBoxes = new();
            if ((wantsHybrid || wantsInPerson) && !string.IsNullOrEmpty(prefs.CityLatLongs))
            {
                try
                {
                    var cityCoords = System.Text.Json.JsonSerializer.Deserialize<List<DTOs.CityCoordinates>>(prefs.CityLatLongs ?? "[]")
                        ?? new List<DTOs.CityCoordinates>();

                    foreach (var coord in cityCoords.Where(c => c.Latitude.HasValue && c.Longitude.HasValue))
                    {
                        var lat = coord.Latitude!.Value;
                        var lon = coord.Longitude!.Value;

                        var latDelta = radiusMiles / 69.0;
                        var cosLat = Math.Cos(lat * Math.PI / 180.0);
                        var lonDelta = cosLat > 0.0001 ? radiusMiles / (69.172 * cosLat) : 180.0;

                        var box = new BoundingBox(
                            MinLat: lat - latDelta,
                            MaxLat: lat + latDelta,
                            MinLon: lon - lonDelta,
                            MaxLon: lon + lonDelta
                        );
                        cityBoxes.Add(box);

                        _logger.LogInformation($"[PostFilter] Box for {coord.City}: Lat [{box.MinLat:F2}-{box.MaxLat:F2}], Lon [{box.MinLon:F2}-{box.MaxLon:F2}]");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[PostFilter] Failed to parse city coordinates for filtering");
                }
            }

            var hasGeoBoxes = cityBoxes.Any();

            // If hybrid/in-person requested but no geocoded cities, fail closed (cannot satisfy distance rule)
            if ((wantsHybrid || wantsInPerson) && !hasGeoBoxes && !wantsRemote)
            {
                _logger.LogWarning("[PostFilter] No geo boxes available for Hybrid/In-Person filter - returning empty");
                return new List<Position>();
            }

            _logger.LogInformation("[PostFilter] Filtering {Count} positions with wantsRemote={Remote}, wantsHybrid={Hybrid}, wantsInPerson={InPerson}, boxes={Boxes}",
                positions.Count, wantsRemote, wantsHybrid, wantsInPerson, cityBoxes.Count);

            var filtered = positions.Where(p =>
                // Remote allowed regardless of geo (if selected)
                (wantsRemote && string.Equals(p.WorkSetting, "Remote", StringComparison.OrdinalIgnoreCase))
                ||
                // Hybrid / In-Person must be within one of the preferred city boxes
                (
                    (wantsHybrid || wantsInPerson)
                    && hasGeoBoxes
                    && p.Latitude.HasValue && p.Longitude.HasValue
                    && cityBoxes.Any(b =>
                        p.Latitude!.Value >= b.MinLat && p.Latitude!.Value <= b.MaxLat &&
                        p.Longitude!.Value >= b.MinLon && p.Longitude!.Value <= b.MaxLon
                    )
                    && (
                        (wantsHybrid && string.Equals(p.WorkSetting, "Hybrid", StringComparison.OrdinalIgnoreCase))
                        || (wantsInPerson && inPersonSettings.Contains(p.WorkSetting ?? string.Empty))
                    )
                )
            ).ToList();

            _logger.LogInformation("[PostFilter] Result: {FilteredCount} positions after geo filter", filtered.Count);
            foreach (var p in filtered.Take(5))
            {
                _logger.LogInformation("  [PostFilter] Kept: ID={Id}, Title={Title}, WorkSetting={Work}, Lat={Lat}, Lon={Lon}",
                    p.Id, p.Title, p.WorkSetting, p.Latitude, p.Longitude);
            }

            return filtered;
        }

        private static decimal? ParseSalaryMinimum(string? salary)
        {
            if (string.IsNullOrWhiteSpace(salary)) return null;

            // Accept formats like "Annual: $100,000 - $120,000", "Hourly: $40+", "Monthly: Up to $8,000"
            var match = System.Text.RegularExpressions.Regex.Match(salary, @"\$?([\d,]+)");
            if (!match.Success) return null;
            if (!decimal.TryParse(match.Groups[1].Value.Replace(",", ""), out var minVal)) return null;
            return minVal;
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
