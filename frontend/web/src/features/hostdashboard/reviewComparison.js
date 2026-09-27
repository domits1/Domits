export const REVIEW_CATEGORIES = [
  { key: "cleanliness", label: "Cleanliness" },
  { key: "accuracy", label: "Accuracy" },
  { key: "communication", label: "Communication" },
  { key: "location", label: "Location" },
  { key: "checkIn", label: "Check-in" },
  { key: "value", label: "Value" },
];

// Review: Accepts only real 1-5 scores before including them in averages.
const validRating = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const rating = Number(value);
  return Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : null;
};

const average = ({ total, count }) => (count ? total / count : null);

export const buildPropertyRatingComparison = (reviews, properties) => {
  // Review: Produces host dashboard rating comparisons grouped by property.
  const rows = new Map();

  (Array.isArray(properties) ? properties : []).forEach((property) => {
    // Review: Seed rows from known host properties so unrated listings still appear.
    const propertyId = String(property?.value || property?.id || "").trim();
    if (propertyId) {
      rows.set(propertyId, {
        propertyId,
        title: property.title || property.label || `Property #${propertyId}`,
        reviewCount: 0,
        overall: { total: 0, count: 0 },
        categories: Object.fromEntries(REVIEW_CATEGORIES.map(({ key }) => [key, { total: 0, count: 0 }])),
      });
    }
  });

  (Array.isArray(reviews) ? reviews : []).forEach((review) => {
    // Review: Only published guest-to-property reviews influence public rating comparisons.
    if (review?.status !== "PUBLISHED" || (review.reviewType && review.reviewType !== "GUEST_TO_PROPERTY")) {
      return;
    }

    const propertyId = String(review.propertyId || review.property_id || "").trim();
    if (!propertyId) return;

    if (!rows.has(propertyId)) {
      rows.set(propertyId, {
        propertyId,
        title: review.propertyTitle || `Property #${propertyId}`,
        reviewCount: 0,
        overall: { total: 0, count: 0 },
        categories: Object.fromEntries(REVIEW_CATEGORIES.map(({ key }) => [key, { total: 0, count: 0 }])),
      });
    }

    const row = rows.get(propertyId);
    row.reviewCount += 1;

    const overallRating = validRating(review.overallRating);
    if (overallRating !== null) {
      row.overall.total += overallRating;
      row.overall.count += 1;
    }

    REVIEW_CATEGORIES.forEach(({ key }) => {
      const rating = validRating(review.categoryRatings?.[key]);
      if (rating !== null) {
        row.categories[key].total += rating;
        row.categories[key].count += 1;
      }
    });
  });

  return [...rows.values()].map((row) => ({
    propertyId: row.propertyId,
    title: row.title,
    reviewCount: row.reviewCount,
    overallRating: average(row.overall),
    categoryRatings: Object.fromEntries(
      REVIEW_CATEGORIES.map(({ key }) => [key, average(row.categories[key])])
    ),
  }));
};
