using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FutureOfTheJobSearch.Server.Migrations
{
    public partial class AddPositionInterests : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // create table only if it does not already exist
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.PositionInterests', N'U') IS NULL
BEGIN
    CREATE TABLE [PositionInterests] (
        [Id] int NOT NULL IDENTITY PRIMARY KEY,
        [PositionId] int NOT NULL,
        [SeekerId] int NOT NULL,
        [Interested] bit NOT NULL,
        [ReviewedAt] datetime2 NOT NULL,
        CONSTRAINT [FK_PositionInterests_Positions_PositionId] FOREIGN KEY ([PositionId]) REFERENCES [Positions] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_PositionInterests_Seekers_SeekerId] FOREIGN KEY ([SeekerId]) REFERENCES [Seekers] ([Id]) ON DELETE CASCADE
    );
END
");

            migrationBuilder.CreateIndex(
                name: "IX_PositionInterests_PositionId",
                table: "PositionInterests",
                column: "PositionId");

            migrationBuilder.CreateIndex(
                name: "IX_PositionInterests_SeekerId",
                table: "PositionInterests",
                column: "SeekerId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PositionInterests");
        }
    }
}
