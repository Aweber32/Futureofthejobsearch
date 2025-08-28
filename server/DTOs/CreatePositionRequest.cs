using System.Collections.Generic;

namespace FutureOfTheJobSearch.Server.DTOs
{
    public class CreatePositionRequest
    {
        public string Title { get; set; }
        public string Category { get; set; }
        public string Description { get; set; }
        public string EmploymentType { get; set; }
        public string WorkSetting { get; set; }
        public string TravelRequirements { get; set; }
        public List<string> EducationLevels { get; set; }
        public List<string> Experiences { get; set; }
        public List<string> Skills { get; set; }
        public string SalaryType { get; set; }
        public decimal? SalaryValue { get; set; }
    public decimal? SalaryMin { get; set; }
    public decimal? SalaryMax { get; set; }
    public string? PosterVideoUrl { get; set; }
    }
}
