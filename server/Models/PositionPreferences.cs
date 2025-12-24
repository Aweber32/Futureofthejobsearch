namespace FutureOfTheJobSearch.Server.Models
{
    public class PositionPreferences
    {
        public int Id { get; set; }
        
        // Foreign key to Position
        public int PositionId { get; set; }
        public Position? Position { get; set; }

        // Filter values
        public string? JobCategory { get; set; }
        public string? EducationLevel { get; set; }
        public int? YearsExpMin { get; set; }
        public int? YearsExpMax { get; set; }
        public string? WorkSetting { get; set; } // Comma-separated: Remote, Hybrid, In-Person
        public string? TravelRequirements { get; set; } // Yes, No, Maybe
        public string? PreferredSalary { get; set; } // Format: "Type: $min - $max" (e.g., "Annual: $80,000 - $120,000")

        // Priority levels for each filter
        public string JobCategoryPriority { get; set; } = "None"; // None, Flexible, DealBreaker
        public string EducationLevelPriority { get; set; } = "None";
        public string YearsExpPriority { get; set; } = "None";
        public string WorkSettingPriority { get; set; } = "None";
        public string TravelRequirementsPriority { get; set; } = "None";
        public string PreferredSalaryPriority { get; set; } = "None";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
