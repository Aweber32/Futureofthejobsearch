namespace FutureOfTheJobSearch.Server.DTOs
{
    public class SavePositionPreferencesRequest
    {
        // Filter values
        public string? JobCategory { get; set; }
        public string? EducationLevel { get; set; }
        public int? YearsExpMin { get; set; }
        public int? YearsExpMax { get; set; }
        public string? WorkSetting { get; set; } // Comma-separated
        public string? TravelRequirements { get; set; }
        public string? PreferredSalary { get; set; } // Format: "Type: $min - $max"

        // Priority levels
        public string? JobCategoryPriority { get; set; }
        public string? EducationLevelPriority { get; set; }
        public string? YearsExpPriority { get; set; }
        public string? WorkSettingPriority { get; set; }
        public string? TravelRequirementsPriority { get; set; }
        public string? PreferredSalaryPriority { get; set; }
    }

    public class PositionPreferencesResponse
    {
        public int Id { get; set; }
        public int PositionId { get; set; }
        
        // Filter values
        public string? JobCategory { get; set; }
        public string? EducationLevel { get; set; }
        public int? YearsExpMin { get; set; }
        public int? YearsExpMax { get; set; }
        public string? WorkSetting { get; set; }
        public string? TravelRequirements { get; set; }
        public string? PreferredSalary { get; set; }

        // Priority levels
        public string JobCategoryPriority { get; set; } = "None";
        public string EducationLevelPriority { get; set; } = "None";
        public string YearsExpPriority { get; set; } = "None";
        public string WorkSettingPriority { get; set; } = "None";
        public string TravelRequirementsPriority { get; set; } = "None";
        public string PreferredSalaryPriority { get; set; } = "None";

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
