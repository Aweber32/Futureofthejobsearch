using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using FutureOfTheJobSearch.Server.Models;

namespace FutureOfTheJobSearch.Server.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        public DbSet<Employer> Employers { get; set; }

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
        }
    }
}
