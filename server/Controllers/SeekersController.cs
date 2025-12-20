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

namespace FutureOfTheJobSearch.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]

    public class SeekersController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly ApplicationDbContext _db;
        private readonly IConfiguration _config;
        private readonly IEmbeddingQueueService _embeddingQueue;
        private readonly IGeocodingService _geocodingService;

        public SeekersController(UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager, ApplicationDbContext db, IConfiguration config, IEmbeddingQueueService embeddingQueue, IGeocodingService geocodingService)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _db = db;
            _config = config;
            _embeddingQueue = embeddingQueue;
            _geocodingService = geocodingService;
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
        public async Task<IActionResult> GetAllSeekers()
        {
            var seekers = await _db.Seekers.ToListAsync();
            return Ok(seekers);
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
                var conn = _config.GetConnectionString("BlobConnection") ?? Environment.GetEnvironmentVariable("BLOB_CONNECTION");
                if (!string.IsNullOrEmpty(conn)){
                    // resume
                    if (!string.IsNullOrEmpty(seeker.ResumeUrl)){
                        try{ var blob = new Azure.Storage.Blobs.BlobClient(conn, _config["ResumeContainer"] ?? "qaresumes", seeker.ResumeUrl.TrimStart('/')); await blob.DeleteIfExistsAsync(); } catch {}
                    }
                    if (!string.IsNullOrEmpty(seeker.VideoUrl)){
                        try{ var blob = new Azure.Storage.Blobs.BlobClient(conn, _config["SeekerVideoContainer"] ?? "qaseekervideo", seeker.VideoUrl.TrimStart('/')); await blob.DeleteIfExistsAsync(); } catch {}
                    }
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

            var subject = "Reset your ELEV8R password";
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
