using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FutureOfTheJobSearch.Server.Migrations.Chat
{
    /// <inheritdoc />
    public partial class UpdatePositionPreferencesSalaryFormat : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PreferredSalaryMax",
                table: "PositionPreferences");

            migrationBuilder.RenameColumn(
                name: "PreferredSalaryMin",
                table: "PositionPreferences",
                newName: "PreferredSalary");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "PreferredSalary",
                table: "PositionPreferences",
                newName: "PreferredSalaryMin");

            migrationBuilder.AddColumn<string>(
                name: "PreferredSalaryMax",
                table: "PositionPreferences",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
