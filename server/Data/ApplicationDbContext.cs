using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using FutureOfTheJobSearch.Server.Models;

namespace FutureOfTheJobSearch.Server.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        public DbSet<Employer> Employers { get; set; }
    public DbSet<Seeker> Seekers { get; set; }
    public DbSet<Position> Positions { get; set; }
    public DbSet<PositionSkill> PositionSkills { get; set; }
    public DbSet<PositionExperience> PositionExperiences { get; set; }
    public DbSet<PositionEducation> PositionEducations { get; set; }
    public DbSet<SeekerInterest> SeekerInterests { get; set; }
    public DbSet<PositionInterest> PositionInterests { get; set; }
    public DbSet<Conversation> Conversations { get; set; }
    public DbSet<ConversationParticipant> ConversationParticipants { get; set; }
    public DbSet<Message> Messages { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
            builder.Entity<Employer>()
                .HasIndex(e => e.UserId)
                .IsUnique();

            // Ensure one employer record per company name
            builder.Entity<Employer>()
                .HasIndex(e => e.CompanyName)
                .IsUnique();

            builder.Entity<Seeker>()
                .HasIndex(s => s.UserId)
                .IsUnique();

            builder.Entity<Position>()
                .HasOne(p => p.Employer)
                .WithMany()
                .HasForeignKey(p => p.EmployerId)
                .OnDelete(DeleteBehavior.Cascade);

            // Explicit precision for SalaryValue to avoid EF default-warning and ensure consistent SQL type
            builder.Entity<Position>()
                .Property(p => p.SalaryValue)
                .HasPrecision(18, 2);

            // Explicit precision for SalaryMin/SalaryMax
            builder.Entity<Position>()
                .Property(p => p.SalaryMin)
                .HasPrecision(18, 2);

            builder.Entity<Position>()
                .Property(p => p.SalaryMax)
                .HasPrecision(18, 2);

            builder.Entity<PositionSkill>()
                .HasOne(s => s.Position)
                .WithMany(p => p.SkillsList)
                .HasForeignKey(s => s.PositionId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<PositionExperience>()
                .HasOne(x => x.Position)
                .WithMany(p => p.Experiences)
                .HasForeignKey(x => x.PositionId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<PositionEducation>()
                .HasOne(x => x.Position)
                .WithMany(p => p.Educations)
                .HasForeignKey(x => x.PositionId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<SeekerInterest>()
                .HasOne(si => si.Position)
                .WithMany()
                .HasForeignKey(si => si.PositionId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<SeekerInterest>()
                .HasOne(si => si.Seeker)
                .WithMany()
                .HasForeignKey(si => si.SeekerId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<PositionInterest>()
                .HasOne(pi => pi.Position)
                .WithMany()
                .HasForeignKey(pi => pi.PositionId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<PositionInterest>()
                .HasOne(pi => pi.Seeker)
                .WithMany()
                .HasForeignKey(pi => pi.SeekerId)
                .OnDelete(DeleteBehavior.Cascade);

            // Chat schema: Conversations (1:1 only). Enforce uniqueness of conversation participants pair optionally tied to PositionId.
            builder.Entity<Conversation>(eb => {
                eb.HasKey(c => c.Id);
                eb.HasIndex(c => c.LastMessageAt);
            });

            builder.Entity<ConversationParticipant>(eb => {
                eb.HasKey(cp => new { cp.ConversationId, cp.UserId });
                eb.HasOne(cp => cp.Conversation).WithMany(c => c.Participants).HasForeignKey(cp => cp.ConversationId).OnDelete(DeleteBehavior.Cascade);
            });

            builder.Entity<Message>(eb => {
                eb.HasKey(m => m.Id);
                eb.HasOne(m => m.Conversation).WithMany(c => c.Messages).HasForeignKey(m => m.ConversationId).OnDelete(DeleteBehavior.Cascade);
                eb.HasIndex(m => new { m.ConversationId, m.CreatedAt });
            });
        }
    }
}
