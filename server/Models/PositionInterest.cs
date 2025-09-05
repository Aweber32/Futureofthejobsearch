using System;

namespace FutureOfTheJobSearch.Server.Models
{
    public class PositionInterest
    {
        public int Id { get; set; }

        // the position being reviewed
        public int PositionId { get; set; }
    public Position? Position { get; set; }

        // the seeker expressing interest
        public int SeekerId { get; set; }
    public Seeker? Seeker { get; set; }

        // whether seeker marked Interested (true) or Not Interested (false)
        public bool Interested { get; set; }

        public DateTime ReviewedAt { get; set; } = DateTime.UtcNow;
    }
}
