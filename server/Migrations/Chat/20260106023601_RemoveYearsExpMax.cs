using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FutureOfTheJobSearch.Server.Migrations.Chat
{
    /// <inheritdoc />
    public partial class RemoveYearsExpMax : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "YearsExpMax",
                table: "PositionPreferences");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "YearsExpMax",
                table: "PositionPreferences",
                type: "int",
                nullable: true);
        }
    }
}
