import { describe, expect, it, jest } from "@jest/globals";
import ReviewService from "../../functions/ReviewSystem/business/service/reviewService.js";
import ConflictException from "../../functions/ReviewSystem/util/exception/conflictException.js";

const NOW = Date.parse("2026-09-10T12:00:00.000Z");

const createEvent = (body, overrides = {}) => ({
  headers: { Authorization: "Bearer access-token-1" },
  body: JSON.stringify(body),
  ...overrides,
});

const createReviewPayload = (overrides = {}) => ({
  bookingId: "booking-1",
  propertyId: "property-1",
  reviewType: "GUEST_TO_PROPERTY",
  overallRating: 4.5,
  title: "Great stay",
  publicReview: "The apartment was clean and well located.",
  privateFeedback: "A later checkout would be helpful.",
  categoryRatings: {
    cleanliness: 5,
    accuracy: 4,
    communication: 5,
  },
  ...overrides,
});

const createBooking = (overrides = {}) => ({
  id: "booking-1",
  guestid: "guest-1",
  hostid: "host-1",
  property_id: "property-1",
  status: "Completed",
  departuredate: NOW - 24 * 60 * 60 * 1000,
  ...overrides,
});

const createReview = (overrides = {}) => ({
  id: "review-1",
  bookingId: "booking-1",
  propertyId: "property-1",
  hostId: "host-1",
  reviewerUserId: "guest-1",
  revieweeUserId: "host-1",
  reviewType: "GUEST_TO_PROPERTY",
  overallRating: 5,
  title: "Great",
  publicReview: "Lovely stay.",
  privateFeedback: "Private host feedback.",
  verificationStatus: "VERIFIED_STAY",
  publicationStatus: "PUBLISHED",
  status: "PUBLISHED",
  createdAt: NOW,
  updatedAt: NOW,
  categoryRatings: {
    cleanliness: 5,
  },
  ...overrides,
});

const buildService = ({ repositoryOverrides = {}, authOverrides = {}, eligibilityOverrides = {} } = {}) => {
  const reviewRepository = {
    getActiveRatingCategoryKeys: jest.fn().mockResolvedValue(
      new Set(["cleanliness", "accuracy", "communication", "location", "checkIn", "value"])
    ),
    createReviewWithRatings: jest.fn().mockImplementation(async (review, ratings, workflowRecords) => ({
      review,
      ratings,
      workflowRecords,
    })),
    getReviewById: jest.fn(),
    updateReviewWithRatings: jest.fn(),
    softDeleteReview: jest.fn(),
    getPublishedReviewsByPropertyId: jest.fn(),
    getReviewsByBookingForUser: jest.fn(),
    getReviewsWrittenByUser: jest.fn(),
    toPublicReview: jest.fn((review) => ({
      id: review.id,
      overallRating: review.overallRating,
      title: review.title,
      publicReview: review.publicReview,
      verificationStatus: review.verificationStatus,
      status: review.status,
      createdAt: review.createdAt,
      categoryRatings: review.categoryRatings || {},
    })),
    ...repositoryOverrides,
  };

  const authManager = {
    authenticate: jest.fn().mockResolvedValue({ sub: "guest-1" }),
    ...authOverrides,
  };

  const eligibilityService = {
    validateReservationEligibility: jest.fn().mockResolvedValue(createBooking()),
    ...eligibilityOverrides,
  };

  return {
    reviewRepository,
    authManager,
    eligibilityService,
    service: new ReviewService({
      reviewRepository,
      authManager,
      eligibilityService,
      clock: () => NOW,
    }),
  };
};

