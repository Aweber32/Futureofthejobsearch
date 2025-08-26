using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FutureOfTheJobSearch.Server.Models
{
    public enum CompanySize
    {
        Small = 0,   // <50
        Medium = 1,  // 50-999
        Large = 2    // 1000+
    }

    public class Employer
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string UserId { get; set; } = string.Empty;

        [ForeignKey(nameof(UserId))]
        public ApplicationUser? User { get; set; }

        [Required]
        [MaxLength(256)]
        public string CompanyName { get; set; } = string.Empty;

        [MaxLength(512)]
        public string? Website { get; set; }

        [MaxLength(200)]
        public string? ContactName { get; set; }

        [MaxLength(256)]
        public string? ContactEmail { get; set; }

    // Keep LogoUrl for now; we can add an upload endpoint + blob storage later
    public string? LogoUrl { get; set; }

    [MaxLength(2000)]
    public string? CompanyDescription { get; set; }

    public CompanySize? CompanySize { get; set; }

    [MaxLength(128)]
    public string? City { get; set; }

    [MaxLength(64)]
    public string? State { get; set; }

    [MaxLength(512)]
    public string? Address { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

