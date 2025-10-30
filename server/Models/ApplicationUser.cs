using Microsoft.AspNetCore.Identity;

namespace FutureOfTheJobSearch.Server.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string? DisplayName { get; set; }

        // Soft-discontinue flag: prevents login but preserves analytics history.
        public bool IsDiscontinued { get; set; }

        // Timestamp for when the account was discontinued (UTC)
        public DateTimeOffset? DiscontinuedAt { get; set; }

        // Preserve original identifiers to free up unique constraints while retaining audit history
        public string? ArchivedEmail { get; set; }
        public string? ArchivedUserName { get; set; }
    }
}
