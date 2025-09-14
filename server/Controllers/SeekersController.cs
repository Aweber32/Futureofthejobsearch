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

        public SeekersController(UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager, ApplicationDbContext db, IConfiguration config)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _db = db;
            _config = config;
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
                VideoUrl = req.VideoUrl
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
            _db.Seekers.Add(seeker);
            await _db.SaveChangesAsync();

            // create JWT like AuthController
            var jwtKey = _config["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY") ?? "dev-secret-change-this-please-set-JWT_KEY";
            var jwtIssuer = _config["Jwt:Issuer"] ?? Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "futureofthejobsearch";
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
            var jwtKey = _config["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY") ?? "dev-secret-change-this-please-set-JWT_KEY";
            var jwtIssuer = _config["Jwt:Issuer"] ?? Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "futureofthejobsearch";
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

            await _db.SaveChangesAsync();
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
    }

    public class UpdateSeekerRequest{
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? PhoneNumber { get; set; }
        public string[]? Skills { get; set; }
        public string? ResumeUrl { get; set; }
        public string? VideoUrl { get; set; }

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
    }

}
