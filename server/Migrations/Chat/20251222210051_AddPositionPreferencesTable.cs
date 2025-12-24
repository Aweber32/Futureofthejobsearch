using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FutureOfTheJobSearch.Server.Migrations.Chat
{
    /// <inheritdoc />
    public partial class AddPositionPreferencesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PositionPreferences",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PositionId = table.Column<int>(type: "int", nullable: false),
                    JobCategory = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EducationLevel = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    YearsExpMin = table.Column<int>(type: "int", nullable: true),
                    YearsExpMax = table.Column<int>(type: "int", nullable: true),
                    WorkSetting = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TravelRequirements = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PreferredSalaryMin = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PreferredSalaryMax = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    JobCategoryPriority = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EducationLevelPriority = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    YearsExpPriority = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    WorkSettingPriority = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TravelRequirementsPriority = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PreferredSalaryPriority = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PositionPreferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PositionPreferences_Positions_PositionId",
                        column: x => x.PositionId,
                        principalTable: "Positions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PositionPreferences_PositionId",
                table: "PositionPreferences",
                column: "PositionId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PositionPreferences");
        }
    }
}
