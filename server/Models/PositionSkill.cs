using System.ComponentModel.DataAnnotations;

namespace FutureOfTheJobSearch.Server.Models
{
    public class PositionSkill
    {
        [Key]
        public int Id { get; set; }
        public int PositionId { get; set; }
        public Position Position { get; set; }
        public string Skill { get; set; }
    }
}
