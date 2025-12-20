using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FutureOfTheJobSearch.Server.Models
{
    public class SeekerPreferences
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int SeekerId { get; set; }

        [ForeignKey("SeekerId")]
        public Seeker? Seeker { get; set; }

        // Job Category preference
        [MaxLength(200)]
        public string? JobCategory { get; set; }
        
        [MaxLength(50)]
        public string JobCategoryPriority { get; set; } = "None"; // None, Flexible, DealBreaker

        // Work Setting preference (Remote, Hybrid, In-Person)
        [MaxLength(500)]
        public string? WorkSetting { get; set; } // Comma-separated if multiple
        
        [MaxLength(50)]
        public string WorkSettingPriority { get; set; } = "None";

        // Preferred Cities (JSON array of city names)
        public string? PreferredCities { get; set; } // JSON: ["City1", "City2", "City3"]
        
        // City Coordinates (JSON array of {city, lat, lon})
        public string? CityLatLongs { get; set; } // JSON: [{"city":"Seattle","lat":47.6,"lon":-122.3},...]

        // Salary preference
        [MaxLength(200)]
        public string? Salary { get; set; }
        
        [MaxLength(50)]
        public string SalaryPriority { get; set; } = "None";

        // Travel Requirements preference
        [MaxLength(100)]
        public string? TravelRequirements { get; set; }
        
        [MaxLength(50)]
        public string TravelRequirementsPriority { get; set; } = "None";

        // Company Size preference
        [MaxLength(100)]
        public string? CompanySize { get; set; } // Small, Medium, Large
        
        [MaxLength(50)]
        public string CompanySizePriority { get; set; } = "None";

        // Employment Type preference
        [MaxLength(100)]
        public string? EmploymentType { get; set; } // Full-Time, Part-Time, Contract, Internship
        
        [MaxLength(50)]
        public string EmploymentTypePriority { get; set; } = "None";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
