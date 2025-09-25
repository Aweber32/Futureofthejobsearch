using System;

namespace FutureOfTheJobSearch.Server.DTOs
{
    public class MessageDto
    {
        public Guid Id { get; set; }
        public Guid ConversationId { get; set; }
        public string SenderUserId { get; set; } = null!;
        public string? SenderDisplayName { get; set; }
        public string? Text { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }
}
