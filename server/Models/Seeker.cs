using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FutureOfTheJobSearch.Server.Models
{
    public class Seeker
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string UserId { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? FirstName { get; set; }

        [MaxLength(100)]
        public string? LastName { get; set; }

        [MaxLength(20)]
        public string? PhoneNumber { get; set; }

        [MaxLength(2000)]
        public string? ProfessionalSummary { get; set; }

        // Comma-separated skills
        [MaxLength(1000)]
        public string? Skills { get; set; }

        // Paths/URLs to uploaded assets
        public string? ResumeUrl { get; set; }
        public string? VideoUrl { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
