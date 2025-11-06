using System.Text.Json.Serialization;

namespace FutureOfTheJobSearch.Server.DTOs
{
    public class PublicPositionDto
    {
        [JsonPropertyName("id")] public int Id { get; set; }
        [JsonPropertyName("title")] public string? Title { get; set; }
        [JsonPropertyName("category")] public string? Category { get; set; }
        [JsonPropertyName("description")] public string? Description { get; set; }
        [JsonPropertyName("employmentType")] public string? EmploymentType { get; set; }
        [JsonPropertyName("workSetting")] public string? WorkSetting { get; set; }
        [JsonPropertyName("travelRequirements")] public string? TravelRequirements { get; set; }

        [JsonPropertyName("salaryType")] public string? SalaryType { get; set; }
        [JsonPropertyName("salaryValue")] public decimal? SalaryValue { get; set; }
        [JsonPropertyName("salaryMin")] public decimal? SalaryMin { get; set; }
        [JsonPropertyName("salaryMax")] public decimal? SalaryMax { get; set; }

        [JsonPropertyName("posterVideoUrl")] public string? PosterVideoUrl { get; set; }

        [JsonPropertyName("skills")] public string[] Skills { get; set; } = System.Array.Empty<string>();
        [JsonPropertyName("educationLevels")] public string[] EducationLevels { get; set; } = System.Array.Empty<string>();
        [JsonPropertyName("experiences")] public string[] Experiences { get; set; } = System.Array.Empty<string>();

        [JsonPropertyName("employerName")] public string? EmployerName { get; set; }
        [JsonPropertyName("employerLogoUrl")] public string? EmployerLogoUrl { get; set; }
        [JsonPropertyName("employerCity")] public string? EmployerCity { get; set; }
        [JsonPropertyName("employerState")] public string? EmployerState { get; set; }
        [JsonPropertyName("employerCompanySize")] public int? EmployerCompanySize { get; set; }
    }
}
