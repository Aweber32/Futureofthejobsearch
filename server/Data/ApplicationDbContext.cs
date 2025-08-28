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
        }
    }
}
