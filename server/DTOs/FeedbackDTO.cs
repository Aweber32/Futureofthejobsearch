using System.ComponentModel.DataAnnotations;
using FutureOfTheJobSearch.Server.Models;
using Microsoft.AspNetCore.Mvc;

namespace FutureOfTheJobSearch.Server.DTOs
{
    public class SubmitFeedbackRequest
    {
        [Required]
        [MaxLength(255)]
        public string PageName { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Scope { get; set; } = "page";

        [Required]
        [Range(1, 5)]
        public int Rating { get; set; }

        [MaxLength(1000)]
        public string? Notes { get; set; }
    }

    public class FeedbackResponse
    {
        public int Id { get; set; }
        public string PageName { get; set; } = string.Empty;
        public string Scope { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
