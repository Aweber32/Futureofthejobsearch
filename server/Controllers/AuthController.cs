using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using FutureOfTheJobSearch.Server.Models;
using FutureOfTheJobSearch.Server.Data;
using FutureOfTheJobSearch.Server.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace FutureOfTheJobSearch.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]

    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;

        public AuthController(UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager, ApplicationDbContext db, IConfiguration config)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _db = db;
            _config = config;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest req)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
                    return BadRequest(new { error = "Missing email or password" });

                var existing = await _userManager.FindByEmailAsync(req.Email);
                if (existing != null) return BadRequest(new { error = "Email already in use" });

                // Enforce one employer account per company name
                if (!string.IsNullOrWhiteSpace(req.CompanyName))
                {
                    var existingCompany = await _db.Employers.FirstOrDefaultAsync(e => e.CompanyName == req.CompanyName);
                    if (existingCompany != null)
                        return BadRequest(new { error = "An account for that company already exists" });
                }

                var user = new ApplicationUser { UserName = req.Email, Email = req.Email, DisplayName = req.ContactName };
                var result = await _userManager.CreateAsync(user, req.Password);
                if (!result.Succeeded) return BadRequest(result.Errors);

                var emp = new Employer
                {
                    UserId = user.Id,
                    CompanyName = req.CompanyName,
                    ContactEmail = req.ContactEmail,
                    ContactName = req.ContactName,
                    Website = req.Website
                };
                // Map new optional fields
                emp.CompanyDescription = req.CompanyDescription;
                emp.City = req.City;
                emp.State = req.State;
                emp.Address = req.Address;
                if (!string.IsNullOrWhiteSpace(req.CompanySize))
                {
                    if (Enum.TryParse<CompanySize>(req.CompanySize, true, out var size))
                    {
                        emp.CompanySize = size;
                    }
                }
                _db.Employers.Add(emp);
                await _db.SaveChangesAsync();

                // In a production system you'd send email confirmation and sign-in cookie or JWT
                return Ok(new { message = "Registered", userId = user.Id, employerId = emp.Id });
            }
            catch (Exception ex)
            {
                // Log to console for local debugging
                Console.WriteLine("AuthController.Register error: " + ex.ToString());
                return StatusCode(500, new { error = "Server error", detail = ex.Message });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] DTOs.LoginRequest req)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
                    return BadRequest(new { error = "Missing email or password" });

                var user = await _userManager.FindByEmailAsync(req.Email);
                if (user == null) return Unauthorized(new { error = "Invalid credentials" });

                var result = await _signInManager.PasswordSignInAsync(req.Email, req.Password, isPersistent: false, lockoutOnFailure: false);
                if (!result.Succeeded) return Unauthorized(new { error = "Invalid credentials" });

                var emp = await _db.Employers.FirstOrDefaultAsync(e => e.UserId == user.Id);

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
                        new System.Security.Claims.Claim("employerId", emp?.Id.ToString() ?? "")
                    }),
                    Expires = DateTime.UtcNow.AddHours(4),
                    SigningCredentials = new Microsoft.IdentityModel.Tokens.SigningCredentials(creds, Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256)
                };
                var token = tokenHandler.WriteToken(tokenHandler.CreateToken(tokenDescriptor));

                return Ok(new { message = "Logged in", userId = user.Id, employerId = emp?.Id, token });
            }
            catch (Exception ex)
            {
                Console.WriteLine("AuthController.Login error: " + ex.ToString());
                return StatusCode(500, new { error = "Server error", detail = ex.Message });
            }
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
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();
            var emp = await _db.Employers.FirstOrDefaultAsync(e => e.UserId == user.Id);
            return Ok(new { user = new { id = user.Id, email = user.Email, displayName = user.DisplayName }, employer = emp });
        }
    }
}
