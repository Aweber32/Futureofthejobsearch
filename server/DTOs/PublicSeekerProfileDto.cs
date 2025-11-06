using System.Text.Json.Serialization;

namespace FutureOfTheJobSearch.Server.DTOs
{
    public class PublicSeekerProfileDto
    {
        [JsonPropertyName("id")] public int Id { get; set; }
        [JsonPropertyName("firstName")] public string? FirstName { get; set; }
        [JsonPropertyName("lastName")] public string? LastName { get; set; }
        [JsonPropertyName("city")] public string? City { get; set; }
        [JsonPropertyName("state")] public string? State { get; set; }
        [JsonPropertyName("professionalSummary")] public string? ProfessionalSummary { get; set; }

        [JsonPropertyName("skills")] public string? Skills { get; set; }
        [JsonPropertyName("languages")] public string? Languages { get; set; }
        [JsonPropertyName("certifications")] public string? Certifications { get; set; }
        [JsonPropertyName("interests")] public string? Interests { get; set; }

        // Paths/URLs (these are signed on-demand on the client)
        [JsonPropertyName("resumeUrl")] public string? ResumeUrl { get; set; }
        [JsonPropertyName("videoUrl")] public string? VideoUrl { get; set; }
        [JsonPropertyName("headshotUrl")] public string? HeadshotUrl { get; set; }

        // Structured JSON strings as stored on the entity
        [JsonPropertyName("experienceJson")] public string? ExperienceJson { get; set; }
        [JsonPropertyName("educationJson")] public string? EducationJson { get; set; }
    }
}
