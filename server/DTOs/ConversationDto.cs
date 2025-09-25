using System;
using System.Collections.Generic;

namespace FutureOfTheJobSearch.Server.DTOs
{
    public class ConversationDto
    {
        public Guid Id { get; set; }
        public string? Subject { get; set; }
        public int? PositionId { get; set; }
        public string? LastMessageText { get; set; }
        public DateTimeOffset? LastMessageAt { get; set; }
        public int UnreadCount { get; set; }
        public IEnumerable<string> ParticipantUserIds { get; set; } = Array.Empty<string>();
    }
}
