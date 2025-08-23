using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FutureOfTheJobSearch.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddCityStateToEmployer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Headquarters",
                table: "Employers");

            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "Employers",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "State",
                table: "Employers",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "City",
                table: "Employers");

            migrationBuilder.DropColumn(
                name: "State",
                table: "Employers");

            migrationBuilder.AddColumn<string>(
                name: "Headquarters",
                table: "Employers",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true);
        }
    }
}
