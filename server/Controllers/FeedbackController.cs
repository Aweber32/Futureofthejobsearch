using Microsoft.AspNetCore.Mvc;
using FutureOfTheJobSearch.Server.Data;
using FutureOfTheJobSearch.Server.Models;
using FutureOfTheJobSearch.Server.DTOs;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace FutureOfTheJobSearch.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FeedbackController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<FeedbackController> _logger;

        public FeedbackController(ApplicationDbContext db, ILogger<FeedbackController> logger)
        {
            _db = db;
            _logger = logger;
        }

        [HttpPost("submit")]
        public async Task<IActionResult> SubmitFeedback([FromBody] SubmitFeedbackRequest req)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { error = "Invalid feedback data", details = ModelState });

            try
            {
                var feedback = new Feedback
                {
                    PageName = req.PageName,
                    Scope = req.Scope,
                    Rating = req.Rating,
                    Notes = req.Notes,
                    CreatedAt = DateTime.UtcNow
                };

                _db.Feedback.Add(feedback);
                await _db.SaveChangesAsync();

                _logger.LogInformation($"[Feedback] Saved: PageName={feedback.PageName}, Scope={feedback.Scope}, Rating={feedback.Rating}");

                return Ok(new FeedbackResponse
                {
                    Id = feedback.Id,
                    PageName = feedback.PageName,
                    Scope = feedback.Scope,
                    Rating = feedback.Rating,
                    Notes = feedback.Notes,
                    CreatedAt = feedback.CreatedAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save feedback");
                return StatusCode(500, new { error = "Failed to save feedback", detail = ex.Message });
            }
        }
    }
}
