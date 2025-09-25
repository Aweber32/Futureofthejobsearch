using System;

namespace FutureOfTheJobSearch.Server.Models
{
    public class ConversationParticipant
    {
        public Guid ConversationId { get; set; }
        public Conversation Conversation { get; set; } = null!;

        public string UserId { get; set; } = null!; // ApplicationUser.Id
        public string? Role { get; set; }
        public DateTimeOffset? LastReadAt { get; set; }
        public bool IsMuted { get; set; }
    }
}
