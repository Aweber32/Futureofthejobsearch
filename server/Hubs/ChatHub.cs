using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using FutureOfTheJobSearch.Server.Data;
using FutureOfTheJobSearch.Server.DTOs;
using FutureOfTheJobSearch.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace FutureOfTheJobSearch.Server.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<ChatHub> _logger;

        public ChatHub(ApplicationDbContext db, ILogger<ChatHub> logger)
        {
            _db = db;
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            _logger.LogInformation("SignalR: Connection established. ConnectionId={connectionId}, User={user}", Context.ConnectionId, Context.UserIdentifier ?? Context.User?.Identity?.Name);
            await base.OnConnectedAsync();
        }

        public async Task JoinConversation(string conversationId)
        {
            _logger.LogInformation("JoinConversation requested: conversationId={conversationId}, connectionId={connectionId}", conversationId, Context.ConnectionId);
            if (!Guid.TryParse(conversationId, out var convId)) return;

            // ensure user is participant
            var userId = Context.UserIdentifier ?? Context.User?.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) { _logger.LogWarning("JoinConversation aborted: missing userId"); Context.Abort(); return; }

            var isParticipant = await _db.ConversationParticipants.AnyAsync(cp => cp.ConversationId == convId && cp.UserId == userId);
            if (!isParticipant) { _logger.LogWarning("JoinConversation forbidden: user not participant. userId={userId}, conv={conv}", userId, convId); throw new HubException("Not a participant"); }

            await Groups.AddToGroupAsync(Context.ConnectionId, conversationId);
            _logger.LogInformation("Joined group: conversationId={conversationId}, connectionId={connectionId}", conversationId, Context.ConnectionId);
        }

        public async Task LeaveConversation(string conversationId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, conversationId);
        }

        public async Task SendMessage(string conversationId, CreateMessageRequest request)
        {
            _logger.LogInformation("SendMessage called: conversationId={conversationId}, textLen={len}, connectionId={connectionId}", conversationId, request?.Text?.Length ?? 0, Context.ConnectionId);

            if (!Guid.TryParse(conversationId, out var convId)) throw new HubException("Invalid conversationId");
            var userId = Context.UserIdentifier ?? Context.User?.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) { _logger.LogWarning("SendMessage unauthorized: missing userId"); throw new HubException("Unauthorized"); }

            // participant check
            var participant = await _db.ConversationParticipants.FirstOrDefaultAsync(cp => cp.ConversationId == convId && cp.UserId == userId);
            if (participant == null) { _logger.LogWarning("SendMessage forbidden: not participant. userId={userId}, conv={convId}", userId, convId); throw new HubException("Not a participant"); }

            var message = new Message
            {
                ConversationId = convId,
                SenderUserId = userId,
                SenderDisplayName = Context.User?.Identity?.Name ?? userId,
                Text = request?.Text ?? string.Empty
            };

            _db.Messages.Add(message);

            // update conversation
            var conv = await _db.Conversations.FirstOrDefaultAsync(c => c.Id == convId);
            if (conv != null)
            {
                conv.LastMessageText = message.Text;
                conv.LastMessageAt = message.CreatedAt;
                conv.UpdatedAt = DateTimeOffset.UtcNow;
            }

            try
            {
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving message to DB: conversationId={conversationId}, userId={userId}", conversationId, userId);
                throw new HubException("Server error saving message");
            }

            var dto = new MessageDto
            {
                Id = message.Id,
                ConversationId = message.ConversationId,
                SenderUserId = message.SenderUserId,
                SenderDisplayName = message.SenderDisplayName,
                Text = message.Text,
                CreatedAt = message.CreatedAt
            };

            await Clients.Group(conversationId).SendAsync("MessageReceived", dto);
            _logger.LogInformation("MessageReceived broadcasted: messageId={messageId}, conv={conv}", dto.Id, conversationId);
        }

        public async Task MarkRead(string conversationId)
        {
            _logger.LogInformation("MarkRead called: conversationId={conversationId}, connectionId={connectionId}", conversationId, Context.ConnectionId);
            if (!Guid.TryParse(conversationId, out var convId)) return;
            var userId = Context.UserIdentifier ?? Context.User?.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return;

            var participant = await _db.ConversationParticipants.FirstOrDefaultAsync(cp => cp.ConversationId == convId && cp.UserId == userId);
            if (participant == null) return;

            participant.LastReadAt = DateTimeOffset.UtcNow;
            try
            {
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving LastReadAt for conversationId={conversationId}, userId={userId}", conversationId, userId);
            }

            await Clients.Group(conversationId).SendAsync("ReadReceipt", new { userId = userId, conversationId = conversationId, lastReadAt = participant.LastReadAt });
        }
    }
}
