// backend/functions/ReviewSystem/business/service/reviewService.js

import { randomUUID } from "node:crypto";
import ReviewRepository from "../../data/reviewRepository.js";
import AuthManager from "../../auth/authManager.js";
import ReviewEligibilityService from "./reviewEligibilityService.js";
import ReviewStatusService from "./reviewStatusService.js";
import { REVIEW_STATUSES } from "../model/reviewStatus.js";
import BadRequestException from "../../util/exception/badRequestException.js";
import ForbiddenException from "../../util/exception/forbiddenException.js";
import NotFoundException from "../../util/exception/notFoundException.js";

const REVIEW_WINDOW_DAYS = 30;
const REVIEW_TYPES = new Set(["GUEST_TO_PROPERTY"]);

// Review: Coordinates review validation, lifecycle transitions, and persistence for the API controller.
class ReviewService {
  constructor({
    reviewRepository = new ReviewRepository(),
    authManager = new AuthManager(),
    eligibilityService = null,
    statusService = new ReviewStatusService(),
    clock = Date.now,
  } = {}) {
    this.reviewRepository = reviewRepository;
    this.authManager = authManager;
    this.clock = clock;
    this.statusService = statusService;
    this.eligibilityService =
      eligibilityService ||
      new ReviewEligibilityService({
        reviewRepository,
        clock,
      });
  }

  // Fetch the review list for a user, booking, or property context.
  // Review: Selects the authenticated guest history, booking-scoped reviews, or published property reviews.
  async getReviews(event) {
    const query = event.queryStringParameters || {};

    if (query.propertyId) {
      return this.reviewRepository.getPublishedReviewsByPropertyId(query.propertyId);
    }

    if (query.bookingId) {
      const user = await this.authManager.authenticate(event.headers?.Authorization || event.headers?.authorization);
      return this.reviewRepository.getReviewsByBookingForUser(query.bookingId, user.sub);
    }

    if (query.mine === "true") {
      const user = await this.authManager.authenticate(event.headers?.Authorization || event.headers?.authorization);
      return this.reviewRepository.getReviewsWrittenByUser(user.sub);
    }

    throw new BadRequestException("Missing review query.");
  }

  // Read a single review while enforcing public and access-restricted visibility rules.
  // Review: Published reviews are public; unpublished data stays limited to the guest or host.
  async getReviewById(event, reviewId) {
    const review = await this.reviewRepository.getReviewById(reviewId);

    if (!review) {
      throw new NotFoundException("Review not found.");
    }

    if (review.status === REVIEW_STATUSES.PUBLISHED) {
      return { review: this.reviewRepository.toPublicReview(review) };
    }

    const user = await this.authManager.authenticate(event.headers?.Authorization || event.headers?.authorization);

    if (review.reviewerUserId !== user.sub && review.hostId !== user.sub) {
      throw new ForbiddenException("You are not allowed to view this review.");
    }

    return { review };
  }

  // Create a review after validating the reservation and required review content.
  // Review: Validates the completed stay before building the review, ratings, and workflow records.
  async createReview(event) {
    const user = await this.authManager.authenticate(event.headers?.Authorization || event.headers?.authorization);
    const body = this.parseBody(event.body);

    await this.validateCreateReviewPayload(body);

    const booking = await this.eligibilityService.validateReservationEligibility({
      bookingId: body.bookingId,
      propertyId: body.propertyId,
      reviewType: body.reviewType,
      reviewerUserId: user.sub,
    });

    const now = this.clock();
    const requestedStatus = body.status || REVIEW_STATUSES.SUBMITTED;
    const status = this.resolveInitialStatus(requestedStatus);

    const review = this.buildReviewRecord({
      booking,
      body,
      reviewerUserId: user.sub,
      status,
      now,
    });

    const ratings = this.buildReviewRatingRecords({
      reviewId: review.id,
      categoryRatings: body.categoryRatings,
      createdAt: now,
    });

    const workflowRecords = this.buildWorkflowRecords({
      review,
      booking,
      status,
      now,
    });

    return this.reviewRepository.createReviewWithRatings(review, ratings, workflowRecords);
  }

