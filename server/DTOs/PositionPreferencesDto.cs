namespace FutureOfTheJobSearch.Server.DTOs
{
    using System.Text.Json.Serialization;

    public class SavePositionPreferencesRequest
    {
        // Filter values
        [JsonPropertyName("jobCategory")]
        public string? JobCategory { get; set; }
        
        [JsonPropertyName("educationLevel")]
        public string? EducationLevel { get; set; }
        
        [JsonPropertyName("yearsExpMin")]
        public int? YearsExpMin { get; set; }
        
        [JsonPropertyName("workSetting")]
        public string? WorkSetting { get; set; } // Comma-separated
        
        [JsonPropertyName("travelRequirements")]
        public string? TravelRequirements { get; set; }
        
        [JsonPropertyName("preferredSalary")]
        public string? PreferredSalary { get; set; } // Format: "Type: $min - $max"

        // Priority levels
        [JsonPropertyName("jobCategoryPriority")]
        public string? JobCategoryPriority { get; set; }
        
        [JsonPropertyName("educationLevelPriority")]
        public string? EducationLevelPriority { get; set; }
        
        [JsonPropertyName("yearsExpPriority")]
        public string? YearsExpPriority { get; set; }
        
        [JsonPropertyName("workSettingPriority")]
        public string? WorkSettingPriority { get; set; }
        
        [JsonPropertyName("travelRequirementsPriority")]
        public string? TravelRequirementsPriority { get; set; }
        
        [JsonPropertyName("preferredSalaryPriority")]
        public string? PreferredSalaryPriority { get; set; }
    }

    public class PositionPreferencesResponse
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }
        
        [JsonPropertyName("positionId")]
        public int PositionId { get; set; }
        
        // Filter values
        [JsonPropertyName("jobCategory")]
        public string? JobCategory { get; set; }
        
        [JsonPropertyName("educationLevel")]
        public string? EducationLevel { get; set; }
        
        [JsonPropertyName("yearsExpMin")]
        public int? YearsExpMin { get; set; }
        
        [JsonPropertyName("workSetting")]
        public string? WorkSetting { get; set; }
        
        [JsonPropertyName("travelRequirements")]
        public string? TravelRequirements { get; set; }
        
        [JsonPropertyName("preferredSalary")]
        public string? PreferredSalary { get; set; }

        // Priority levels
        [JsonPropertyName("jobCategoryPriority")]
        public string JobCategoryPriority { get; set; } = "None";
        
        [JsonPropertyName("educationLevelPriority")]
        public string EducationLevelPriority { get; set; } = "None";
        
        [JsonPropertyName("yearsExpPriority")]
        public string YearsExpPriority { get; set; } = "None";
        
        [JsonPropertyName("workSettingPriority")]
        public string WorkSettingPriority { get; set; } = "None";
        
        [JsonPropertyName("travelRequirementsPriority")]
        public string TravelRequirementsPriority { get; set; } = "None";
        
        [JsonPropertyName("preferredSalaryPriority")]
        public string PreferredSalaryPriority { get; set; } = "None";

        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }
        
        [JsonPropertyName("updatedAt")]
        public DateTime UpdatedAt { get; set; }
    }
}
