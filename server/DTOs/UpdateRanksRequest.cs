using System.Collections.Generic;

namespace FutureOfTheJobSearch.Server.DTOs
{
    public class UpdateRanksRequest
    {
        public int PositionId { get; set; }
        public List<RankingItem> Rankings { get; set; } = new List<RankingItem>();
    }

    public class RankingItem
    {
        public int SeekerInterestId { get; set; }
        public int Rank { get; set; }
    }
}
