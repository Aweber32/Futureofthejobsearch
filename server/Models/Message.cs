using System;

namespace FutureOfTheJobSearch.Server.Models
{
    public class Message
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid ConversationId { get; set; }
        public Conversation Conversation { get; set; } = null!;

        public string SenderUserId { get; set; } = null!;
        public string? SenderDisplayName { get; set; }

        public string? Text { get; set; }

        // Read receipts will be handled by ConversationParticipant.LastReadAt
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? EditedAt { get; set; }
    }
}
