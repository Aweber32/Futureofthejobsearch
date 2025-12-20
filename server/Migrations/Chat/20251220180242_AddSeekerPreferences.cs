using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FutureOfTheJobSearch.Server.Migrations.Chat
{
    /// <inheritdoc />
    public partial class AddSeekerPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SeekerPreferences",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SeekerId = table.Column<int>(type: "int", nullable: false),
                    JobCategory = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    JobCategoryPriority = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    WorkSetting = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    WorkSettingPriority = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PreferredCities = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CityLatLongs = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Salary = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SalaryPriority = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TravelRequirements = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    TravelRequirementsPriority = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CompanySize = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CompanySizePriority = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    EmploymentType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    EmploymentTypePriority = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SeekerPreferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SeekerPreferences_Seekers_SeekerId",
                        column: x => x.SeekerId,
                        principalTable: "Seekers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SeekerPreferences_SeekerId",
                table: "SeekerPreferences",
                column: "SeekerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SeekerPreferences");
        }
    }
}
