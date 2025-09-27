using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FutureOfTheJobSearch.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddCityStateProfessionalSummaryToSeeker : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // These columns were already added in the initial migration in this branch.
            // They were included again when the migration was generated. Skip adding
            // them here to avoid duplicate column errors when applying migrations.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Nothing to drop in this migration because the columns were not added here.
        }
    }
}
