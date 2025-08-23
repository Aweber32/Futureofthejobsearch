using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FutureOfTheJobSearch.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployerFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CompanyDescription",
                table: "Employers",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CompanySize",
                table: "Employers",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Headquarters",
                table: "Employers",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CompanyDescription",
                table: "Employers");

            migrationBuilder.DropColumn(
                name: "CompanySize",
                table: "Employers");

            migrationBuilder.DropColumn(
                name: "Headquarters",
                table: "Employers");
        }
    }
}
