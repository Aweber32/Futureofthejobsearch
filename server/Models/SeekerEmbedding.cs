using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FutureOfTheJobSearch.Server.Models
{
    public class SeekerEmbedding
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int SeekerId { get; set; }  // FK to Seeker.Id

        [Required]
        public byte[] Embedding { get; set; } = Array.Empty<byte>();  // Store numpy array as bytes (VARBINARY(MAX))

        [Required]
        [MaxLength(50)]
        public string ModelVersion { get; set; } = string.Empty;  // e.g., "all-mpnet-base-v2-v1"

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        [ForeignKey("SeekerId")]
        public Seeker Seeker { get; set; } = null!;
    }
}
