using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BE.Migrations
{
    /// <inheritdoc />
    public partial class AddReviewFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "booking_id",
                table: "Reviews",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "Reviews",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "Pending");

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                table: "Reviews",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_booking_id",
                table: "Reviews",
                column: "booking_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Reviews_Bookings_booking_id",
                table: "Reviews",
                column: "booking_id",
                principalTable: "Bookings",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reviews_Bookings_booking_id",
                table: "Reviews");

            migrationBuilder.DropIndex(
                name: "IX_Reviews_booking_id",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "booking_id",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "status",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "updated_at",
                table: "Reviews");
        }
    }
}
