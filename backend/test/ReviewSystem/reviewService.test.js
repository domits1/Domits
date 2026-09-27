import { describe, expect, it, jest } from "@jest/globals";
import ReviewService from "../../functions/ReviewSystem/business/service/reviewService.js";
import ConflictException from "../../functions/ReviewSystem/util/exception/conflictException.js";

// Review: Covers the complete guest, host, private-feedback, and moderation service workflow.
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
    getBookingById: jest.fn().mockResolvedValue(createBooking()),
    getRecentReviewsByReviewer: jest.fn().mockResolvedValue([]),
    updateReviewWithRatings: jest.fn(),
    softDeleteReview: jest.fn(),
    getPublishedReviewsByPropertyId: jest.fn(),
    getReviewsForHost: jest.fn(),
    getReviewsByBookingForUser: jest.fn(),
    getReviewsWrittenByUser: jest.fn(),
    hasActiveTeamMembership: jest.fn().mockResolvedValue(false),
    getResponseByReviewId: jest.fn().mockResolvedValue(null),
    saveReviewResponse: jest.fn().mockImplementation(async (response) => response),
    updateReviewResponse: jest.fn().mockImplementation(async (responseId, updateData) => ({
      id: responseId,
      ...updateData,
    })),
    getDomitsPrivateFeedbackForReview: jest.fn(),
    listDomitsPrivateFeedback: jest.fn().mockResolvedValue([]),
    recordReviewAuditEvent: jest.fn().mockResolvedValue(undefined),
    toPublicReview: jest.fn((review) => ({
      id: review.id,
      overallRating: review.overallRating,
      title: review.title,
      publicReview: review.publicReview,
      verificationStatus: review.verificationStatus,
      status: review.status,
      createdAt: review.createdAt,
      categoryRatings: review.categoryRatings || {},
      response: review.response?.status === "published" ? review.response : null,
    })),
    ...repositoryOverrides,
  };

  const authManager = {
    authenticate: jest.fn().mockResolvedValue({ sub: "guest-1" }),
    ...authOverrides,
  };

  const eligibilityService = {
    validateReservationEligibility: jest.fn().mockResolvedValue(createBooking()),
    assertCompletedStay: jest.fn(),
    assertReviewWindowOpen: jest.fn(),
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
        verification: expect.objectContaining({
          status: "VERIFIED_STAY",
          method: "BOOKING_MATCH",
          reviewId: expect.any(String),
        }),
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

  it("stores Domits private feedback separately when a guest submits a review", async () => {
    const { service, reviewRepository } = buildService();

    await service.createReview(
      createEvent(
        createReviewPayload({
          domitsPrivateFeedback: "Domits should know the payment receipt was confusing.",
        })
      )
    );

    expect(reviewRepository.createReviewWithRatings).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Array),
      expect.objectContaining({
        domitsPrivateFeedback: expect.objectContaining({
          reviewId: expect.any(String),
          reservationId: "booking-1",
          guestId: "guest-1",
          propertyId: "property-1",
          feedbackType: "domits_private",
          message: "Domits should know the payment receipt was confusing.",
          createdAt: NOW,
          updatedAt: NOW,
        }),
      })
    );
  });

  it("rejects Domits private feedback that is too long", async () => {
    const { service, reviewRepository, eligibilityService } = buildService();

    await expect(
      service.createReview(createEvent(createReviewPayload({ domitsPrivateFeedback: "x".repeat(2001) })))
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Domits private feedback must be 2000 characters or less.",
    });

    expect(reviewRepository.createReviewWithRatings).not.toHaveBeenCalled();
    expect(eligibilityService.validateReservationEligibility).not.toHaveBeenCalled();
  });

  it("rejects host private feedback that is too long", async () => {
    const { service, reviewRepository, eligibilityService } = buildService();

    await expect(
      service.createReview(createEvent(createReviewPayload({ privateFeedback: "x".repeat(2001) })))
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Private feedback must be 2000 characters or less.",
    });

    expect(reviewRepository.createReviewWithRatings).not.toHaveBeenCalled();
    expect(eligibilityService.validateReservationEligibility).not.toHaveBeenCalled();
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
      response: null,
    });
    expect(result.review.privateFeedback).toBeUndefined();
    expect(result.review.reviewerUserId).toBeUndefined();
    expect(result.review.hostId).toBeUndefined();
    expect(result.review.domitsPrivateFeedback).toBeUndefined();
  });

  it("allows authorized Domits internal users to read Domits private feedback", async () => {
    const { service, reviewRepository } = buildService({
      authOverrides: {
        authenticate: jest.fn().mockResolvedValue({ sub: "admin-1", role: "admin" }),
      },
      repositoryOverrides: {
        getReviewById: jest.fn().mockResolvedValue(createReview()),
        getDomitsPrivateFeedbackForReview: jest.fn().mockResolvedValue([
          {
            id: "feedback-1",
            reviewId: "review-1",
            feedbackType: "domits_private",
            message: "Internal support note.",
          },
        ]),
      },
    });

    await expect(
      service.getDomitsPrivateFeedback(createEvent(null, { pathParameters: { id: "review-1" } }))
    ).resolves.toEqual({
      feedback: [
        {
          id: "feedback-1",
          reviewId: "review-1",
          feedbackType: "domits_private",
          message: "Internal support note.",
        },
      ],
    });

    expect(reviewRepository.getDomitsPrivateFeedbackForReview).toHaveBeenCalledWith("review-1");
    expect(reviewRepository.recordReviewAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "review.domits_private_feedback.read",
        reviewId: "review-1",
        actorId: "admin-1",
        actorRole: "admin",
        occurredAt: NOW,
      })
    );
  });

  it("blocks hosts from reading Domits private feedback", async () => {
    const { service, reviewRepository } = buildService({
      authOverrides: {
        authenticate: jest.fn().mockResolvedValue({ sub: "host-1", role: "Host" }),
      },
      repositoryOverrides: {
        getReviewById: jest.fn().mockResolvedValue(createReview()),
        getDomitsPrivateFeedbackForReview: jest.fn(),
      },
    });

    await expect(
      service.getDomitsPrivateFeedback(createEvent(null, { pathParameters: { id: "review-1" } }))
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Only authorized Domits internal users can view this feedback.",
    });

    expect(reviewRepository.getDomitsPrivateFeedbackForReview).not.toHaveBeenCalled();
  });

  it("returns the Domits private feedback inbox only to internal users", async () => {
    const feedback = [{ id: "feedback-1", reviewId: "review-1", message: "Internal support note." }];
    const { service, reviewRepository } = buildService({
      authOverrides: {
        authenticate: jest.fn().mockResolvedValue({ sub: "moderator-1", role: "review_moderator" }),
      },
      repositoryOverrides: {
        listDomitsPrivateFeedback: jest.fn().mockResolvedValue(feedback),
      },
    });

    await expect(service.getDomitsPrivateFeedbackInbox({
      headers: { Authorization: "Bearer access-token-1" },
      queryStringParameters: { limit: "500" },
    })).resolves.toEqual({ feedback });
    expect(reviewRepository.listDomitsPrivateFeedback).toHaveBeenCalledWith(100);
  });

  it("blocks hosts from the Domits private feedback inbox", async () => {
    const { service, reviewRepository } = buildService({
      authOverrides: {
        authenticate: jest.fn().mockResolvedValue({ sub: "host-1", role: "Host" }),
      },
    });

    await expect(service.getDomitsPrivateFeedbackInbox({
      headers: { Authorization: "Bearer access-token-1" },
      queryStringParameters: null,
    })).rejects.toMatchObject({ statusCode: 403 });
    expect(reviewRepository.listDomitsPrivateFeedback).not.toHaveBeenCalled();
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

  it("does not share draft private feedback with the host", async () => {
    const { service } = buildService({
      authOverrides: {
        authenticate: jest.fn().mockResolvedValue({ sub: "host-1", role: "Host" }),
      },
      repositoryOverrides: {
        getReviewById: jest.fn().mockResolvedValue(
          createReview({ status: "DRAFT", publicationStatus: "UNPUBLISHED", verificationStatus: "UNVERIFIED" })
        ),
      },
    });

    await expect(
      service.getReviewById({ headers: { Authorization: "Bearer access-token-1" } }, "review-1")
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "This review has not been shared with the host.",
    });
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
    const publicSummary = {
      reviews: [],
      totalReviews: 0,
      overallRating: null,
      categoryRatings: {},
    };

    const { service, reviewRepository } = buildService({
      repositoryOverrides: {
        getPublishedReviewsByPropertyId: jest.fn().mockResolvedValue(publicSummary),
      },
    });

    const result = await service.getReviews({
      headers: {},
      pathParameters: { propertyId: "property-1" },
      queryStringParameters: {
        sort: "highest",
        verified: "true",
        category: "cleanliness",
      },
    });

    expect(reviewRepository.getPublishedReviewsByPropertyId).toHaveBeenCalledWith("property-1", {
      sort: "highest",
      verifiedOnly: true,
      category: "cleanliness",
    });
    expect(result).toEqual(publicSummary);
  });

  it("rejects unsupported public review sort values", async () => {
    const { service, reviewRepository } = buildService();

    await expect(
      service.getReviews({
        headers: {},
        queryStringParameters: {
          propertyId: "property-1",
          sort: "oldest",
        },
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Unsupported review sort value.",
    });

    expect(reviewRepository.getPublishedReviewsByPropertyId).not.toHaveBeenCalled();
  });

  it("rejects unsupported public review category filters", async () => {
    const { service, reviewRepository } = buildService();

    await expect(
      service.getReviews({
        headers: {},
        queryStringParameters: {
          propertyId: "property-1",
          category: "wifi",
        },
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Unsupported rating category: wifi.",
    });

    expect(reviewRepository.getPublishedReviewsByPropertyId).not.toHaveBeenCalled();
  });

  it("rejects unsupported verified filter values", async () => {
    const { service, reviewRepository } = buildService();

    await expect(
      service.getReviews({
        headers: {},
        queryStringParameters: {
          propertyId: "property-1",
          verified: "false",
        },
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "verified must be true when provided.",
    });

    expect(reviewRepository.getPublishedReviewsByPropertyId).not.toHaveBeenCalled();
  });

  it("returns host reviews only after host access is authorized", async () => {
    const hostReviews = [createReview()];
    const { service, reviewRepository } = buildService({
      authOverrides: {
        authenticate: jest.fn().mockResolvedValue({ sub: "host-1", role: "Host" }),
      },
      repositoryOverrides: {
        getReviewsForHost: jest.fn().mockResolvedValue(hostReviews),
      },
    });

    const result = await service.getReviews({
      headers: { Authorization: "Bearer access-token-1" },
      queryStringParameters: { hostId: "host-1" },
    });

    expect(result).toEqual({ reviews: hostReviews });
    expect(reviewRepository.getReviewsForHost).toHaveBeenCalledWith("host-1");
  });

  it("filters guest drafts and rejected reviews out of the host response", async () => {
    const submittedReview = createReview({ id: "submitted-review", status: "SUBMITTED" });
    const { service } = buildService({
      authOverrides: {
        authenticate: jest.fn().mockResolvedValue({ sub: "host-1", role: "Host" }),
      },
      repositoryOverrides: {
        getReviewsForHost: jest.fn().mockResolvedValue([
          submittedReview,
          createReview({ id: "draft-review", status: "DRAFT" }),
          createReview({ id: "rejected-review", status: "REJECTED" }),
        ]),
      },
    });

    await expect(service.getReviews({
      headers: { Authorization: "Bearer access-token-1" },
      queryStringParameters: { hostId: "host-1" },
    })).resolves.toEqual({ reviews: [submittedReview] });
  });

  it("saves a draft response for an eligible public review", async () => {
    const { service, reviewRepository } = buildService({
      authOverrides: {
        authenticate: jest.fn().mockResolvedValue({ sub: "host-1", role: "Host" }),
      },
      repositoryOverrides: {
        getReviewById: jest.fn().mockResolvedValue(createReview()),
      },
    });

    const result = await service.saveDraftResponse({
      headers: { Authorization: "Bearer access-token-1" },
      pathParameters: { id: "review-1" },
      body: JSON.stringify({ message: "Thank you for staying with us." }),
    });

    expect(reviewRepository.saveReviewResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewId: "review-1",
        authorId: "host-1",
        authorRole: "host",
        status: "draft",
        message: "Thank you for staying with us.",
        createdAt: NOW,
        updatedAt: NOW,
        publishedAt: null,
        deletedAt: null,
      })
    );
    expect(result.response.status).toBe("draft");
    expect(reviewRepository.recordReviewAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "review.response.saved_as_draft",
        reviewId: "review-1",
        actorId: "host-1",
      })
    );
  });

  it("publishes an existing draft response", async () => {
    const { service, reviewRepository } = buildService({
      authOverrides: {
        authenticate: jest.fn().mockResolvedValue({ sub: "host-1", role: "Host" }),
      },
      repositoryOverrides: {
        getReviewById: jest.fn().mockResolvedValue(createReview()),
        getResponseByReviewId: jest.fn().mockResolvedValue({
          id: "response-1",
          reviewId: "review-1",
          status: "draft",
          message: "Draft response.",
        }),
      },
    });

    const result = await service.publishResponse({
      headers: { Authorization: "Bearer access-token-1" },
      pathParameters: { id: "review-1" },
      body: JSON.stringify({ message: "Published response." }),
    });

    expect(reviewRepository.updateReviewResponse).toHaveBeenCalledWith(
      "response-1",
      expect.objectContaining({
        status: "published",
        message: "Published response.",
        publishedAt: NOW,
        deletedAt: null,
      })
    );
    expect(result.response.status).toBe("published");
  });

  it("rejects responses for ineligible unpublished reviews", async () => {
    const { service, reviewRepository } = buildService({
      authOverrides: {
        authenticate: jest.fn().mockResolvedValue({ sub: "host-1", role: "Host" }),
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
      service.saveDraftResponse({
        headers: { Authorization: "Bearer access-token-1" },
        pathParameters: { id: "review-1" },
        body: JSON.stringify({ message: "Thanks." }),
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Only approved public reviews can receive host responses.",
    });

    expect(reviewRepository.saveReviewResponse).not.toHaveBeenCalled();
  });

  it("rejects unrelated users from creating responses", async () => {
    const { service, reviewRepository } = buildService({
      authOverrides: {
        authenticate: jest.fn().mockResolvedValue({ sub: "guest-2", role: "Guest" }),
      },
      repositoryOverrides: {
        getReviewById: jest.fn().mockResolvedValue(createReview()),
      },
    });

    await expect(
      service.saveDraftResponse({
        headers: { Authorization: "Bearer access-token-1" },
        pathParameters: { id: "review-1" },
        body: JSON.stringify({ message: "Thanks." }),
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "You are not allowed to respond to this review.",
    });

    expect(reviewRepository.hasActiveTeamMembership).toHaveBeenCalledWith("guest-2", "host-1");
    expect(reviewRepository.saveReviewResponse).not.toHaveBeenCalled();
  });

  it("allows active property-manager team members to respond", async () => {
    const { service, reviewRepository } = buildService({
      authOverrides: {
        authenticate: jest.fn().mockResolvedValue({
          sub: "team-member-1",
          role: "Property Operations Manager",
        }),
      },
      repositoryOverrides: {
        getReviewById: jest.fn().mockResolvedValue(createReview()),
        hasActiveTeamMembership: jest.fn().mockResolvedValue(true),
      },
    });

    await service.saveDraftResponse({
      headers: { Authorization: "Bearer access-token-1" },
      pathParameters: { id: "review-1" },
      body: JSON.stringify({ message: "Thanks for the feedback." }),
    });

    expect(reviewRepository.saveReviewResponse).toHaveBeenCalled();
  });

  it("soft deletes an existing response", async () => {
    const { service, reviewRepository } = buildService({
      authOverrides: {
        authenticate: jest.fn().mockResolvedValue({ sub: "host-1", role: "Host" }),
      },
      repositoryOverrides: {
        getReviewById: jest.fn().mockResolvedValue(createReview()),
        getResponseByReviewId: jest.fn().mockResolvedValue({
          id: "response-1",
          reviewId: "review-1",
          status: "published",
          message: "Published response.",
        }),
      },
    });

    const result = await service.deleteResponse({
      headers: { Authorization: "Bearer access-token-1" },
      pathParameters: { id: "review-1" },
    });

    expect(result).toEqual({ message: "Review response deleted successfully." });
    expect(reviewRepository.updateReviewResponse).toHaveBeenCalledWith(
      "response-1",
      expect.objectContaining({
        deletedAt: NOW,
        updatedAt: NOW,
      })
    );
  });
});
