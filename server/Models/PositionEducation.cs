using System.ComponentModel.DataAnnotations;

namespace FutureOfTheJobSearch.Server.Models
{
    public class PositionEducation
    {
        [Key]
        public int Id { get; set; }
        public int PositionId { get; set; }
        public Position Position { get; set; }
        public string Education { get; set; }
    }
}
