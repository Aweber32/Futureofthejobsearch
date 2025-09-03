using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FutureOfTheJobSearch.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddSeekerInterests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // create table only if it does not already exist (prevents failure if table was created manually)
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.SeekerInterests', N'U') IS NULL
BEGIN
    CREATE TABLE [SeekerInterests] (
        [Id] int NOT NULL IDENTITY PRIMARY KEY,
        [PositionId] int NOT NULL,
        [EmployerId] int NOT NULL,
        [SeekerId] int NOT NULL,
        [Interested] bit NOT NULL,
        [ReviewedAt] datetime2 NOT NULL,
        CONSTRAINT [FK_SeekerInterests_Positions_PositionId] FOREIGN KEY ([PositionId]) REFERENCES [Positions] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_SeekerInterests_Seekers_SeekerId] FOREIGN KEY ([SeekerId]) REFERENCES [Seekers] ([Id]) ON DELETE CASCADE
    );
END
");

            migrationBuilder.CreateIndex(
                name: "IX_SeekerInterests_PositionId",
                table: "SeekerInterests",
                column: "PositionId");

            migrationBuilder.CreateIndex(
                name: "IX_SeekerInterests_SeekerId",
                table: "SeekerInterests",
                column: "SeekerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SeekerInterests");
        }
    }
}
