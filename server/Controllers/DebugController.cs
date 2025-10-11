using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using FutureOfTheJobSearch.Server.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;

namespace FutureOfTheJobSearch.Server.Controllers
{
    [ApiController]
    [Route("api/debug")]
    public class DebugController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<DebugController> _logger;
        private readonly IConfiguration _config;

        public DebugController(ApplicationDbContext db, ILogger<DebugController> logger, IConfiguration config)
        {
            _db = db;
            _logger = logger;
            _config = config;
        }

            [HttpGet("token/raw")]
            public IActionResult InspectRawToken()
            {
                try
                {
                    var authHeader = Request.Headers.ContainsKey("Authorization") ? Request.Headers["Authorization"].ToString() : null;
                    _logger.LogInformation("InspectRawToken called. Authorization header present: {hasAuth}", !string.IsNullOrEmpty(authHeader));

                    string? token = null;
                    if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
                    {
                        token = authHeader.Substring("Bearer ".Length).Trim();
                    }

                    // mask token for logs/response
                    string? masked = token == null ? null : (token.Length > 10 ? token.Substring(0, 6) + "..." + token.Substring(token.Length - 4) : token);
                    return Ok(new { ok = true, hasAuthorizationHeader = !string.IsNullOrEmpty(authHeader), tokenMasked = masked });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "InspectRawToken failed");
                    return StatusCode(500, new { ok = false, error = ex.Message });
                }
            }

        [HttpGet("token")]
        [Authorize]
        public IActionResult InspectToken()
        {
            try
            {
                var claims = User.Claims.Select(c => new { c.Type, c.Value }).ToList();
                return Ok(new { ok = true, claims });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "InspectToken failed");
                return StatusCode(500, new { ok = false, error = ex.Message });
            }
        }

        [HttpPost("token/validate")]
        public IActionResult ValidateToken([FromBody] DebugTokenRequest? request)
        {
            try
            {
                var authHeader = Request.Headers.ContainsKey("Authorization") ? Request.Headers["Authorization"].ToString() : null;
                string? token = request?.Token;
                if (string.IsNullOrEmpty(token) && !string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    token = authHeader.Substring("Bearer ".Length).Trim();
                }

                if (string.IsNullOrWhiteSpace(token))
                {
                    return BadRequest(new { ok = false, error = "No token supplied. Provide in Authorization header or request body." });
                }

                var jwtKey = _config["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY");
                var jwtIssuer = _config["Jwt:Issuer"] ?? Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "futureofthejobsearch";
                if (string.IsNullOrEmpty(jwtKey))
                {
                    return StatusCode(500, new { ok = false, error = "JWT signing key not configured on server." });
                }

                var handler = new JwtSecurityTokenHandler();
                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwtIssuer,
                    ValidateAudience = false,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                    ClockSkew = TimeSpan.FromMinutes(1),
                    NameClaimType = "sub"
                };

                try
                {
                    var principal = handler.ValidateToken(token, validationParameters, out var validatedToken);
                    var claims = principal.Claims.Select(c => new { c.Type, c.Value }).ToList();
                    return Ok(new { ok = true, validated = true, claims });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Manual token validation failed");
                    return Unauthorized(new { ok = false, validated = false, error = ex.Message });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ValidateToken failed");
                return StatusCode(500, new { ok = false, error = ex.Message });
            }
        }

        [HttpGet("db")]
        public async Task<IActionResult> CheckDb()
        {
            try
            {
                // Run a lightweight query
                var now = await _db.Database.ExecuteSqlRawAsync("SELECT 1");
                return Ok(new { ok = true, message = "DB connected" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DB connectivity check failed");
                return StatusCode(500, new { ok = false, error = ex.Message });
            }
        }

        [HttpGet("conversations/sample")]
        public async Task<IActionResult> SampleConversations()
        {
            try
            {
                var convs = await _db.Conversations.Include(c => c.Participants).OrderByDescending(c => c.LastMessageAt).Take(10).ToListAsync();
                return Ok(convs.Select(c => new { c.Id, c.Subject, c.PositionId, ParticipantCount = c.Participants.Count, c.LastMessageAt }));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load sample conversations");
                return StatusCode(500, new { ok = false, error = ex.Message });
            }
        }
    }
}

public class DebugTokenRequest
{
    public string? Token { get; set; }
}
