import { describe, expect, it } from "@jest/globals";
import ReviewRepository from "../../functions/ReviewSystem/data/reviewRepository.js";

const createReview = (overrides = {}) => ({
  id: "review-1",
  overallRating: 4,
  title: "Good stay",
  publicReview: "Nice place.",
  verificationStatus: "UNVERIFIED",
  status: "PUBLISHED",
  createdAt: Date.parse("2026-09-01T10:00:00.000Z"),
  categoryRatings: {
    cleanliness: 4,
  },
  ...overrides,
});

const buildRepository = () => new ReviewRepository();

describe("ReviewRepository public review sorting and filtering", () => {
  it("sorts reviews by recent first", () => {
    const repository = buildRepository();

    const response = repository.buildPublicReviewResponse(
      [
        createReview({ id: "older", createdAt: Date.parse("2026-08-01T10:00:00.000Z") }),
        createReview({ id: "newer", createdAt: Date.parse("2026-09-01T10:00:00.000Z") }),
      ],
      { sort: "recent" }
    );

    expect(response.reviews.map((review) => review.id)).toEqual(["newer", "older"]);
  });

  it("sorts reviews by highest rating first", () => {
    const repository = buildRepository();

    const response = repository.buildPublicReviewResponse(
      [
        createReview({ id: "low", overallRating: 2 }),
        createReview({ id: "high", overallRating: 5 }),
      ],
      { sort: "highest" }
    );

    expect(response.reviews.map((review) => review.id)).toEqual(["high", "low"]);
  });

  it("sorts reviews by lowest rating first", () => {
    const repository = buildRepository();

    const response = repository.buildPublicReviewResponse(
      [
        createReview({ id: "high", overallRating: 5 }),
        createReview({ id: "low", overallRating: 2 }),
      ],
      { sort: "lowest" }
    );

    expect(response.reviews.map((review) => review.id)).toEqual(["low", "high"]);
  });

  it("filters verified-stay reviews only", () => {
    const repository = buildRepository();

    const response = repository.buildPublicReviewResponse(
      [
        createReview({ id: "unverified", verificationStatus: "UNVERIFIED" }),
        createReview({ id: "verified", verificationStatus: "VERIFIED_STAY" }),
      ],
      { verifiedOnly: true }
    );

    expect(response.reviews.map((review) => review.id)).toEqual(["verified"]);
    expect(response.totalReviews).toBe(1);
  });

  it("filters reviews by category existence", () => {
    const repository = buildRepository();

    const response = repository.buildPublicReviewResponse(
      [
        createReview({ id: "has-cleanliness", categoryRatings: { cleanliness: 5 } }),
        createReview({ id: "has-location", categoryRatings: { location: 4 } }),
      ],
      { category: "location" }
    );

    expect(response.reviews.map((review) => review.id)).toEqual(["has-location"]);
    expect(response.categoryRatings).toEqual({ location: 4 });
  });

  it("combines sorting, verified filtering, and category filtering", () => {
    const repository = buildRepository();

    const response = repository.buildPublicReviewResponse(
      [
        createReview({
          id: "verified-low-cleanliness",
          overallRating: 2,
          verificationStatus: "VERIFIED_STAY",
          categoryRatings: { cleanliness: 2 },
        }),
        createReview({
          id: "verified-high-cleanliness",
          overallRating: 5,
          verificationStatus: "VERIFIED_STAY",
          categoryRatings: { cleanliness: 5 },
        }),
        createReview({
          id: "unverified-high-cleanliness",
          overallRating: 5,
          verificationStatus: "UNVERIFIED",
          categoryRatings: { cleanliness: 5 },
        }),
        createReview({
          id: "verified-high-location",
          overallRating: 5,
          verificationStatus: "VERIFIED_STAY",
          categoryRatings: { location: 5 },
        }),
      ],
      {
        sort: "highest",
        verifiedOnly: true,
        category: "cleanliness",
      }
    );

    expect(response.reviews.map((review) => review.id)).toEqual([
      "verified-high-cleanliness",
      "verified-low-cleanliness",
    ]);
  });

  it("returns a consistent empty response shape when filters remove all reviews", () => {
    const repository = buildRepository();

    const response = repository.buildPublicReviewResponse(
      [
        createReview({
          id: "location-only",
          verificationStatus: "UNVERIFIED",
          categoryRatings: { location: 4 },
        }),
      ],
      {
        verifiedOnly: true,
        category: "cleanliness",
      }
    );

    expect(response).toEqual({
      reviews: [],
      totalReviews: 0,
      overallRating: null,
      categoryRatings: {},
    });
  });

  it("includes only public-safe published response fields in public review DTOs", () => {
    const repository = buildRepository();

    const response = repository.buildPublicReviewResponse([
      createReview({
        response: {
          id: "response-1",
          reviewId: "review-1",
          status: "published",
          authorId: "host-1",
          authorRole: "host",
          message: "Thank you for staying with us.",
          publishedAt: Date.parse("2026-09-02T10:00:00.000Z"),
          updatedAt: Date.parse("2026-09-02T10:00:00.000Z"),
          auditData: { ipAddress: "127.0.0.1" },
        },
      }),
    ]);

    expect(response.reviews[0].response).toEqual({
      id: "response-1",
      authorRole: "host",
      message: "Thank you for staying with us.",
      publishedAt: Date.parse("2026-09-02T10:00:00.000Z"),
    });
    expect(response.reviews[0].response.authorId).toBeUndefined();
    expect(response.reviews[0].response.reviewId).toBeUndefined();
    expect(response.reviews[0].response.status).toBeUndefined();
    expect(response.reviews[0].response.updatedAt).toBeUndefined();
    expect(response.reviews[0].response.auditData).toBeUndefined();
  });

  it("excludes Domits private feedback from public review DTOs", () => {
    const repository = buildRepository();

    const response = repository.buildPublicReviewResponse([
      createReview({
        privateFeedback: "Host-only note.",
        domitsPrivateFeedback: {
          id: "feedback-1",
          feedbackType: "domits_private",
          message: "Internal support note.",
        },
      }),
    ]);

    expect(response.reviews[0].privateFeedback).toBeUndefined();
    expect(response.reviews[0].domitsPrivateFeedback).toBeUndefined();
  });

  it.each(["draft", "unpublished", "rejected", "hidden"])(
    "hides %s responses from public review DTOs",
    (status) => {
      const repository = buildRepository();

      const response = repository.buildPublicReviewResponse([
        createReview({
          response: {
            id: "response-1",
            status,
            authorRole: "host",
            message: "Internal response.",
          },
        }),
      ]);

      expect(response.reviews[0].response).toBeNull();
    }
  );

  it("hides deleted published responses from public review DTOs", () => {
    const repository = buildRepository();

    const response = repository.buildPublicReviewResponse([
      createReview({
        response: {
          id: "response-1",
          status: "published",
          authorRole: "host",
          message: "Deleted response.",
          publishedAt: Date.parse("2026-09-02T10:00:00.000Z"),
          deletedAt: Date.parse("2026-09-03T10:00:00.000Z"),
        },
      }),
    ]);

    expect(response.reviews[0].response).toBeNull();
  });
});
