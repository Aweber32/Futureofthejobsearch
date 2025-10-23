using System;
using System.ComponentModel.DataAnnotations;

namespace FutureOfTheJobSearch.Server.Models
{
    public class SeekerInterest
    {
        [Key]
        public int Id { get; set; }

        public int PositionId { get; set; }
        public Position Position { get; set; }

        // employer who reviewed (redundant but useful for queries)
        public int EmployerId { get; set; }

        // the job poster (seeker) being reviewed
        public int SeekerId { get; set; }
        public Seeker Seeker { get; set; }

        // whether the employer marked interested
        public bool Interested { get; set; }

        public DateTime ReviewedAt { get; set; } = DateTime.UtcNow;

            // Rank for ordering candidates (lower number = higher priority)
            // Null means unranked
            public int? Rank { get; set; }
    }
}
