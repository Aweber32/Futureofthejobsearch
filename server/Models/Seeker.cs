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

        // Comma-separated skills
        [MaxLength(1000)]
        public string? Skills { get; set; }

        // Paths/URLs to uploaded assets
        public string? ResumeUrl { get; set; }
        public string? VideoUrl { get; set; }
        public string? HeadshotUrl { get; set; }

    // Structured fields stored as JSON
    public string? ExperienceJson { get; set; }
    public string? EducationJson { get; set; }

    // Additional profile fields
    [MaxLength(100)]
    public string? VisaStatus { get; set; }

    [MaxLength(200)]
    public string? PreferredSalary { get; set; }

    // WorkSetting, Languages, Certifications, Interests stored as comma-separated lists for simplicity
    [MaxLength(500)]
    public string? WorkSetting { get; set; }

    [MaxLength(200)]
    public string? Travel { get; set; }

    [MaxLength(200)]
    public string? Relocate { get; set; }

    [MaxLength(1000)]
    public string? Languages { get; set; }

    [MaxLength(1000)]
    public string? Certifications { get; set; }

    [MaxLength(1000)]
    public string? Interests { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
