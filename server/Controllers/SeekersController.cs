using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using FutureOfTheJobSearch.Server.Models;
using FutureOfTheJobSearch.Server.Data;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using System;
using Microsoft.Extensions.Configuration;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using FutureOfTheJobSearch.Server.DTOs;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Linq;
using FutureOfTheJobSearch.Server.Services;
using Azure.Storage.Blobs;
using Azure.Identity;

namespace FutureOfTheJobSearch.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]

    public class SeekersController : ControllerBase
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

            // Additional mapped categories
            ["Retail & E-commerce"] = 8, ["Hospitality & Tourism"] = 8, ["Transportation & Logistics"] = 8,
            ["Agriculture & Food Services"] = 8, ["Nonprofit & Social Services"] = 8
        };

        // Education level hierarchy (lower index = lower education level)
        private static readonly Dictionary<string, int> EducationLevelRank = new(StringComparer.OrdinalIgnoreCase)
        {
            ["None"] = 0,
            ["High School"] = 1,
            ["Associate's"] = 1,
            ["Bachelor's"] = 2,
            ["Bachelors"] = 2,
            ["Master's"] = 3,
            ["Masters"] = 3,
            ["Doctorate"] = 4,
            ["PhD"] = 4
        };

        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly ApplicationDbContext _db;
        private readonly IConfiguration _config;
        private readonly IEmbeddingQueueService _embeddingQueue;
        private readonly IGeocodingService _geocodingService;
        private readonly IEmbeddingSimilarityService _embeddingSimilarity;
        private readonly ILogger<SeekersController> _logger;

        public SeekersController(UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager, ApplicationDbContext db, IConfiguration config, IEmbeddingQueueService embeddingQueue, IGeocodingService geocodingService, IEmbeddingSimilarityService embeddingSimilarity, ILogger<SeekersController> logger)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _db = db;
            _config = config;
            _embeddingQueue = embeddingQueue;
            _geocodingService = geocodingService;
            _embeddingSimilarity = embeddingSimilarity;
            _logger = logger;
        }

        private BlobServiceClient CreateBlobServiceClient()
        {
            var endpoint = _config["BlobEndpoint"] ?? Environment.GetEnvironmentVariable("BLOB_ENDPOINT");
            if (!string.IsNullOrWhiteSpace(endpoint))
            {
                return new BlobServiceClient(new Uri(endpoint), new DefaultAzureCredential());
            }

            var conn = _config.GetConnectionString("BlobConnection") ?? Environment.GetEnvironmentVariable("BLOB_CONNECTION");
            if (!string.IsNullOrWhiteSpace(conn))
            {
                return new BlobServiceClient(conn);
            }

            throw new InvalidOperationException("Blob storage not configured");
        }

        // Issue a time-limited share link token for the current seeker (no DB schema change required)
        [HttpPost("share-link")]
        [Authorize]
        public async Task<IActionResult> CreateShareLink()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (string.IsNullOrEmpty(userId)) return Unauthorized();
            var seeker = await _db.Seekers.AsNoTracking().FirstOrDefaultAsync(s => s.UserId == userId);
            if (seeker == null) return NotFound(new { error = "Seeker not found" });

            if (!seeker.IsProfileActive)
            {
                return BadRequest(new { error = "Profile is inactive. Activate your profile before sharing." });
            }

            var jwtKey = _config["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY");
            var jwtIssuer = _config["Jwt:Issuer"] ?? Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "futureofthejobsearch";
            if (string.IsNullOrEmpty(jwtKey))
            {
                return StatusCode(500, new { error = "JWT signing key not configured" });
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // Default 7 days, configurable via Sharing:SeekerDays or env SHARING__SEEKERDAYS
            var days = 7;
            if (int.TryParse(_config["Sharing:SeekerDays"] ?? Environment.GetEnvironmentVariable("SHARING__SEEKERDAYS"), out var cfgDays) && cfgDays > 0)
                days = cfgDays;

            var claims = new[]
            {
                new Claim("typ", "public-seeker"),
                new Claim("sid", seeker.Id.ToString()),
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
            var url = $"{frontendBase.TrimEnd('/')}/share/seeker?t={Uri.EscapeDataString(t)}";
            return Ok(new { url, expiresDays = days });
        }

        // Issue a time-limited share link token for a specific seeker (for employers viewing candidates)
        [HttpPost("share-link/{seekerId:int}")]
        [Authorize]
        public async Task<IActionResult> CreateShareLinkForSeeker([FromRoute] int seekerId)
        {
            // Must be an authenticated employer to mint links for candidates
            var employerClaim = User.Claims.FirstOrDefault(c => c.Type == "employerId");
            if (employerClaim == null)
            {
                return Forbid();
            }

            var seeker = await _db.Seekers.AsNoTracking().FirstOrDefaultAsync(s => s.Id == seekerId);
            if (seeker == null) return NotFound(new { error = "Seeker not found" });

            if (!seeker.IsProfileActive)
            {
                return BadRequest(new { error = "Profile is inactive. Candidate must activate profile before sharing." });
            }

            var jwtKey = _config["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY");
            var jwtIssuer = _config["Jwt:Issuer"] ?? Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "futureofthejobsearch";
            if (string.IsNullOrEmpty(jwtKey))
            {
                return StatusCode(500, new { error = "JWT signing key not configured" });
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // Default 7 days, configurable via Sharing:SeekerDays
            var days = 7;
            if (int.TryParse(_config["Sharing:SeekerDays"] ?? Environment.GetEnvironmentVariable("SHARING__SEEKERDAYS"), out var cfgDays) && cfgDays > 0)
                days = cfgDays;

            var claims = new[]
            {
                new Claim("typ", "public-seeker"),
                new Claim("sid", seeker.Id.ToString()),
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
            var url = $"{frontendBase.TrimEnd('/')}/share/seeker?t={Uri.EscapeDataString(t)}";
            return Ok(new { url, expiresDays = days });
        }

        // Public, unauthenticated profile preview by share token
        [HttpGet("public/by-token")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicByToken([FromQuery] string t)
        {
            if (string.IsNullOrWhiteSpace(t)) return BadRequest(new { error = "Missing token" });

            var jwtKey = _config["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY");
            var jwtIssuer = _config["Jwt:Issuer"] ?? Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "futureofthejobsearch";
            if (string.IsNullOrEmpty(jwtKey))
            {
                return StatusCode(500, new { error = "JWT signing key not configured" });
            }

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
                var sid = principal.FindFirst("sid")?.Value;
                if (typ != "public-seeker" || string.IsNullOrEmpty(sid)) return Unauthorized(new { error = "Invalid token" });
                if (!int.TryParse(sid, out var seekerId)) return Unauthorized(new { error = "Invalid token subject" });

                var seeker = await _db.Seekers.AsNoTracking().FirstOrDefaultAsync(s => s.Id == seekerId);
                if (seeker == null) return NotFound(new { error = "Seeker not found" });
                if (!seeker.IsProfileActive) return Unauthorized(new { error = "Profile is not publicly available" });

                var dto = new PublicSeekerProfileDto
                {
                    Id = seeker.Id,
                    FirstName = seeker.FirstName,
                    LastName = seeker.LastName,
                    City = seeker.City,
                    State = seeker.State,
                    ProfessionalSummary = seeker.ProfessionalSummary,
                    JobCategory = seeker.JobCategory,
                    Skills = seeker.Skills,
                    Languages = seeker.Languages,
                    Certifications = seeker.Certifications,
                    Interests = seeker.Interests,
                    ResumeUrl = seeker.ResumeUrl,
                    VideoUrl = seeker.VideoUrl,
                    HeadshotUrl = seeker.HeadshotUrl,
                    ExperienceJson = seeker.ExperienceJson,
                    EducationJson = seeker.EducationJson
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

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] SeekerRegisterRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password)) return BadRequest(new { error = "Missing email or password" });
            var existing = await _userManager.FindByEmailAsync(req.Email);
            if (existing != null) return BadRequest(new { error = "Email already in use" });

            var user = new ApplicationUser { UserName = req.Email, Email = req.Email, DisplayName = req.FirstName };
            var result = await _userManager.CreateAsync(user, req.Password);
            if (!result.Succeeded) return BadRequest(result.Errors);

            var seeker = new Seeker
            {
                UserId = user.Id,
                FirstName = req.FirstName,
                LastName = req.LastName,
                PhoneNumber = req.PhoneNumber,
                // ProfessionalSummary removed from model
                ResumeUrl = req.ResumeUrl,
                VideoUrl = req.VideoUrl,
                HeadshotUrl = req.HeadshotUrl
            };
            if (req.Skills != null && req.Skills.Length > 0) seeker.Skills = string.Join(',', req.Skills);
            // optional structured fields
            if (req.Experience != null && req.Experience.Length > 0) seeker.ExperienceJson = System.Text.Json.JsonSerializer.Serialize(req.Experience);
            if (req.Education != null && req.Education.Length > 0)
            {
                // normalize levels
                foreach(var ed in req.Education){ if (!string.IsNullOrEmpty(ed.Level)) ed.Level = NormalizeEducationLevel(ed.Level); }
                seeker.EducationJson = System.Text.Json.JsonSerializer.Serialize(req.Education);
            }
            if (!string.IsNullOrEmpty(req.VisaStatus)) seeker.VisaStatus = req.VisaStatus;
            if (!string.IsNullOrEmpty(req.PreferredSalary)) seeker.PreferredSalary = req.PreferredSalary;
            if (req.WorkSetting != null && req.WorkSetting.Length > 0) seeker.WorkSetting = string.Join(',', req.WorkSetting);
            if (!string.IsNullOrEmpty(req.Travel)) seeker.Travel = req.Travel;
            if (!string.IsNullOrEmpty(req.Relocate)) seeker.Relocate = req.Relocate;
            if (req.Languages != null && req.Languages.Length > 0) seeker.Languages = string.Join(',', req.Languages);
            if (req.Certifications != null && req.Certifications.Length > 0) seeker.Certifications = string.Join(',', req.Certifications);
            if (req.Interests != null && req.Interests.Length > 0) seeker.Interests = string.Join(',', req.Interests);
            if (!string.IsNullOrEmpty(req.City)) seeker.City = req.City;
            if (!string.IsNullOrEmpty(req.State)) seeker.State = req.State;
            if (!string.IsNullOrEmpty(req.ProfessionalSummary)) seeker.ProfessionalSummary = req.ProfessionalSummary;
            if (!string.IsNullOrEmpty(req.JobCategory)) seeker.JobCategory = req.JobCategory;
            
            // Geocode city/state to get coordinates
            try
            {
                var (lat, lon) = await _geocodingService.GetCoordinatesAsync(seeker.City, seeker.State);
                seeker.Latitude = lat;
                seeker.Longitude = lon;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Warn] Geocoding failed for {seeker.City}, {seeker.State}: {ex.Message}");
            }
            
            _db.Seekers.Add(seeker);
            await _db.SaveChangesAsync();

            // Queue embedding generation request
            try
            {
                await _embeddingQueue.QueueEmbeddingRequestAsync("Candidate", seeker.Id);
            }
            catch (Exception ex)
            {
                // Log but don't block registration on queue failure
                Console.WriteLine($"[Warn] Failed to queue embedding for Candidate {seeker.Id}: {ex.Message}");
            }

            // create JWT like AuthController
            var jwtKey = _config["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY");
            var jwtIssuer = _config["Jwt:Issuer"] ?? Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "futureofthejobsearch";
            if (string.IsNullOrEmpty(jwtKey))
            {
                throw new InvalidOperationException("JWT signing key is not configured. Set 'Jwt:Key' or 'JWT_KEY'.");
            }
            var creds = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtKey));
            var tokenHandler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
            var tokenDescriptor = new Microsoft.IdentityModel.Tokens.SecurityTokenDescriptor
            {
                Issuer = jwtIssuer,
                Subject = new System.Security.Claims.ClaimsIdentity(new[] {
                    new System.Security.Claims.Claim("sub", user.Id),
                    new System.Security.Claims.Claim("email", user.Email ?? ""),
                    new System.Security.Claims.Claim("seekerId", seeker.Id.ToString())
                }),
                Expires = DateTime.UtcNow.AddHours(4),
                SigningCredentials = new Microsoft.IdentityModel.Tokens.SigningCredentials(creds, Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256)
            };
            var token = tokenHandler.WriteToken(tokenHandler.CreateToken(tokenDescriptor));

            return Ok(new { message = "Seeker registered", userId = user.Id, seekerId = seeker.Id, token });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password)) return BadRequest(new { error = "Missing email or password" });
            var user = await _userManager.FindByEmailAsync(req.Email);
            if (user == null) return Unauthorized(new { error = "Invalid credentials" });

            var result = await _signInManager.PasswordSignInAsync(req.Email, req.Password, isPersistent: false, lockoutOnFailure: false);
            if (!result.Succeeded) return Unauthorized(new { error = "Invalid credentials" });

            var seeker = await _db.Seekers.FirstOrDefaultAsync(s => s.UserId == user.Id);
            if (seeker == null)
            {
                // User exists as an Identity user but no Seeker row exists — reject login
                return Unauthorized(new { error = "Seeker account not found" });
            }

            // create JWT token
            var jwtKey = _config["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY");
            var jwtIssuer = _config["Jwt:Issuer"] ?? Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "futureofthejobsearch";
            if (string.IsNullOrEmpty(jwtKey))
            {
                throw new InvalidOperationException("JWT signing key is not configured. Set 'Jwt:Key' or 'JWT_KEY'.");
            }
            var creds = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtKey));
            var tokenHandler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
            var tokenDescriptor = new Microsoft.IdentityModel.Tokens.SecurityTokenDescriptor
            {
                Issuer = jwtIssuer,
                Subject = new System.Security.Claims.ClaimsIdentity(new[] {
                    new System.Security.Claims.Claim("sub", user.Id),
                    new System.Security.Claims.Claim("email", user.Email ?? ""),
                    new System.Security.Claims.Claim("seekerId", seeker?.Id.ToString() ?? "")
                }),
                Expires = DateTime.UtcNow.AddHours(4),
                SigningCredentials = new Microsoft.IdentityModel.Tokens.SigningCredentials(creds, Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256)
            };
            var token = tokenHandler.WriteToken(tokenHandler.CreateToken(tokenDescriptor));

            return Ok(new { message = "Logged in", userId = user.Id, seekerId = seeker?.Id, token });
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            await _signInManager.SignOutAsync();
            return Ok(new { message = "Logged out" });
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> Me()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (string.IsNullOrEmpty(userId)) return Unauthorized();
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return Unauthorized();
            var seeker = await _db.Seekers.FirstOrDefaultAsync(s => s.UserId == userId);
            return Ok(new { user = new { id = user.Id, email = user.Email, displayName = user.DisplayName }, seeker });
        }

        // Public endpoint to list seekers for posters to review
        [HttpGet]
        public async Task<IActionResult> GetAllSeekers([FromQuery] int? positionId, [FromQuery] int? limit)
        {
            // Get employerId from claims for authorization
            var employerClaim = User.Claims.FirstOrDefault(c => c.Type == "employerId");
            int? employerId = null;
            if (employerClaim != null && int.TryParse(employerClaim.Value, out var eid))
            {
                employerId = eid;
            }

            var seekersQuery = _db.Seekers.Where(s => s.IsProfileActive == true); // Only active profiles
            PositionPreferences? prefs = null;
            Position? position = null;

            // If positionId is provided, apply SQL-level pre-filtering based on position preferences
            if (positionId.HasValue)
            {
                position = await _db.Positions.FirstOrDefaultAsync(p => p.Id == positionId.Value);
                
                // Security check: Verify the employer owns this position
                if (position != null && employerId.HasValue && position.EmployerId != employerId.Value)
                {
                    _logger.LogWarning("[GetAllSeekers] Employer {EmployerId} attempted to access position {PositionId} owned by {OwnerId}", 
                        employerId, positionId, position.EmployerId);
                    return Forbid("You do not have permission to view candidates for this position");
                }

                if (position != null)
                {
                    prefs = await _db.PositionPreferences.FirstOrDefaultAsync(pp => pp.PositionId == positionId.Value);
                    if (prefs != null)
                    {
                        _logger.LogInformation("[GetAllSeekers] Applying preferences for position {PositionId}", positionId);
                        seekersQuery = ApplySqlFilters(seekersQuery, prefs, position);
                    }
                }
            }

            // Apply reasonable limit (default 100, max 500)
            var takeCount = limit.HasValue ? Math.Min(limit.Value, 500) : 100;
            var seekers = await seekersQuery.Take(takeCount).ToListAsync();
            _logger.LogInformation("[GetAllSeekers] After SQL filters: {Count} seekers from DB", seekers.Count);
            
            // Apply post-SQL filters that require JSON/string parsing (experience, salary)
            if (prefs != null && position != null)
            {
                seekers = ApplyPostSqlFilters(seekers, prefs, position);
            }
            
            // Rank seekers by embedding similarity to position
            if (position != null && seekers.Count > 0)
            {
                seekers = await RankSeekersBySimilarity(seekers, position.Id);
            }
            
            _logger.LogInformation("[GetAllSeekers] Final result: {Count} seekers being returned", seekers.Count);
            return Ok(seekers);
        }

        private record BoundingBox(double MinLat, double MaxLat, double MinLon, double MaxLon);

        private IQueryable<Seeker> ApplySqlFilters(IQueryable<Seeker> seekers, PositionPreferences prefs, Position position)
        {
            // Only apply filters that can translate to SQL efficiently
            // Apply filter if priority is not "None" (i.e., "Flexible" or "DealBreaker")
            
            // Job Category - Reverse of seeker filtering
            // Position wants specific category, check if seeker has it
            if (prefs.JobCategoryPriority != "None" && !string.IsNullOrEmpty(prefs.JobCategory))
            {
                if (prefs.JobCategoryPriority == "DealBreaker")
                {
                    // Must match exactly
                    seekers = seekers.Where(s => s.JobCategory == prefs.JobCategory);
                }
                else if (prefs.JobCategoryPriority == "Flexible")
                {
                    // Match any category in the same group
                    if (JobCategoryGroups.TryGetValue(prefs.JobCategory, out var groupId))
                    {
                        var sameGroupCategories = JobCategoryGroups
                            .Where(kvp => kvp.Value == groupId)
                            .Select(kvp => kvp.Key)
                            .ToHashSet(StringComparer.OrdinalIgnoreCase);

                        seekers = seekers.Where(s => !string.IsNullOrEmpty(s.JobCategory) && sameGroupCategories.Contains(s.JobCategory));
                    }
                    else
                    {
                        // Fallback to exact match if category not in groups
                        seekers = seekers.Where(s => s.JobCategory == prefs.JobCategory);
                    }
                }
            }

            // Education Level - Filter by hierarchy
            // None = don't filter
            // Flexible = allow 1 level below and all above
            // DealBreaker = only at level and above
            // NOTE: Moved to post-SQL filtering for proper JSON parsing

            // Work Setting - Only filter if DealBreaker is set, seeker must match one of the chosen options
            if (prefs.WorkSettingPriority == "DealBreaker" && !string.IsNullOrEmpty(prefs.WorkSetting))
            {
                var preferredSettings = prefs.WorkSetting.Split(',').Select(s => s.Trim()).ToList();

                _logger.LogInformation($"[ApplySqlFilters] Filtering by Work Setting: Priority=DealBreaker, Required settings: {string.Join(", ", preferredSettings)}");

                seekers = seekers.Where(s => !string.IsNullOrEmpty(s.WorkSetting) &&
                    preferredSettings.Any(ps => s.WorkSetting.Contains(ps)));
            }

            // Travel Requirements - Only filter on DealBreaker, must match
            if (prefs.TravelRequirementsPriority == "DealBreaker" && !string.IsNullOrEmpty(prefs.TravelRequirements))
            {
                seekers = seekers.Where(s => s.Travel == prefs.TravelRequirements);
            }

            // Note: Salary and Years Experience filtering skipped at SQL level for performance
            // These require parsing JSON/string fields which can't be efficiently translated to SQL
            // They are applied after SQL query in ApplyPostSqlFilters

            return seekers;
        }

        private List<Seeker> ApplyPostSqlFilters(List<Seeker> seekers, PositionPreferences prefs, Position position)
        {
            _logger.LogInformation("[ApplyPostSqlFilters] Starting post-SQL filters with {Count} seekers. Prefs: EduLevel={EduLevel}, EduPri={EduPri}, YearsExp={Years}, YearsPri={YearsPri}, Salary={Salary}, SalaryPri={SalaryPri}",
                seekers.Count, prefs.EducationLevel ?? "(null)", prefs.EducationLevelPriority, prefs.YearsExpMin, prefs.YearsExpPriority, prefs.PreferredSalary ?? "(null)", prefs.PreferredSalaryPriority);

            // Salary Expectations Filtering - Match Job Seeker filtering logic exactly
            // Filter based on PreferredSalary from preferences (not position's actual salary)
            decimal? preferredMin = ParseSalaryMinimum(prefs.PreferredSalary);
            if (preferredMin.HasValue && prefs.PreferredSalaryPriority != "None")
            {
                var minAnnual = preferredMin.Value;

                _logger.LogInformation("[ApplyPostSqlFilters] Filtering by Salary: Priority={Priority}, Preference salary minimum: {PreferredMin}",
                    prefs.PreferredSalaryPriority, minAnnual);

                if (prefs.PreferredSalaryPriority == "DealBreaker")
                {
                    // Seeker's expected salary must be <= position's preference requirement
                    seekers = seekers.Where(s =>
                    {
                        if (string.IsNullOrEmpty(s.PreferredSalary)) return true; // No preference = include
                        var seekerMin = ParseSalaryMinimum(s.PreferredSalary);
                        if (!seekerMin.HasValue) return true;
                        
                        var matches = seekerMin.Value <= minAnnual;

                        if (!matches)
                        {
                            _logger.LogInformation("[ApplyPostSqlFilters] ✗ Seeker {SeekerId} filtered out: salary={Salary} (min={SeekerMin}), position requirement is {RequiredMin}",
                                s.Id, s.PreferredSalary, seekerMin.Value, minAnnual);
                        }
                        else
                        {
                            _logger.LogInformation("[ApplyPostSqlFilters] ✓ Seeker {SeekerId} passed salary: {Salary} (min={SeekerMin} <= {RequiredMin})",
                                s.Id, s.PreferredSalary, seekerMin.Value, minAnnual);
                        }

                        return matches;
                    }).ToList();
                }
                else if (prefs.PreferredSalaryPriority == "Flexible")
                {
                    // Allow seekers wanting up to $30k more than position preference
                    var flexibleCeiling = minAnnual + 30000m;
                    seekers = seekers.Where(s =>
                    {
                        if (string.IsNullOrEmpty(s.PreferredSalary)) return true; // No preference = include
                        var seekerMin = ParseSalaryMinimum(s.PreferredSalary);
                        if (!seekerMin.HasValue) return true;
                        
                        var matches = seekerMin.Value <= flexibleCeiling;

                        if (!matches)
                        {
                            _logger.LogInformation("[ApplyPostSqlFilters] ✗ Seeker {SeekerId} filtered out: salary={Salary} (min={SeekerMin}), flexible ceiling is {Ceiling}",
                                s.Id, s.PreferredSalary, seekerMin.Value, flexibleCeiling);
                        }
                        else
                        {
                            _logger.LogInformation("[ApplyPostSqlFilters] ✓ Seeker {SeekerId} passed salary: {Salary} (min={SeekerMin} <= {Ceiling})",
                                s.Id, s.PreferredSalary, seekerMin.Value, flexibleCeiling);
                        }

                        return matches;
                    }).ToList();
                }
            }

            // Education Level Filtering - requires JSON parsing to find highest level
            if (prefs.EducationLevelPriority != "None" && !string.IsNullOrEmpty(prefs.EducationLevel))
            {
                if (EducationLevelRank.TryGetValue(prefs.EducationLevel, out var requiredRank))
                {
                    int minRank = prefs.EducationLevelPriority == "Flexible" 
                        ? Math.Max(0, requiredRank - 1)  // Allow 1 level below
                        : requiredRank;  // DealBreaker: must be at level or above

                    _logger.LogInformation("[ApplyPostSqlFilters] Filtering by Education: Priority={Priority}, Required={Level} (Rank={Rank}), MinRank={MinRank}",
                        prefs.EducationLevelPriority, prefs.EducationLevel, requiredRank, minRank);

                    var filteredSeekers = new List<Seeker>();
                    
                    foreach (var seeker in seekers)
                    {
                        int highestRank = -1;
                        
                        // Parse EducationJson to find highest education level
                        if (!string.IsNullOrEmpty(seeker.EducationJson))
                        {
                            _logger.LogInformation("[ApplyPostSqlFilters] Seeker {SeekerId} raw EducationJson: {Json}", seeker.Id, seeker.EducationJson);
                            
                            try
                            {
                                // Try to deserialize as array of EducationDto objects
                                var educationList = System.Text.Json.JsonSerializer.Deserialize<List<EducationDto>>(seeker.EducationJson);
                                if (educationList != null && educationList.Count > 0)
                                {
                                    _logger.LogInformation("[ApplyPostSqlFilters] Seeker {SeekerId} education count: {Count}", seeker.Id, educationList.Count);
                                    foreach (var eduEntry in educationList)
                                    {
                                        _logger.LogInformation("[ApplyPostSqlFilters] Seeker {SeekerId} education entry raw Level: '{Level}'", seeker.Id, eduEntry.Level ?? "(null)");
                                        
                                        if (!string.IsNullOrEmpty(eduEntry.Level))
                                        {
                                            // Try to normalize the level first
                                            var normalizedLevel = NormalizeEducationLevel(eduEntry.Level);
                                            _logger.LogInformation("[ApplyPostSqlFilters] Seeker {SeekerId} normalized Level: '{Original}' -> '{Normalized}'", seeker.Id, eduEntry.Level, normalizedLevel);
                                            
                                            if (EducationLevelRank.TryGetValue(normalizedLevel, out var rankVal))
                                            {
                                                highestRank = Math.Max(highestRank, rankVal);
                                                _logger.LogInformation("[ApplyPostSqlFilters] Seeker {SeekerId} education entry: Level={Level} (Rank={Rank})",
                                                    seeker.Id, normalizedLevel, rankVal);
                                            }
                                            else
                                            {
                                                _logger.LogWarning("[ApplyPostSqlFilters] Seeker {SeekerId} level '{Level}' not found in EducationLevelRank dictionary", seeker.Id, normalizedLevel);
                                            }
                                        }
                                    }
                                }
                                else
                                {
                                    _logger.LogInformation("[ApplyPostSqlFilters] Seeker {SeekerId} education list is null or empty", seeker.Id);
                                }
                            }
                            catch (Exception ex)
                            { 
                                _logger.LogWarning("[ApplyPostSqlFilters] Failed to parse EducationJson for Seeker {SeekerId}: {Error}", seeker.Id, ex.Message);
                            }
                        }
                        else
                        {
                            _logger.LogInformation("[ApplyPostSqlFilters] Seeker {SeekerId} has no EducationJson", seeker.Id);
                        }

                        if (highestRank >= minRank)
                        {
                            filteredSeekers.Add(seeker);
                            string highestLevelName = highestRank >= 0 
                                ? EducationLevelRank.FirstOrDefault(kvp => kvp.Value == highestRank).Key ?? "Unknown"
                                : "None";
                            _logger.LogInformation("[ApplyPostSqlFilters] ✓ Seeker {SeekerId} passed education: highest={Highest} (Rank={HighestRank}, required min={MinRank})",
                                seeker.Id, highestLevelName, highestRank, minRank);
                        }
                        else
                        {
                            string highestLevelName = highestRank >= 0 
                                ? EducationLevelRank.FirstOrDefault(kvp => kvp.Value == highestRank).Key ?? "Unknown"
                                : "None";
                            _logger.LogInformation("[ApplyPostSqlFilters] ✗ Seeker {SeekerId} filtered out: education={Highest} (Rank={HighestRank}, required min={MinRank})",
                                seeker.Id, highestLevelName, highestRank, minRank);
                        }
                    }
                    
                    seekers = filteredSeekers;
                }
            }

            // Years of Experience Filtering - requires JSON parsing
            if (prefs.YearsExpPriority != "None" && prefs.YearsExpMin.HasValue)
            {
                _logger.LogInformation("[ApplyPostSqlFilters] Filtering by Years Experience: Priority={Priority}, MinYears={MinYears}",
                    prefs.YearsExpPriority, prefs.YearsExpMin);

                var filteredSeekers = new List<Seeker>();
                
                foreach (var seeker in seekers)
                {
                    var yearsExp = CalculateTotalYearsExperience(seeker.ExperienceJson);
                    
                    bool meetsRequirement = false;
                    if (prefs.YearsExpPriority == "Flexible" || prefs.YearsExpPriority == "DealBreaker")
                    {
                        // Both Flexible and DealBreaker require >= MinYears
                        meetsRequirement = yearsExp >= prefs.YearsExpMin.Value;
                    }

                    if (meetsRequirement)
                    {
                        filteredSeekers.Add(seeker);
                        _logger.LogInformation("[ApplyPostSqlFilters] ✓ Seeker {SeekerId} passed: {Years:F1} years experience",
                            seeker.Id, yearsExp);
                    }
                    else
                    {
                        _logger.LogInformation("[ApplyPostSqlFilters] ✗ Seeker {SeekerId} filtered out: {Years:F1} years experience (required: {MinYears})",
                            seeker.Id, yearsExp, prefs.YearsExpMin.Value);
                    }
                }
                
                seekers = filteredSeekers;
            }
            else
            {
                // No experience filtering - log all seekers
                foreach (var seeker in seekers)
                {
                    var yearsExp = CalculateTotalYearsExperience(seeker.ExperienceJson);
                    _logger.LogInformation("[ApplyPostSqlFilters] Seeker {SeekerId}: {Years:F1} years experience (no filter applied)",
                        seeker.Id, yearsExp);
                }
            }

            _logger.LogInformation("[ApplyPostSqlFilters] After post-SQL filters: {Count} seekers remaining", seekers.Count);
            return seekers;
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

        private async Task<List<Seeker>> RankSeekersBySimilarity(List<Seeker> seekers, int positionId)
        {
            try
            {
                // Fetch position's embedding
                var positionEmbed = await _db.PositionEmbeddings
                    .AsNoTracking()
                    .FirstOrDefaultAsync(e => e.PositionId == positionId);

                if (positionEmbed?.Embedding == null || positionEmbed.Embedding.Length == 0)
                {
                    _logger.LogInformation("[RankSeekersBySimilarity] No position embedding found for ID {PositionId} - returning seekers in original order", positionId);
                    return seekers;
                }

                _logger.LogInformation("[RankSeekersBySimilarity] Found position embedding (ModelVersion: {Version}, {Bytes} bytes)", 
                    positionEmbed.ModelVersion, positionEmbed.Embedding.Length);

                // Fetch seeker embeddings for all seekers in batch
                var seekerIds = seekers.Select(s => s.Id).ToList();
                var seekerEmbeds = await _db.SeekerEmbeddings
                    .AsNoTracking()
                    .Where(e => seekerIds.Contains(e.SeekerId))
                    .ToDictionaryAsync(e => e.SeekerId, e => e.Embedding);

                _logger.LogInformation("[RankSeekersBySimilarity] Found embeddings for {Count} of {Total} seekers", 
                    seekerEmbeds.Count, seekers.Count);

                // Calculate similarity scores and sort
                var ranked = seekers
                    .Select(seeker => new
                    {
                        Seeker = seeker,
                        SimilarityScore = seekerEmbeds.TryGetValue(seeker.Id, out var embed)
                            ? _embeddingSimilarity.CalculateSimilarity(positionEmbed.Embedding, embed)
                            : 0.0
                    })
                    .OrderByDescending(x => x.SimilarityScore)  // Highest score first
                    .ThenByDescending(x => x.Seeker.CreatedAt) // Tiebreaker: newer first
                    .Select(x => x.Seeker)
                    .ToList();

                _logger.LogInformation("[RankSeekersBySimilarity] Sorted {Count} seekers by similarity", ranked.Count);
                foreach (var s in ranked.Take(5))
                {
                    var score = seekerEmbeds.TryGetValue(s.Id, out var e)
                        ? _embeddingSimilarity.CalculateSimilarity(positionEmbed.Embedding, e)
                        : 0.0;
                    _logger.LogInformation("  [RankSeekersBySimilarity] ID={Id}, FirstName={FirstName}, Score={Score:F4}", 
                        s.Id, s.FirstName, score);
                }

                return ranked;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[RankSeekersBySimilarity] Failed to rank seekers by similarity - returning original order");
                return seekers; // Fail gracefully; return unranked
            }
        }

        /// <summary>
        /// Calculate total years of experience from ExperienceJson
        /// Parses experience array and sums up years from all positions
        /// Handles date formats like "2024-08" and "Present"
        /// </summary>
        private int CalculateTotalYearsExperience(string? experienceJson)
        {
            if (string.IsNullOrEmpty(experienceJson))
                return 0;

            try
            {
                var experiences = System.Text.Json.JsonSerializer.Deserialize<List<ExperienceDto>>(experienceJson);
                if (experiences == null || experiences.Count == 0)
                    return 0;

                int totalMonths = 0;
                var now = DateTime.UtcNow;

                foreach (var exp in experiences)
                {
                    DateTime? startDate = ParseExperienceDate(exp.StartDate);
                    DateTime? endDate = ParseExperienceDate(exp.EndDate);

                    // If end date is "Present" or missing, use current date
                    if (endDate == null || exp.EndDate?.Equals("Present", StringComparison.OrdinalIgnoreCase) == true)
                    {
                        endDate = now;
                    }

                    // Only count if both dates are valid
                    if (startDate.HasValue && endDate.HasValue)
                    {
                        var timeSpan = endDate.Value - startDate.Value;
                        totalMonths += (int)timeSpan.TotalDays / 30; // Approximate months
                    }
                }

                return totalMonths / 12; // Convert to years
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[CalculateTotalYearsExperience] Error parsing experience JSON");
                return 0;
            }
        }

        /// <summary>
        /// Parse experience date in formats like "2024-08", "2024-08-15", or "Present"
        /// </summary>
        private DateTime? ParseExperienceDate(string? dateStr)
        {
            if (string.IsNullOrEmpty(dateStr) || dateStr.Equals("Present", StringComparison.OrdinalIgnoreCase))
                return null;

            // Try to parse as ISO date
            if (DateTime.TryParse(dateStr, out var parsedDate))
                return parsedDate;

            // Try to parse as yyyy-MM (year-month only)
            if (dateStr.Length >= 7 && DateTime.TryParse(dateStr + "-01", out var monthDate))
                return monthDate;

            return null;
        }

        [HttpPatch("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateSeeker([FromRoute] int id, [FromBody] UpdateSeekerRequest req)
        {
            var seeker = await _db.Seekers.FirstOrDefaultAsync(s => s.Id == id);
            if (seeker == null) return NotFound(new { error = "Seeker not found" });
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (string.IsNullOrEmpty(userId) || seeker.UserId != userId) return Forbid();

            seeker.FirstName = req.FirstName ?? seeker.FirstName;
            seeker.LastName = req.LastName ?? seeker.LastName;
            seeker.PhoneNumber = req.PhoneNumber ?? seeker.PhoneNumber;
            // ProfessionalSummary removed from model
            if (req.Skills != null && req.Skills.Length > 0) seeker.Skills = string.Join(',', req.Skills);
            seeker.ResumeUrl = req.ResumeUrl ?? seeker.ResumeUrl;
            seeker.VideoUrl = req.VideoUrl ?? seeker.VideoUrl;
            seeker.HeadshotUrl = req.HeadshotUrl ?? seeker.HeadshotUrl;
            if (req.IsProfileActive.HasValue) seeker.IsProfileActive = req.IsProfileActive.Value;
            // structured updates
            if (req.Experience != null && req.Experience.Length > 0) seeker.ExperienceJson = System.Text.Json.JsonSerializer.Serialize(req.Experience);
            if (req.Education != null && req.Education.Length > 0)
            {
                foreach(var ed in req.Education){ if (!string.IsNullOrEmpty(ed.Level)) ed.Level = NormalizeEducationLevel(ed.Level); }
                seeker.EducationJson = System.Text.Json.JsonSerializer.Serialize(req.Education);
            }
            seeker.VisaStatus = req.VisaStatus ?? seeker.VisaStatus;
            seeker.PreferredSalary = req.PreferredSalary ?? seeker.PreferredSalary;
            if (req.WorkSetting != null && req.WorkSetting.Length > 0) seeker.WorkSetting = string.Join(',', req.WorkSetting);
            seeker.Travel = req.Travel ?? seeker.Travel;
            seeker.Relocate = req.Relocate ?? seeker.Relocate;
            if (req.Languages != null && req.Languages.Length > 0) seeker.Languages = string.Join(',', req.Languages);
            if (req.Certifications != null && req.Certifications.Length > 0) seeker.Certifications = string.Join(',', req.Certifications);
            if (req.Interests != null && req.Interests.Length > 0) seeker.Interests = string.Join(',', req.Interests);
            seeker.City = req.City ?? seeker.City;
            seeker.State = req.State ?? seeker.State;
            seeker.ProfessionalSummary = req.ProfessionalSummary ?? seeker.ProfessionalSummary;
            seeker.JobCategory = req.JobCategory ?? seeker.JobCategory;

            // Update geocoding if city or state changed
            if (!string.IsNullOrEmpty(req.City) || !string.IsNullOrEmpty(req.State))
            {
                try
                {
                    var (lat, lon) = await _geocodingService.GetCoordinatesAsync(seeker.City, seeker.State);
                    seeker.Latitude = lat;
                    seeker.Longitude = lon;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Warn] Geocoding failed for {seeker.City}, {seeker.State}: {ex.Message}");
                }
            }

            await _db.SaveChangesAsync();

            // Queue embedding generation request
            try
            {
                await _embeddingQueue.QueueEmbeddingRequestAsync("Candidate", id);
            }
            catch (Exception ex)
            {
                // Log but don't block update on queue failure
                Console.WriteLine($"[Warn] Failed to queue embedding for Candidate {id}: {ex.Message}");
            }

            return Ok(new { message = "Seeker updated", seeker });
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteSeeker([FromRoute] int id)
        {
            var seeker = await _db.Seekers.FirstOrDefaultAsync(s => s.Id == id);
            if (seeker == null) return NotFound(new { error = "Seeker not found" });
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (string.IsNullOrEmpty(userId) || seeker.UserId != userId) return Forbid();

            // delete resume/video blobs if possible
            // similar to employers delete logic - best effort
            try{
                var blobService = CreateBlobServiceClient();
                if (!string.IsNullOrEmpty(seeker.ResumeUrl)){
                    try{ var blob = blobService.GetBlobContainerClient(_config["ResumeContainer"] ?? "qaresumes").GetBlobClient(seeker.ResumeUrl.TrimStart('/')); await blob.DeleteIfExistsAsync(); } catch {}
                }
                if (!string.IsNullOrEmpty(seeker.VideoUrl)){
                    try{ var blob = blobService.GetBlobContainerClient(_config["SeekerVideoContainer"] ?? "qaseekervideo").GetBlobClient(seeker.VideoUrl.TrimStart('/')); await blob.DeleteIfExistsAsync(); } catch {}
                }
            } catch {}

            _db.Seekers.Remove(seeker);
            await _db.SaveChangesAsync();

            // delete identity user
            try{ var user = await _userManager.FindByIdAsync(seeker.UserId); if (user!=null) await _userManager.DeleteAsync(user); } catch {}

            return Ok(new { message = "Seeker deleted" });
        }

        // Change account email (Identity user). Requires current password for safety.
        [HttpPost("change-email")]
        [Authorize]
        public async Task<IActionResult> ChangeEmail([FromBody] ChangeEmailRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.NewEmail) || string.IsNullOrWhiteSpace(req.Password))
                return BadRequest(new { error = "Missing email or password" });

            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized(new { error = "Unauthorized" });

            // Validate password
            var valid = await _userManager.CheckPasswordAsync(user, req.Password);
            if (!valid) return Unauthorized(new { error = "Invalid password" });

            // Check if email already in use
            var existing = await _userManager.FindByEmailAsync(req.NewEmail);
            if (existing != null && existing.Id != user.Id)
                return BadRequest(new { error = "Email already in use" });

            user.Email = req.NewEmail;
            user.UserName = req.NewEmail; // keep username aligned with email
            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded) return BadRequest(new { error = "Failed to update email", details = result.Errors });

            return Ok(new { message = "Email updated", email = user.Email });
        }

    // Change account password (authenticated)
        [HttpPost("change-password")]
        [Authorize]
        [ApiExplorerSettings(IgnoreApi = true)] // Hidden: we're standardizing on email-based password reset
        public IActionResult ChangePassword([FromBody] ChangePasswordRequest req)
        {
            // Direct password change has been disabled to ensure a single, audited flow via email reset links.
            // This endpoint is intentionally returning 404 to discourage usage by clients.
            return NotFound(new { error = "Direct password change is disabled. Use the email password reset flow." });
        }

        // Request password reset email (unauthenticated flow)
        [HttpPost("password-reset-request")]
        [AllowAnonymous]
        public async Task<IActionResult> PasswordResetRequest(
            [FromServices] FutureOfTheJobSearch.Server.Services.IEmailService emailService,
            [FromServices] ILogger<SeekersController> logger,
            [FromBody] PasswordResetRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Email)) return BadRequest(new { error = "Email is required" });
            var user = await _userManager.FindByEmailAsync(req.Email);
            if (user == null)
            {
                // Do not reveal that the user does not exist
                return Ok(new { message = "If an account exists, a reset link has been sent." });
            }

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            // Frontend URL to handle reset
            var frontendBase = _config["FrontendBaseUrl"] ?? Environment.GetEnvironmentVariable("FRONTEND_BASE_URL") ?? "http://localhost:3000";
            var resetUrl = $"{frontendBase.TrimEnd('/')}/seeker/reset-password?uid={Uri.EscapeDataString(user.Id)}&token={Uri.EscapeDataString(token)}";

            // Read configured token lifetime to keep email copy accurate
            var minutes = 30;
            if (int.TryParse(_config["Identity:ResetTokenMinutes"] ?? Environment.GetEnvironmentVariable("IDENTITY__RESETTOKENMINUTES"), out var cfgMins) && cfgMins > 0)
            {
                minutes = cfgMins;
            }

            var subject = "Reset your Proslipsi password";
            var body = $@"<p>We received a request to reset your password.</p>
                          <p><a href='{resetUrl}'>Click here to reset your password</a>. This link will expire in {minutes} minutes.</p>
                          <p>If you did not request this, you can safely ignore this email.</p>";
            try
            {
                await emailService.SendAsync(user.Email!, subject, body);
            }
            catch (Exception ex)
            {
                // Do not reveal details to the client; log server-side and still return 200 to avoid user enumeration and UX breakage.
                logger.LogError(ex, "[PasswordResetRequest] Failed to send email to {Email}", user.Email);
            }
            return Ok(new { message = "If an account exists, a reset link has been sent." });
        }

        // Confirm password reset (unauthenticated flow)
        [HttpPost("password-reset-confirm")]
        [AllowAnonymous]
        public async Task<IActionResult> PasswordResetConfirm([FromBody] PasswordResetConfirmRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.UserId) || string.IsNullOrWhiteSpace(req.Token) || string.IsNullOrWhiteSpace(req.NewPassword))
                return BadRequest(new { error = "Missing fields" });
            var user = await _userManager.FindByIdAsync(req.UserId);
            if (user == null) return BadRequest(new { error = "Invalid user" });
            var result = await _userManager.ResetPasswordAsync(user, req.Token, req.NewPassword);
            if (!result.Succeeded) return BadRequest(new { error = "Failed to reset password", details = result.Errors });
            return Ok(new { message = "Password reset successful" });
        }

    // Normalize various education level strings to canonical set used by the app
    private static string NormalizeEducationLevel(string level)
    {
        if (string.IsNullOrWhiteSpace(level)) return string.Empty;
        var s = level.Trim().ToLowerInvariant();
        if (s.Contains("high") || s.Contains("hs") || s.Contains("secondary")) return "High School";
        if (s.Contains("associate") || s.Contains("aa") || s.Contains("as")) return "Associate's";
        if (s.Contains("bachelor") || s.Contains("ba") || s.Contains("bs") || s.Contains("b.sc") || s.Contains("bsc")) return "Bachelor's";
        if (s.Contains("master") || s.Contains("ms") || s.Contains("m.sc") || s.Contains("msc")) return "Master's";
        if (s.Contains("doctor") || s.Contains("phd") || s.Contains("doctorate") || s.Contains("d.ph")) return "Doctorate";
        if (s.Contains("none") || s.Contains("no degree") || s.Contains("not required") || s.Contains("none required")) return "None";
        // fallback: capitalize first letters
        return System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(level.Trim());
    }

    }

    public class ExperienceDto {
        public string? Title { get; set; }
        public string? Company { get; set; }
        // Expect ISO-like month strings: yyyy-MM
        public string? StartDate { get; set; }
        public string? EndDate { get; set; }
        public string? Description { get; set; }
    }

    public class EducationDto {
        public string? Level { get; set; }
        public string? Degree { get; set; }
        public string? School { get; set; }
        // Expect ISO-like month strings: yyyy-MM
        public string? StartDate { get; set; }
        public string? EndDate { get; set; }
    }

    public class SeekerRegisterRequest{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string[]? Skills { get; set; }
        // Optional URLs returned from uploads (resume, video)
        public string? ResumeUrl { get; set; }
        public string? VideoUrl { get; set; }
        public string? HeadshotUrl { get; set; }
        public string? Password { get; set; }

        // Structured fields
        public ExperienceDto[]? Experience { get; set; }
        public EducationDto[]? Education { get; set; }
        public string? VisaStatus { get; set; }
        public string? PreferredSalary { get; set; }
        public string[]? WorkSetting { get; set; }
        public string? Travel { get; set; }
        public string? Relocate { get; set; }
        public string[]? Languages { get; set; }
        public string[]? Certifications { get; set; }
        public string[]? Interests { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? ProfessionalSummary { get; set; }
        public string? JobCategory { get; set; }
    }

    public class UpdateSeekerRequest{
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? PhoneNumber { get; set; }
        public string[]? Skills { get; set; }
        public string? ResumeUrl { get; set; }
        public string? VideoUrl { get; set; }
        public string? HeadshotUrl { get; set; }
        public bool? IsProfileActive { get; set; }

        // Structured updates
        public ExperienceDto[]? Experience { get; set; }
        public EducationDto[]? Education { get; set; }
        public string? VisaStatus { get; set; }
        public string? PreferredSalary { get; set; }
        public string[]? WorkSetting { get; set; }
        public string? Travel { get; set; }
        public string? Relocate { get; set; }
        public string[]? Languages { get; set; }
        public string[]? Certifications { get; set; }
        public string[]? Interests { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? ProfessionalSummary { get; set; }
        public string? JobCategory { get; set; }
    }

}
