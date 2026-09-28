// Review: Adds the expanded property category catalog and per-property manager overrides.
export class ReviewCategoryConfiguration20260929 {
  async up(queryRunner) {
    const now = Date.now();

    for (const schema of ["test", "main"]) {
      await queryRunner.query(`
        INSERT INTO ${schema}.review_category (
          id, key, label, description, review_type, is_active, sort_order, created_at, updated_at
        )
        VALUES
          ('${schema}-review-category-comfort', 'comfort', 'Comfort', 'How comfortable the property was.', 'GUEST_TO_PROPERTY', true, 70, ${now}, ${now}),
          ('${schema}-review-category-amenities', 'amenities', 'Amenities', 'The quality and availability of listed amenities.', 'GUEST_TO_PROPERTY', true, 80, ${now}, ${now}),
          ('${schema}-review-category-service', 'service', 'Service', 'The quality of service throughout the stay.', 'GUEST_TO_PROPERTY', true, 90, ${now}, ${now}),
          ('${schema}-review-category-privacy', 'privacy', 'Privacy', 'The level of privacy provided by the property.', 'GUEST_TO_PROPERTY', true, 100, ${now}, ${now}),
          ('${schema}-review-category-experience', 'experience', 'Experience', 'The overall stay experience.', 'GUEST_TO_PROPERTY', true, 110, ${now}, ${now}),
          ('${schema}-review-category-hospitality', 'hospitality', 'Hospitality', 'How welcoming and helpful the host was.', 'GUEST_TO_PROPERTY', true, 120, ${now}, ${now})
        ON CONFLICT (key, review_type) DO UPDATE SET
          label = EXCLUDED.label,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          sort_order = EXCLUDED.sort_order,
          updated_at = EXCLUDED.updated_at;
      `);

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.review_category_configuration (
          id VARCHAR(255) NOT NULL,
          property_id VARCHAR(255) NOT NULL,
          host_id VARCHAR(255) NOT NULL,
          review_type VARCHAR(50) NOT NULL,
          category_key VARCHAR(100) NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT true,
          sort_order INT NOT NULL DEFAULT 0,
          created_by_user_id VARCHAR(255) NOT NULL,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          PRIMARY KEY (id)
        );
      `);

      await queryRunner.query(`
        CREATE UNIQUE INDEX review_category_configuration_scope_unique_${schema}
        ON ${schema}.review_category_configuration (property_id, review_type, category_key);
      `);

      await queryRunner.query(`
        CREATE INDEX review_category_configuration_property_idx_${schema}
        ON ${schema}.review_category_configuration (property_id, review_type);
      `);
    }
  }

  async down(queryRunner) {
    for (const schema of ["main", "test"]) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.review_category_configuration;`);
      await queryRunner.query(`
        DELETE FROM ${schema}.review_category
        WHERE review_type = 'GUEST_TO_PROPERTY'
          AND key IN ('comfort', 'amenities', 'service', 'privacy', 'experience', 'hospitality');
      `);
    }
  }
}
