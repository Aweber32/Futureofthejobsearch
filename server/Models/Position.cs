using System;
using System.ComponentModel.DataAnnotations;

namespace FutureOfTheJobSearch.Server.Models
{
    public class Position
    {
        [Key]
        public int Id { get; set; }

        public int EmployerId { get; set; }
        public Employer Employer { get; set; }

        public string Title { get; set; }
        public string Category { get; set; }
        public string Description { get; set; }
        public string EmploymentType { get; set; }
        public string WorkSetting { get; set; }
        public string TravelRequirements { get; set; }
    // normalized related collections
    public List<PositionEducation> Educations { get; set; }
    public List<PositionExperience> Experiences { get; set; }
    public List<PositionSkill> SkillsList { get; set; }

        public string SalaryType { get; set; }
        public decimal? SalaryValue { get; set; }
    public decimal? SalaryMin { get; set; }
    public decimal? SalaryMax { get; set; }

    public string? PosterVideoUrl { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
