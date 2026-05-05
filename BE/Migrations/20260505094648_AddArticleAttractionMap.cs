using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BE.Migrations
{
    /// <inheritdoc />
    public partial class AddArticleAttractionMap : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Article_Attraction_Map",
                columns: table => new
                {
                    article_id = table.Column<int>(type: "int", nullable: false),
                    attraction_id = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Article_Attraction_Map", x => new { x.article_id, x.attraction_id });
                    table.ForeignKey(
                        name: "FK_Article_Attraction_Map_Articles_article_id",
                        column: x => x.article_id,
                        principalTable: "Articles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Article_Attraction_Map_Attractions_attraction_id",
                        column: x => x.attraction_id,
                        principalTable: "Attractions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Article_Attraction_Map_ArticleId",
                table: "Article_Attraction_Map",
                column: "article_id");

            migrationBuilder.CreateIndex(
                name: "IX_Article_Attraction_Map_AttractionId",
                table: "Article_Attraction_Map",
                column: "attraction_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Article_Attraction_Map");
        }
    }
}
