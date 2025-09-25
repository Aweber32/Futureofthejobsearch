using System.Collections.Generic;

namespace FutureOfTheJobSearch.Server.DTOs
{
    public class CreateConversationRequest
    {
        public string OtherUserId { get; set; } = null!; // the user to open 1:1 with
        public int? PositionId { get; set; }
        public string? Subject { get; set; }
    }
}