describe("ReviewService day 5 unit coverage", () => {
  it("creates a submitted review after validating eligibility", async () => {
    const { service, reviewRepository, eligibilityService } = buildService();

    const result = await service.createReview(createEvent(createReviewPayload({ status: "SUBMITTED" })));

    expect(eligibilityService.validateReservationEligibility).toHaveBeenCalledWith({
      bookingId: "booking-1",
      propertyId: "property-1",
      reviewType: "GUEST_TO_PROPERTY",
      reviewerUserId: "guest-1",
    });

    expect(reviewRepository.createReviewWithRatings).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        bookingId: "booking-1",
        propertyId: "property-1",
        hostId: "host-1",
        reviewerUserId: "guest-1",
        revieweeUserId: "host-1",
        reviewType: "GUEST_TO_PROPERTY",
        overallRating: 4.5,
        title: "Great stay",
        publicReview: "The apartment was clean and well located.",
        privateFeedback: "A later checkout would be helpful.",
        status: "SUBMITTED",
        verificationStatus: "UNVERIFIED",
        publicationStatus: "UNPUBLISHED",
        createdAt: NOW,
        updatedAt: NOW,
      }),
      expect.arrayContaining([
        expect.objectContaining({ reviewId: expect.any(String), category: "cleanliness", rating: 5 }),
        expect.objectContaining({ reviewId: expect.any(String), category: "accuracy", rating: 4 }),
        expect.objectContaining({ reviewId: expect.any(String), category: "communication", rating: 5 }),
      ]),
      expect.objectContaining({
        reviewRequest: expect.objectContaining({
          bookingId: "booking-1",
          propertyId: "property-1",
          hostId: "host-1",
          guestId: "guest-1",
          status: "COMPLETED",
          completedAt: NOW,
        }),
        verification: null,
        moderation: null,
      })
    );

    expect(result.review.reviewerUserId).toBe("guest-1");
  });

  it("creates a draft review with an open review request", async () => {
    const { service, reviewRepository } = buildService();

    await service.createReview(createEvent(createReviewPayload({ status: "DRAFT" })));

    expect(reviewRepository.createReviewWithRatings).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "DRAFT",
        verificationStatus: "UNVERIFIED",
        publicationStatus: "UNPUBLISHED",
      }),
      expect.any(Array),
      expect.objectContaining({
        reviewRequest: expect.objectContaining({
          status: "OPEN",
          completedAt: null,
        }),
        verification: null,
        moderation: null,
      })
    );
  });

  it("rejects unsupported review types", async () => {
    const { service, reviewRepository, eligibilityService } = buildService();

    await expect(
      service.createReview(createEvent(createReviewPayload({ reviewType: "HOST_TO_GUEST" })))
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "reviewType is not supported.",
    });

    expect(reviewRepository.createReviewWithRatings).not.toHaveBeenCalled();
    expect(eligibilityService.validateReservationEligibility).not.toHaveBeenCalled();
  });

  it("rejects missing overall rating", async () => {
    const { service, reviewRepository, eligibilityService } = buildService();

    await expect(
      service.createReview(createEvent(createReviewPayload({ overallRating: undefined })))
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "overallRating must be between 1 and 5.",
    });

    expect(reviewRepository.createReviewWithRatings).not.toHaveBeenCalled();
    expect(eligibilityService.validateReservationEligibility).not.toHaveBeenCalled();
  });

  it("rejects overall rating below the allowed range", async () => {
    const { service, eligibilityService } = buildService();

    await expect(service.createReview(createEvent(createReviewPayload({ overallRating: 0 })))).rejects.toMatchObject({
      statusCode: 400,
      message: "overallRating must be between 1 and 5.",
    });

    expect(eligibilityService.validateReservationEligibility).not.toHaveBeenCalled();
  });

  it("rejects overall rating above the allowed range", async () => {
    const { service, eligibilityService } = buildService();

    await expect(service.createReview(createEvent(createReviewPayload({ overallRating: 6 })))).rejects.toMatchObject({
      statusCode: 400,
      message: "overallRating must be between 1 and 5.",
    });

    expect(eligibilityService.validateReservationEligibility).not.toHaveBeenCalled();
  });

  it("rejects unsupported rating categories", async () => {
    const { service, eligibilityService } = buildService();

    await expect(
      service.createReview(createEvent(createReviewPayload({ categoryRatings: { wifi: 5 } })))
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Unsupported rating category: wifi.",
    });

    expect(eligibilityService.validateReservationEligibility).not.toHaveBeenCalled();
  });

  it("rejects category ratings outside the allowed range", async () => {
    const { service, eligibilityService } = buildService();

    await expect(
      service.createReview(createEvent(createReviewPayload({ categoryRatings: { cleanliness: 6 } })))
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "categoryRatings.cleanliness must be between 1 and 5.",
    });

    expect(eligibilityService.validateReservationEligibility).not.toHaveBeenCalled();
  });

  it("rejects non-object category ratings", async () => {
    const { service, eligibilityService } = buildService();

    await expect(
      service.createReview(createEvent(createReviewPayload({ categoryRatings: ["cleanliness"] })))
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "categoryRatings must be an object.",
    });

    expect(eligibilityService.validateReservationEligibility).not.toHaveBeenCalled();
  });

  it("does not create a review when eligibility detects a duplicate", async () => {
    const duplicateError = new ConflictException("You have already reviewed this booking.");
    const { service, reviewRepository } = buildService({
      eligibilityOverrides: {
        validateReservationEligibility: jest.fn().mockRejectedValue(duplicateError),
      },
    });

    await expect(service.createReview(createEvent(createReviewPayload()))).rejects.toMatchObject({
      statusCode: 409,
      message: "You have already reviewed this booking.",
    });

    expect(reviewRepository.createReviewWithRatings).not.toHaveBeenCalled();
  });

  it("returns published review details without private feedback", async () => {
    const review = createReview();
    const { service, reviewRepository, authManager } = buildService({
      repositoryOverrides: {
        getReviewById: jest.fn().mockResolvedValue(review),
      },
    });

    const result = await service.getReviewById({ headers: {} }, "review-1");

    expect(authManager.authenticate).not.toHaveBeenCalled();
    expect(reviewRepository.toPublicReview).toHaveBeenCalledWith(review);
    expect(result.review).toEqual({
      id: "review-1",
      overallRating: 5,
      title: "Great",
      publicReview: "Lovely stay.",
      verificationStatus: "VERIFIED_STAY",
      status: "PUBLISHED",
      createdAt: NOW,
      categoryRatings: {
        cleanliness: 5,
      },
    });
    expect(result.review.privateFeedback).toBeUndefined();
    expect(result.review.reviewerUserId).toBeUndefined();
    expect(result.review.hostId).toBeUndefined();
  });

  it("allows the author to view unpublished review private data", async () => {
    const unpublishedReview = createReview({
      status: "DRAFT",
      publicationStatus: "UNPUBLISHED",
      verificationStatus: "UNVERIFIED",
    });
    const { service } = buildService({
      repositoryOverrides: {
        getReviewById: jest.fn().mockResolvedValue(unpublishedReview),
      },
    });

    const result = await service.getReviewById(
      { headers: { Authorization: "Bearer access-token-1" } },
      "review-1"
    );

    expect(result.review).toEqual(unpublishedReview);
    expect(result.review.privateFeedback).toBe("Private host feedback.");
  });

  it("allows the host to view unpublished review private data", async () => {
    const unpublishedReview = createReview({
      status: "SUBMITTED",
      publicationStatus: "UNPUBLISHED",
      verificationStatus: "UNVERIFIED",
    });
    const { service } = buildService({
      authOverrides: {
        authenticate: jest.fn().mockResolvedValue({ sub: "host-1" }),
      },
      repositoryOverrides: {
        getReviewById: jest.fn().mockResolvedValue(unpublishedReview),
      },
    });

    const result = await service.getReviewById(
      { headers: { Authorization: "Bearer access-token-1" } },
      "review-1"
    );

    expect(result.review).toEqual(unpublishedReview);
    expect(result.review.privateFeedback).toBe("Private host feedback.");
  });

  it("rejects unrelated users from unpublished review details", async () => {
    const { service } = buildService({
      authOverrides: {
        authenticate: jest.fn().mockResolvedValue({ sub: "other-user" }),
      },
      repositoryOverrides: {
        getReviewById: jest.fn().mockResolvedValue(
          createReview({
            status: "SUBMITTED",
            publicationStatus: "UNPUBLISHED",
            verificationStatus: "UNVERIFIED",
          })
        ),
      },
    });

    await expect(
      service.getReviewById({ headers: { Authorization: "Bearer access-token-1" } }, "review-1")
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "You are not allowed to view this review.",
    });
  });

  it("returns only booking reviews scoped to the authenticated user", async () => {
    const { service, reviewRepository } = buildService({
      repositoryOverrides: {
        getReviewsByBookingForUser: jest.fn().mockResolvedValue([createReview()]),
      },
    });

    const result = await service.getReviews({
      headers: { Authorization: "Bearer access-token-1" },
      queryStringParameters: { bookingId: "booking-1" },
    });

    expect(result).toEqual([createReview()]);
    expect(reviewRepository.getReviewsByBookingForUser).toHaveBeenCalledWith("booking-1", "guest-1");
  });

  it("returns public property review summaries through the repository public query", async () => {
    const publicSummary = {
      reviews: [
        {
          id: "review-1",
          overallRating: 5,
          title: "Great",
          publicReview: "Lovely stay.",
          verificationStatus: "VERIFIED_STAY",
          status: "PUBLISHED",
          createdAt: NOW,
          categoryRatings: { cleanliness: 5 },
        },
      ],
      totalReviews: 1,
      overallRating: 5,
      categoryRatings: { cleanliness: 5 },
    };

    const { service, reviewRepository, authManager } = buildService({
      repositoryOverrides: {
        getPublishedReviewsByPropertyId: jest.fn().mockResolvedValue(publicSummary),
      },
    });

    const result = await service.getReviews({
      headers: {},
      queryStringParameters: { propertyId: "property-1" },
    });

    expect(authManager.authenticate).not.toHaveBeenCalled();
    expect(reviewRepository.getPublishedReviewsByPropertyId).toHaveBeenCalledWith("property-1", {
      sort: "recent",
      verifiedOnly: false,
      category: null,
    });
    expect(result).toEqual(publicSummary);
  });

  it("passes public review sorting and filters to the repository", async () => {
    const publicSummary = { reviews: [], totalReviews: 0, overallRating: null, categoryRatings: {} };
    const { service, reviewRepository } = buildService({
      repositoryOverrides: {
        getPublishedReviewsByPropertyId: jest.fn().mockResolvedValue(publicSummary),
      },
    });

    await expect(
      service.getReviews({
        headers: {},
        pathParameters: { propertyId: "property-1" },
        queryStringParameters: { sort: "highest", verified: "true", category: "cleanliness" },
      })
    ).resolves.toEqual(publicSummary);

    expect(reviewRepository.getPublishedReviewsByPropertyId).toHaveBeenCalledWith("property-1", {
      sort: "highest",
      verifiedOnly: true,
      category: "cleanliness",
    });
  });

  it("rejects unsupported public review sort values", async () => {
    const { service, reviewRepository } = buildService();

    await expect(
      service.getReviews({ headers: {}, queryStringParameters: { propertyId: "property-1", sort: "oldest" } })
    ).rejects.toMatchObject({ statusCode: 400, message: "Unsupported review sort value." });

    expect(reviewRepository.getPublishedReviewsByPropertyId).not.toHaveBeenCalled();
  });

  it("rejects unsupported public review category filters", async () => {
    const { service, reviewRepository } = buildService();

    await expect(
      service.getReviews({ headers: {}, queryStringParameters: { propertyId: "property-1", category: "wifi" } })
    ).rejects.toMatchObject({ statusCode: 400, message: "Unsupported rating category: wifi." });

    expect(reviewRepository.getPublishedReviewsByPropertyId).not.toHaveBeenCalled();
  });

  it("rejects unsupported verified filter values", async () => {
    const { service, reviewRepository } = buildService();

    await expect(
      service.getReviews({ headers: {}, queryStringParameters: { propertyId: "property-1", verified: "false" } })
    ).rejects.toMatchObject({ statusCode: 400, message: "verified must be true when provided." });

    expect(reviewRepository.getPublishedReviewsByPropertyId).not.toHaveBeenCalled();
  });
});
