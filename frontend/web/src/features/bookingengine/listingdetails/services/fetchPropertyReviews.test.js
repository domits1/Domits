// Review: Covers public API normalization, errors, query filters, and mock fallback behavior.

import { fetchPublicPropertyReviews } from "./fetchPropertyReviews";

describe("fetchPublicPropertyReviews", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  test("returns empty data when property id is missing", async () => {
    await expect(fetchPublicPropertyReviews("")).resolves.toEqual({
      summary: null,
      reviews: [],
    });
  });

  test("maps backend public review response to listing UI shape", async () => {
    process.env.REACT_APP_REVIEW_API_BASE = "https://example.test/reviews";

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        reviews: [
          {
            id: "review-1",
            overallRating: 5,
            publicReview: "Lovely stay.",
            verificationStatus: "VERIFIED_STAY",
            categoryRatings: { cleanliness: 5 },
          },
        ],
        totalReviews: 1,
        overallRating: 5,
        categoryRatings: { cleanliness: 5 },
      }),
    });

    const result = await fetchPublicPropertyReviews("property-1");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.test/reviews?propertyId=property-1",
      { method: "GET" }
    );

    expect(result).toEqual({
      summary: {
        averageRating: 5,
        totalReviews: 1,
        verifiedReviewCount: 1,
        categoryScores: { cleanliness: 5 },
      },
      reviews: [
        {
          id: "review-1",
          overallRating: 5,
          publicReview: "Lovely stay.",
          verificationStatus: "VERIFIED_STAY",
          categoryRatings: { cleanliness: 5 },
        },
      ],
    });
  });

  test("throws readable error when backend request fails", async () => {
    process.env.REACT_APP_REVIEW_API_BASE = "https://example.test/reviews";

    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Review service unavailable." }),
    });

    await expect(fetchPublicPropertyReviews("property-1")).rejects.toThrow("Review service unavailable.");
  });

  test("adds sorting and filtering query parameters", async () => {
    process.env.REACT_APP_REVIEW_API_BASE = "https://example.test/reviews";

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        reviews: [],
        totalReviews: 0,
      }),
    });

    // Review filter state is translated into backend query parameters.
    await fetchPublicPropertyReviews("property-1", {
      sort: "highest",
      verifiedOnly: true,
      category: "cleanliness",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.test/reviews?propertyId=property-1&sort=highest&verified=true&category=cleanliness",
      { method: "GET" }
    );
  });

  test("filters mock reviews and rebuilds the summary", async () => {
    process.env.REACT_APP_USE_MOCK_REVIEWS = "true";

    // Mock review mode follows the same verified and category filters as the API.
    const result = await fetchPublicPropertyReviews("property-1", {
      sort: "lowest",
      verifiedOnly: true,
      category: "cleanliness",
    });

    expect(result.reviews).toHaveLength(1);
    expect(result.reviews[0].verificationStatus).toBe("VERIFIED_STAY");
    expect(result.summary).toEqual({
      averageRating: 5,
      totalReviews: 1,
      verifiedReviewCount: 1,
      categoryScores: {
        cleanliness: 5,
        communication: 5,
        location: 4.8,
        value: 4.7,
      },
    });
  });
});
