using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FutureOfTheJobSearch.Server.Models
{
    public class PositionEmbedding
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int PositionId { get; set; }  // FK to Position.Id

        [Required]
        public byte[] Embedding { get; set; } = Array.Empty<byte>();  // VARBINARY(MAX)

        [Required]
        [MaxLength(50)]
        public string ModelVersion { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        [ForeignKey("PositionId")]
        public Position Position { get; set; } = null!;
    }
}
