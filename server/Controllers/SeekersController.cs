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

            var seeker = new Seeker { UserId = user.Id, FirstName = req.FirstName, LastName = req.LastName, PhoneNumber = req.PhoneNumber, ProfessionalSummary = req.ProfessionalSummary };
            if (req.Skills != null && req.Skills.Length > 0) seeker.Skills = string.Join(',', req.Skills);
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
            seeker.ProfessionalSummary = req.ProfessionalSummary ?? seeker.ProfessionalSummary;
            if (req.Skills != null && req.Skills.Length > 0) seeker.Skills = string.Join(',', req.Skills);

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
    }

    public class SeekerRegisterRequest{
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? ProfessionalSummary { get; set; }
        public string[]? Skills { get; set; }
        public string Password { get; set; }
    }

    public class UpdateSeekerRequest{
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? PhoneNumber { get; set; }
        public string? ProfessionalSummary { get; set; }
    public string[]? Skills { get; set; }
    public string? ResumeUrl { get; set; }
    public string? VideoUrl { get; set; }
    }

}
