import { describe, expect, it } from "@jest/globals";
import ReviewRepository from "../../functions/ReviewSystem/data/reviewRepository.js";

// Review: Builds public-safe rows for deterministic repository sorting and filtering tests.
const createReview = (overrides = {}) => ({
  id: "review-1",
  overallRating: 4,
  title: "Good stay",
  publicReview: "Nice place.",
  verificationStatus: "UNVERIFIED",
  status: "PUBLISHED",
  createdAt: Date.parse("2026-09-01T10:00:00.000Z"),
  categoryRatings: { cleanliness: 4 },
  ...overrides,
});

describe("ReviewRepository public review sorting and filtering", () => {
  const repository = new ReviewRepository();

  it.each([
    ["recent", [createReview({ id: "older", createdAt: 1 }), createReview({ id: "newer", createdAt: 2 })], ["newer", "older"]],
    ["highest", [createReview({ id: "low", overallRating: 2 }), createReview({ id: "high", overallRating: 5 })], ["high", "low"]],
    ["lowest", [createReview({ id: "high", overallRating: 5 }), createReview({ id: "low", overallRating: 2 })], ["low", "high"]],
  ])("sorts public reviews by %s", (sort, reviews, expectedIds) => {
    const response = repository.buildPublicReviewResponse(reviews, { sort });
    expect(response.reviews.map((review) => review.id)).toEqual(expectedIds);
  });

  it("filters verified reviews and category ratings before building the summary", () => {
    const response = repository.buildPublicReviewResponse(
      [
        createReview({ id: "verified-clean", overallRating: 5, verificationStatus: "VERIFIED_STAY" }),
        createReview({ id: "unverified-clean", overallRating: 4 }),
        createReview({ id: "verified-location", verificationStatus: "VERIFIED_STAY", categoryRatings: { location: 3 } }),
      ],
      { verifiedOnly: true, category: "cleanliness" }
    );

    expect(response).toEqual({
      reviews: [expect.objectContaining({ id: "verified-clean" })],
      totalReviews: 1,
      overallRating: 5,
      categoryRatings: { cleanliness: 4 },
    });
  });

  it("returns an empty public summary when filters remove all reviews", () => {
    const response = repository.buildPublicReviewResponse(
      [createReview({ categoryRatings: { location: 4 } })],
      { verifiedOnly: true, category: "cleanliness" }
    );

    expect(response).toEqual({ reviews: [], totalReviews: 0, overallRating: null, categoryRatings: {} });
  });
});
