using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using FutureOfTheJobSearch.Server.Data;
using FutureOfTheJobSearch.Server.DTOs;
using FutureOfTheJobSearch.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace FutureOfTheJobSearch.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ConversationsController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<ConversationsController> _logger;

        public ConversationsController(ApplicationDbContext db, ILogger<ConversationsController> logger)
        {
            _db = db;
            _logger = logger;
        }

        // POST api/conversations
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateConversationRequest req)
        {
            // Log header presence to debug 401 issues
            var authHeader = Request.Headers.ContainsKey("Authorization") ? Request.Headers["Authorization"].ToString() : null;
            _logger.LogInformation("CreateConversation called. Authorization header present: {hasAuth}", !string.IsNullOrEmpty(authHeader));

            var userId = User.FindFirst("sub")?.Value ?? User.Identity?.Name;
            _logger.LogInformation("CreateConversation: resolved userId='{userId}'", userId ?? "(null)");
            if (string.IsNullOrEmpty(userId)) { _logger.LogWarning("CreateConversation unauthorized: no user id in claims"); return Unauthorized(); }

            // Enforce 1:1 uniqueness: if conversation already exists between these two users for the same position, return it
            var existing = await _db.Conversations
                .Include(c => c.Participants)
                .Where(c => c.PositionId == req.PositionId && c.Participants.Any(p => p.UserId == userId) && c.Participants.Any(p => p.UserId == req.OtherUserId))
                .FirstOrDefaultAsync();

            if (existing != null)
            {
                var dto = new ConversationDto
                {
                    Id = existing.Id,
                    Subject = existing.Subject,
                    PositionId = existing.PositionId,
                    LastMessageText = existing.LastMessageText,
                    LastMessageAt = existing.LastMessageAt,
                    ParticipantUserIds = existing.Participants.Select(p => p.UserId)
                };
                return Ok(dto);
            }

            var conv = new Conversation
            {
                Subject = req.Subject,
                PositionId = req.PositionId,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            conv.Participants.Add(new ConversationParticipant { Conversation = conv, UserId = userId, Role = null, LastReadAt = DateTimeOffset.UtcNow });
            conv.Participants.Add(new ConversationParticipant { Conversation = conv, UserId = req.OtherUserId, Role = null });

            _db.Conversations.Add(conv);
            try
            {
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving new conversation. userId={userId}", userId);
                return StatusCode(500, new { ok = false, error = "Error saving conversation" });
            }

            var result = new ConversationDto
            {
                Id = conv.Id,
                Subject = conv.Subject,
                PositionId = conv.PositionId,
                LastMessageAt = conv.LastMessageAt,
                ParticipantUserIds = conv.Participants.Select(p => p.UserId)
            };
            return Ok(result);
        }

        // GET api/conversations
        [HttpGet]
        public async Task<IActionResult> List()
        {
            var userId = User.FindFirst("sub")?.Value ?? User.Identity?.Name;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var convs = await _db.Conversations
                .Include(c => c.Participants)
                .Where(c => c.Participants.Any(p => p.UserId == userId))
                .OrderByDescending(c => c.LastMessageAt)
                .Take(50)
                .ToListAsync();

            var dtos = convs.Select(c => new ConversationDto
            {
                Id = c.Id,
                Subject = c.Subject,
                PositionId = c.PositionId,
                LastMessageText = c.LastMessageText,
                LastMessageAt = c.LastMessageAt,
                ParticipantUserIds = c.Participants.Select(p => p.UserId),
                UnreadCount = c.Participants.FirstOrDefault(p => p.UserId == userId)?.LastReadAt == null ? (c.LastMessageAt != null ? 1 : 0) : (c.LastMessageAt > c.Participants.First(p => p.UserId == userId).LastReadAt ? 1 : 0)
            }).ToList();

            return Ok(dtos);
        }

        // GET api/conversations/{id}/messages?before={ticks}&take=50
        [HttpGet("{id}/messages")]
        public async Task<IActionResult> GetMessages(string id, [FromQuery] long? before, [FromQuery] int take = 50)
        {
            if (!Guid.TryParse(id, out var convId)) return BadRequest("Invalid id");
            var userId = User.FindFirst("sub")?.Value ?? User.Identity?.Name;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var isParticipant = await _db.ConversationParticipants.AnyAsync(cp => cp.ConversationId == convId && cp.UserId == userId);
            if (!isParticipant) return Forbid();

            DateTimeOffset? beforeDt = null;
            if (before.HasValue && before.Value > 0) beforeDt = DateTimeOffset.FromUnixTimeMilliseconds(before.Value);

            var query = _db.Messages.Where(m => m.ConversationId == convId);
            if (beforeDt.HasValue) query = query.Where(m => m.CreatedAt < beforeDt.Value);

            var messages = await query.OrderByDescending(m => m.CreatedAt).Take(take).ToListAsync();

            var dtos = messages.Select(m => new MessageDto
            {
                Id = m.Id,
                ConversationId = m.ConversationId,
                SenderUserId = m.SenderUserId,
                SenderDisplayName = m.SenderDisplayName,
                Text = m.Text,
                CreatedAt = m.CreatedAt
            });

            return Ok(dtos);
        }
    }
}
