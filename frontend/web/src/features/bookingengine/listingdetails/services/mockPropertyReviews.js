// frontend/web/src/features/bookingengine/listingdetails/services/mockPropertyReviews.js

export const getMockPropertyReviewsByPropertyId = (propertyId) => {
  const normalizedPropertyId = String(propertyId || "").trim();

  if (!normalizedPropertyId) {
    return {
      reviews: [],
      totalReviews: 0,
      overallRating: null,
      categoryRatings: {},
    };
  }

  return {
    reviews: [
      {
        id: `${normalizedPropertyId}-review-1`,
        overallRating: 5,
        title: "Wonderful stay",
        publicReview: "Clean, calm, and close to everything we needed.",
        verificationStatus: "VERIFIED_STAY",
        status: "PUBLISHED",
        createdAt: Date.parse("2026-09-01T10:00:00.000Z"),
        categoryRatings: {
          cleanliness: 5,
          communication: 5,
          location: 4.8,
          value: 4.7,
        },
        response: {
          id: `${normalizedPropertyId}-response-1`,
          authorRole: "host",
          message: "Thank you for staying with us. We are delighted you enjoyed the calm location.",
          publishedAt: Date.parse("2026-09-02T10:00:00.000Z"),
        },
      },
      {
        id: `${normalizedPropertyId}-review-2`,
        overallRating: 4,
        title: "Comfortable place",
        publicReview: "The host was responsive and the listing matched the photos.",
        verificationStatus: "UNVERIFIED",
        status: "PUBLISHED",
        createdAt: Date.parse("2026-08-21T10:00:00.000Z"),
        categoryRatings: {
          cleanliness: 4,
          communication: 5,
          location: 4,
          value: 4,
        },
        response: {
          id: `${normalizedPropertyId}-response-2`,
          authorRole: "property_manager",
          message: "We appreciate your feedback and are glad the listing matched your expectations.",
          publishedAt: Date.parse("2026-08-22T10:00:00.000Z"),
        },
      },
    ],
    totalReviews: 2,
    overallRating: 4.5,
    categoryRatings: {
      cleanliness: 4.5,
      communication: 5,
      location: 4.4,
      value: 4.4,
    },
  };
};
