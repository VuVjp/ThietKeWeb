using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BE.Migrations
{
    /// <inheritdoc />
    public partial class AddReviewEligibilityTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Review_Eligibilities",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    room_type_id = table.Column<int>(type: "int", nullable: false),
                    booking_id = table.Column<int>(type: "int", nullable: false),
                    is_reviewed = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    expires_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Review_Eligibilities", x => x.id);
                    table.ForeignKey(
                        name: "FK_Review_Eligibilities_Bookings_booking_id",
                        column: x => x.booking_id,
                        principalTable: "Bookings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Review_Eligibilities_Room_Types_room_type_id",
                        column: x => x.room_type_id,
                        principalTable: "Room_Types",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Review_Eligibilities_Users_user_id",
                        column: x => x.user_id,
                        principalTable: "Users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Review_Eligibilities_booking_id",
                table: "Review_Eligibilities",
                column: "booking_id");

            migrationBuilder.CreateIndex(
                name: "IX_Review_Eligibilities_room_type_id",
                table: "Review_Eligibilities",
                column: "room_type_id");

            migrationBuilder.CreateIndex(
                name: "IX_Review_Eligibilities_user_id",
                table: "Review_Eligibilities",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Review_Eligibilities");
        }
    }
}
