using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using FutureOfTheJobSearch.Server.Data;
using Microsoft.EntityFrameworkCore;

namespace FutureOfTheJobSearch.Server.Controllers
{
    [ApiController]
    [Route("api/debug")]
    public class DebugController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<DebugController> _logger;

        public DebugController(ApplicationDbContext db, ILogger<DebugController> logger)
        {
            _db = db;
            _logger = logger;
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
