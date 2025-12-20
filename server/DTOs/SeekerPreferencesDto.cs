namespace FutureOfTheJobSearch.Server.DTOs
{
    public class SavePreferencesRequest
    {
        public string? JobCategory { get; set; }
        public string JobCategoryPriority { get; set; } = "None";

        public string? WorkSetting { get; set; } // Comma-separated
        public string WorkSettingPriority { get; set; } = "None";

        public List<string>? PreferredCities { get; set; } // Max 3 cities
        
        public string? Salary { get; set; }
        public string SalaryPriority { get; set; } = "None";

        public string? TravelRequirements { get; set; }
        public string TravelRequirementsPriority { get; set; } = "None";

        public string? CompanySize { get; set; }
        public string CompanySizePriority { get; set; } = "None";

        public string? EmploymentType { get; set; }
        public string EmploymentTypePriority { get; set; } = "None";
    }

    public class PreferencesResponse
    {
        public int Id { get; set; }
        public string? JobCategory { get; set; }
        public string JobCategoryPriority { get; set; } = "None";

        public string? WorkSetting { get; set; }
        public string WorkSettingPriority { get; set; } = "None";

        public List<string>? PreferredCities { get; set; }
        public List<CityCoordinates>? CityLatLongs { get; set; }

        public string? Salary { get; set; }
        public string SalaryPriority { get; set; } = "None";

        public string? TravelRequirements { get; set; }
        public string TravelRequirementsPriority { get; set; } = "None";

        public string? CompanySize { get; set; }
        public string CompanySizePriority { get; set; } = "None";

        public string? EmploymentType { get; set; }
        public string EmploymentTypePriority { get; set; } = "None";

        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class CityCoordinates
    {
        public string City { get; set; } = string.Empty;
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }
}
