using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FutureOfTheJobSearch.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddAddressToEmployer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "Employers",
                type: "nvarchar(512)",
                maxLength: 512,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Address",
                table: "Employers");
        }
    }
}
