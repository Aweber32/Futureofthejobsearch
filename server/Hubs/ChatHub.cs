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

        public ChatHub(ApplicationDbContext db)
        {
            _db = db;
        }

        public override async Task OnConnectedAsync()
        {
            await base.OnConnectedAsync();
        }

        public async Task JoinConversation(string conversationId)
        {
            if (!Guid.TryParse(conversationId, out var convId)) return;

            // ensure user is participant
            var userId = Context.UserIdentifier ?? Context.User?.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) { Context.Abort(); return; }

            var isParticipant = await _db.ConversationParticipants.AnyAsync(cp => cp.ConversationId == convId && cp.UserId == userId);
            if (!isParticipant) { throw new HubException("Not a participant"); }

            await Groups.AddToGroupAsync(Context.ConnectionId, conversationId);
        }

        public async Task LeaveConversation(string conversationId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, conversationId);
        }

        public async Task SendMessage(string conversationId, CreateMessageRequest request)
        {
            if (!Guid.TryParse(conversationId, out var convId)) throw new HubException("Invalid conversationId");
            var userId = Context.UserIdentifier ?? Context.User?.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) throw new HubException("Unauthorized");

            // participant check
            var participant = await _db.ConversationParticipants.FirstOrDefaultAsync(cp => cp.ConversationId == convId && cp.UserId == userId);
            if (participant == null) throw new HubException("Not a participant");

            var message = new Message
            {
                ConversationId = convId,
                SenderUserId = userId,
                SenderDisplayName = Context.User?.Identity?.Name ?? userId,
                Text = request.Text
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

            await _db.SaveChangesAsync();

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
        }

        public async Task MarkRead(string conversationId)
        {
            if (!Guid.TryParse(conversationId, out var convId)) return;
            var userId = Context.UserIdentifier ?? Context.User?.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return;

            var participant = await _db.ConversationParticipants.FirstOrDefaultAsync(cp => cp.ConversationId == convId && cp.UserId == userId);
            if (participant == null) return;

            participant.LastReadAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync();

            await Clients.Group(conversationId).SendAsync("ReadReceipt", new { userId = userId, conversationId = conversationId, lastReadAt = participant.LastReadAt });
        }
    }
}
