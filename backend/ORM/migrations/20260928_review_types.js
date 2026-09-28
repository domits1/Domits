// Review: Adds rating categories for reservation-backed host, guest, experience, and service reviews.
export class ReviewTypes20260928 {
  async up(queryRunner) {
    const now = Date.now();

    for (const schema of ["test", "main"]) {
      await queryRunner.query(`
        INSERT INTO ${schema}.review_category (
          id, key, label, description, review_type, is_active, sort_order, created_at, updated_at
        )
        VALUES
          ('${schema}-review-category-host-communication', 'communication', 'Communication', 'How clearly and promptly the host communicated.', 'GUEST_TO_HOST', true, 10, ${now}, ${now}),
          ('${schema}-review-category-host-hospitality', 'hospitality', 'Hospitality', 'How welcoming and helpful the host was.', 'GUEST_TO_HOST', true, 20, ${now}, ${now}),
          ('${schema}-review-category-host-responsiveness', 'responsiveness', 'Responsiveness', 'How quickly the host responded.', 'GUEST_TO_HOST', true, 30, ${now}, ${now}),
          ('${schema}-review-category-guest-communication', 'communication', 'Communication', 'How clearly and promptly the guest communicated.', 'HOST_TO_GUEST', true, 10, ${now}, ${now}),
          ('${schema}-review-category-guest-cleanliness', 'cleanliness', 'Cleanliness', 'How respectfully the guest left the property.', 'HOST_TO_GUEST', true, 20, ${now}, ${now}),
          ('${schema}-review-category-guest-house-rules', 'house_rules', 'House rules', 'How well the guest followed the house rules.', 'HOST_TO_GUEST', true, 30, ${now}, ${now}),
          ('${schema}-review-category-experience-quality', 'quality', 'Quality', 'The overall quality of the experience.', 'GUEST_TO_EXPERIENCE', true, 10, ${now}, ${now}),
          ('${schema}-review-category-experience-accuracy', 'accuracy', 'Accuracy', 'How accurately the experience matched its description.', 'GUEST_TO_EXPERIENCE', true, 20, ${now}, ${now}),
          ('${schema}-review-category-experience-value', 'value', 'Value', 'The value offered by the experience.', 'GUEST_TO_EXPERIENCE', true, 30, ${now}, ${now}),
          ('${schema}-review-category-service-quality', 'quality', 'Quality', 'The overall quality of the service.', 'GUEST_TO_SERVICE', true, 10, ${now}, ${now}),
          ('${schema}-review-category-service-communication', 'communication', 'Communication', 'How clearly the service was communicated.', 'GUEST_TO_SERVICE', true, 20, ${now}, ${now}),
          ('${schema}-review-category-service-value', 'value', 'Value', 'The value offered by the service.', 'GUEST_TO_SERVICE', true, 30, ${now}, ${now}),
          ('${schema}-review-category-reservation-booking-process', 'booking_process', 'Booking process', 'How smooth the reservation process was.', 'GUEST_TO_RESERVATION', true, 10, ${now}, ${now}),
          ('${schema}-review-category-reservation-communication', 'communication', 'Communication', 'How clearly reservation details were communicated.', 'GUEST_TO_RESERVATION', true, 20, ${now}, ${now}),
          ('${schema}-review-category-reservation-checkin', 'checkin', 'Check-in', 'How smooth the reservation check-in was.', 'GUEST_TO_RESERVATION', true, 30, ${now}, ${now})
        ON CONFLICT (key, review_type) DO UPDATE SET
          label = EXCLUDED.label,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          sort_order = EXCLUDED.sort_order,
          updated_at = EXCLUDED.updated_at;
      `);
    }
  }

  async down(queryRunner) {
    for (const schema of ["main", "test"]) {
      await queryRunner.query(`
        DELETE FROM ${schema}.review_category
        WHERE review_type IN (
          'GUEST_TO_HOST',
          'HOST_TO_GUEST',
          'GUEST_TO_EXPERIENCE',
          'GUEST_TO_SERVICE',
          'GUEST_TO_RESERVATION'
        );
      `);
    }
  }
}
