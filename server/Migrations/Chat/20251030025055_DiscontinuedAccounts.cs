using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FutureOfTheJobSearch.Server.Migrations.Chat
{
    /// <inheritdoc />
    public partial class DiscontinuedAccounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ArchivedEmail",
                table: "AspNetUsers",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ArchivedUserName",
                table: "AspNetUsers",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DiscontinuedAt",
                table: "AspNetUsers",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDiscontinued",
                table: "AspNetUsers",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ArchivedEmail",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ArchivedUserName",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "DiscontinuedAt",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "IsDiscontinued",
                table: "AspNetUsers");
        }
    }
}
