export class CreateReviewCategories20261005 {
  async up(queryRunner) {
    await queryRunner.query(`CREATE TABLE main.review_category (
      key VARCHAR PRIMARY KEY, label VARCHAR NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE
    )`);
    await queryRunner.query(`CREATE TABLE main.review_category_rating (
      review_id UUID NOT NULL, category_key VARCHAR NOT NULL,
      rating DOUBLE PRECISION NOT NULL,
      PRIMARY KEY (review_id, category_key)
    )`);
    const defaults = [
      ["cleanliness", "Cleanliness"], ["accuracy", "Accuracy"],
      ["communication", "Communication"], ["checkIn", "Check-in"],
      ["location", "Location"], ["comfort", "Comfort"],
      ["amenities", "Amenities"], ["value", "Value"],
      ["service", "Service"], ["privacy", "Privacy"],
      ["experience", "Experience"],
    ];
    for (const [key, label] of defaults) {
      await queryRunner.query(
        "INSERT INTO main.review_category (key, label) VALUES ($1, $2)", [key, label],
      );
    }
  }
  async down(queryRunner) {
    await queryRunner.query("DROP TABLE main.review_category_rating");
    await queryRunner.query("DROP TABLE main.review_category");
  }
}
