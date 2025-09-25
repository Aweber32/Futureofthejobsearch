using System;
using System.Collections.Generic;

namespace FutureOfTheJobSearch.Server.Models
{
    public class Conversation
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string? Subject { get; set; }
        public int? PositionId { get; set; }
        public string? LastMessageText { get; set; }
        public DateTimeOffset? LastMessageAt { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        public ICollection<Message> Messages { get; set; } = new List<Message>();
        public ICollection<ConversationParticipant> Participants { get; set; } = new List<ConversationParticipant>();
    }
}