  // Update review content or status while respecting author and workflow rules.
  // Review: Limits content changes to the author and delegates status transitions to the status service.
  async updateReview(event) {
    const user = await this.authManager.authenticate(event.headers?.Authorization || event.headers?.authorization);
    const reviewId = event.pathParameters?.id || event.queryStringParameters?.id;
    const body = this.parseBody(event.body);

    if (!reviewId) {
      throw new BadRequestException("Missing review id.");
    }

    const review = await this.reviewRepository.getReviewById(reviewId);
    if (!review) {
      throw new NotFoundException("Review not found.");
    }

    await this.validateUpdateReviewPayload(body, review);

    const isContentUpdate =
      body.title !== undefined ||
      body.publicReview !== undefined ||
      body.privateFeedback !== undefined ||
      body.overallRating !== undefined ||
      body.categoryRatings !== undefined;

    if (isContentUpdate && review.reviewerUserId !== user.sub) {
      throw new ForbiddenException("Only the author can update review content.");
    }

    if (isContentUpdate && !this.statusService.canAuthorEditContent(review.status)) {
      throw new ForbiddenException("Review content can only be edited while draft or submitted.");
    }

    const now = this.clock();
    const nextStatus =
      body.status !== undefined
        ? this.resolveUpdateStatus({
            currentStatus: review.status,
            requestedStatus: body.status,
            actorUserId: user.sub,
            authorUserId: review.reviewerUserId,
            actorRole: user.role,
          })
        : review.status;
    const updateData = this.buildReviewUpdateRecord(body, nextStatus, now);

    const ratings =
      body.categoryRatings !== undefined
        ? this.buildReviewRatingRecords({
            reviewId,
            categoryRatings: body.categoryRatings,
            createdAt: now,
          })
        : undefined;

    const workflowRecords = body.status
      ? this.buildWorkflowRecords({
          review: { ...review, ...updateData, id: reviewId },
          booking: { id: review.bookingId },
          status: nextStatus,
          now,
        })
      : {};

    return this.reviewRepository.updateReviewWithRatings(reviewId, updateData, ratings, workflowRecords);
  }

  // Remove a review only when the author is allowed to delete it.
  // Review: Allows only the author to remove a review while retaining its workflow history.
  async deleteReview(event) {
    const user = await this.authManager.authenticate(event.headers?.Authorization || event.headers?.authorization);
    const reviewId = event.pathParameters?.id || event.queryStringParameters?.id;

    if (!reviewId) {
      throw new BadRequestException("Missing review id.");
    }

    const review = await this.reviewRepository.getReviewById(reviewId);
    if (!review) {
      throw new NotFoundException("Review not found.");
    }

    if (review.reviewerUserId !== user.sub) {
      throw new ForbiddenException("Only the author can delete this review.");
    }

    return this.reviewRepository.softDeleteReview(reviewId);
  }

  // Validate the payload before a review is created.
  // Review: Drafts may be partial, while submitted reviews require complete public content.
  async validateCreateReviewPayload(body) {
    if (!body.bookingId) throw new BadRequestException("bookingId is required.");
    if (!body.propertyId) throw new BadRequestException("propertyId is required.");
    if (!body.reviewType) throw new BadRequestException("reviewType is required.");
    if (!REVIEW_TYPES.has(body.reviewType)) throw new BadRequestException("reviewType is not supported.");

    this.validateStatus(body.status, true);

    const requestedStatus = this.statusService.normalize(body.status || REVIEW_STATUSES.SUBMITTED);
    const isDraft = requestedStatus === REVIEW_STATUSES.DRAFT;

    if (!isDraft && !body.title?.trim()) throw new BadRequestException("title is required.");
    if (!isDraft && !body.publicReview?.trim()) throw new BadRequestException("publicReview is required.");

    if (!isDraft || body.overallRating !== undefined) {
      this.validateRating(body.overallRating, "overallRating");
    }

    await this.validateCategoryRatings(body.reviewType, body.categoryRatings);
  }

