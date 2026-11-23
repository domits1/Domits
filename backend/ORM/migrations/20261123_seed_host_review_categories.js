export class SeedHostReviewCategories20261123 {
  async up(queryRunner) {
    for (const schema of ["test", "main"]) {
      for (const [index, key] of ["communication", "responsiveness", "hospitality"].entries()) {
        await queryRunner.query(`INSERT INTO ${schema}.review_category
          (id, key, label, review_type, is_active, sort_order, created_at, updated_at)
          SELECT $1, $2, $3, 'GUEST_TO_HOST', true, $4, $5, $5
          WHERE NOT EXISTS (SELECT 1 FROM ${schema}.review_category
            WHERE review_type = 'GUEST_TO_HOST' AND key = $2)`,
        [`guest-to-host-${key}`, key, key[0].toUpperCase() + key.slice(1), index, Date.now()]);
      }
    }
  }

  // Categories may predate this migration or have been configured by an operator.
  async down() {}
}
