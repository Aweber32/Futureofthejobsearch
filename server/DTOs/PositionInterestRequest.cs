namespace FutureOfTheJobSearch.Server.DTOs
{
    public class PositionInterestRequest
    {
        public int PositionId { get; set; }
        public int SeekerId { get; set; }
        public bool Interested { get; set; }
    }
}
