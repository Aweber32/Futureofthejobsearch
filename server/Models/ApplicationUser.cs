using Microsoft.AspNetCore.Identity;

namespace FutureOfTheJobSearch.Server.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string? DisplayName { get; set; }
    }
}