  // Validate an update request before changing review fields or status.
  // Review: Ensures incoming edits are consistent with the current review state and permissions.
  async validateUpdateReviewPayload(body, review) {
    const hasEditableField =
      body.title !== undefined ||
      body.publicReview !== undefined ||
      body.privateFeedback !== undefined ||
      body.overallRating !== undefined ||
      body.categoryRatings !== undefined ||
      body.status !== undefined;

    if (!hasEditableField) {
      throw new BadRequestException("At least one review field is required.");
    }

    const targetStatus = this.statusService.normalize(body.status || review.status);
    const isDraft = targetStatus === REVIEW_STATUSES.DRAFT;
    const nextTitle = body.title !== undefined ? body.title : review.title;
    const nextPublicReview = body.publicReview !== undefined ? body.publicReview : review.publicReview;
    const nextOverallRating = body.overallRating !== undefined ? body.overallRating : review.overallRating;

    if (!isDraft && !nextTitle?.trim()) {
      throw new BadRequestException("title cannot be empty.");
    }

    if (!isDraft && !nextPublicReview?.trim()) {
      throw new BadRequestException("publicReview cannot be empty.");
    }

    if (body.status !== undefined) {
      this.validateStatus(body.status, false);
    }

    if (!isDraft || (body.overallRating !== undefined && Number(body.overallRating) !== 0)) {
      this.validateRating(nextOverallRating, "overallRating");
    }

    if (body.categoryRatings !== undefined) {
      await this.validateCategoryRatings(body.reviewType || "GUEST_TO_PROPERTY", body.categoryRatings);
    }
  }

  // Check whether a provided review status is allowed for the current action.
  // Review: Centralizes validation for empty, draft, and transition-specific status checks.
  validateStatus(status, allowEmpty) {
    if (status === undefined && allowEmpty) return;
    this.statusService.validate(status);
  }

  // Validate the category rating payload against the supported review type.
  // Review: This keeps each rating within the allowed categories and range.
  async validateCategoryRatings(reviewType, categoryRatings) {
    if (categoryRatings === undefined) return;

    if (categoryRatings === null || Array.isArray(categoryRatings) || typeof categoryRatings !== "object") {
      throw new BadRequestException("categoryRatings must be an object.");
    }

    const supportedCategories = await this.reviewRepository.getActiveRatingCategoryKeys(reviewType);

    Object.entries(categoryRatings).forEach(([category, rating]) => {
      if (!supportedCategories.has(category)) {
        throw new BadRequestException(`Unsupported rating category: ${category}.`);
      }

      this.validateRating(rating, `categoryRatings.${category}`);
    });
  }

