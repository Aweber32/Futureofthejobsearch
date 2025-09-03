namespace FutureOfTheJobSearch.Server.DTOs
{
    public class SeekerInterestRequest
    {
        public int PositionId { get; set; }
        public int SeekerId { get; set; }
        public bool Interested { get; set; }
    }
}