  // Normalize and validate a rating value before storing or sending it.
  // Review: All review scores must be numeric and remain within the 1-to-5 range.
  validateRating(value, fieldName) {
    const rating = Number(value);

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException(`${fieldName} must be between 1 and 5.`);
    }
  }

  // Resolve the starting status for a newly created review.
  // Review: This maps submitted or draft intent into the correct initial review state.
  resolveInitialStatus(status) {
    return this.statusService.resolveInitialStatus(status);
  }

  // Resolve the next review status during an update.
  // Review: This ensures transitions respect role, ownership, and workflow rules.
  resolveUpdateStatus({ currentStatus, requestedStatus, actorUserId, authorUserId, actorRole }) {
    return this.statusService.resolveUpdateStatus({
      currentStatus,
      requestedStatus,
      actorUserId,
      authorUserId,
      actorRole,
    });
  }

  // Build the persisted review record from booking and request data.
  // Review: This creates the base review entity with derived status metadata and normalized values.
  buildReviewRecord({ booking, body, reviewerUserId, status, now }) {
    const derivedStatuses = this.statusService.getDerivedStatuses(status);

    return {
      id: randomUUID(),
      bookingId: booking.id,
      propertyId: booking.property_id,
      hostId: booking.hostid,
      reviewerUserId,
      revieweeUserId: booking.hostid,
      reviewType: body.reviewType,
      overallRating: body.overallRating === undefined ? 0 : Number(body.overallRating),
      title: body.title?.trim() || "",
      publicReview: body.publicReview?.trim() || "",
      privateFeedback: body.privateFeedback?.trim() || null,
      verificationStatus: derivedStatuses.verificationStatus,
      publicationStatus: derivedStatuses.publicationStatus,
      status,
      createdAt: now,
      updatedAt: now,
    };
  }

  // Prepare the field updates that will be persisted for an existing review.
  // Review: This keeps the update payload consistent with the new status and trimmed content.
  buildReviewUpdateRecord(body, status, now) {
    const derivedStatuses = this.statusService.getDerivedStatuses(status);

    return {
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.publicReview !== undefined ? { publicReview: body.publicReview.trim() } : {}),
      ...(body.privateFeedback !== undefined ? { privateFeedback: body.privateFeedback?.trim() || null } : {}),
      ...(body.overallRating !== undefined ? { overallRating: Number(body.overallRating) } : {}),
      status,
      verificationStatus: derivedStatuses.verificationStatus,
      publicationStatus: derivedStatuses.publicationStatus,
      updatedAt: now,
    };
  }

  // Convert category-based scores into stored review rating records.
  // Review: This creates one record per category so ratings can be queried and audited later.
  buildReviewRatingRecords({ reviewId, categoryRatings = {}, createdAt }) {
    return Object.entries(categoryRatings).map(([category, rating]) => ({
      id: randomUUID(),
      reviewId,
      category,
      rating: Number(rating),
      createdAt,
    }));
  }

  // Build the review request, verification, and moderation workflow entries.
  // Review: Builds the request, verification, and moderation side records that match the review status.
  buildWorkflowRecords({ review, booking, status, now }) {
    const isDraft = status === REVIEW_STATUSES.DRAFT;
    const isVerified = [
      REVIEW_STATUSES.VERIFIED,
      REVIEW_STATUSES.PENDING_MODERATION,
      REVIEW_STATUSES.PUBLISHED,
    ].includes(status);
    let moderation = null;

    if (status === REVIEW_STATUSES.PENDING_MODERATION) {
      moderation = {
        id: randomUUID(),
        reviewId: review.id,
        targetType: "REVIEW",
        status: "PENDING",
        reason: null,
        notes: null,
        moderatedByUserId: null,
        moderatedAt: null,
        createdAt: now,
        updatedAt: now,
      };
    } else if (status === REVIEW_STATUSES.PUBLISHED || status === REVIEW_STATUSES.REJECTED) {
      moderation = {
        id: randomUUID(),
        reviewId: review.id,
        targetType: "REVIEW",
        status: status === REVIEW_STATUSES.PUBLISHED ? "APPROVED" : "REJECTED",
        reason: null,
        notes: null,
        moderatedByUserId: null,
        moderatedAt: now,
        createdAt: now,
        updatedAt: now,
      };
    }

    return {
      reviewRequest: {
        id: randomUUID(),
        bookingId: review.bookingId,
        propertyId: review.propertyId,
        hostId: review.hostId,
        guestId: review.reviewerUserId,
        reviewType: review.reviewType,
        status: isDraft ? "OPEN" : "COMPLETED",
        requestedAt: now,
        expiresAt: now + REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000,
        completedAt: isDraft ? null : now,
        createdAt: now,
        updatedAt: now,
      },
      verification: isVerified
        ? {
            id: randomUUID(),
            reviewId: review.id,
            bookingId: booking.id || review.bookingId,
            status: "VERIFIED_STAY",
            method: "BOOKING_MATCH",
            evidenceJson: JSON.stringify({ bookingId: booking.id || review.bookingId }),
            verifiedAt: now,
            createdAt: now,
            updatedAt: now,
          }
        : null,
      moderation,
    };
  }

  // Parse and validate the incoming request payload.
  // Review: This normalizes JSON input and turns malformed bodies into a clear API error.
  parseBody(rawBody) {
    try {
      return typeof rawBody === "string" ? JSON.parse(rawBody || "{}") : rawBody || {};
    } catch {
      throw new BadRequestException("Request body must be valid JSON.");
    }
  }
}

export default ReviewService;
