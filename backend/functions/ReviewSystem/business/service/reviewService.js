// backend/functions/ReviewSystem/business/service/reviewService.js

import { randomUUID } from "node:crypto";
import ReviewRepository from "../../data/reviewRepository.js";
import AuthManager from "../../auth/authManager.js";
import ReviewEligibilityService from "./reviewEligibilityService.js";
import ReviewStatusService from "./reviewStatusService.js";
import { REVIEW_STATUSES } from "./reviewStatus.js";
import BadRequestException from "../../util/exception/badRequestException.js";
import ForbiddenException from "../../util/exception/forbiddenException.js";
import NotFoundException from "../../util/exception/notFoundException.js";

const REVIEW_WINDOW_DAYS = 30;
const REVIEW_TYPES = new Set(["GUEST_TO_PROPERTY"]);
const PUBLIC_REVIEW_TYPE = "GUEST_TO_PROPERTY";
const PUBLIC_REVIEW_SORTS = new Set(["recent", "highest", "lowest"]);
const DEFAULT_PUBLIC_REVIEW_SORT = "recent";

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

  async getReviews(event) {
    // Review: Selects the authenticated guest history, booking-scoped reviews, or published property reviews.
    const query = event.queryStringParameters || {};
    const propertyId = query.propertyId || event.pathParameters?.propertyId;

    if (propertyId) {
      const publicReviewQuery = await this.parsePublicReviewQuery(query);
      return this.reviewRepository.getPublishedReviewsByPropertyId(propertyId, publicReviewQuery);
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

  async parsePublicReviewQuery(query) {
    // Review: Converts public sort and filter query parameters into validated repository options.
    const sort = query.sort || DEFAULT_PUBLIC_REVIEW_SORT;
    const verifiedOnly = query.verified === "true";
    const category = query.category?.trim() || null;

    if (!PUBLIC_REVIEW_SORTS.has(sort)) {
      throw new BadRequestException("Unsupported review sort value.");
    }

    if (query.verified !== undefined && query.verified !== "true") {
      throw new BadRequestException("verified must be true when provided.");
    }

    if (category) {
      const supportedCategories = await this.reviewRepository.getActiveRatingCategoryKeys(PUBLIC_REVIEW_TYPE);

      if (!supportedCategories.has(category)) {
        throw new BadRequestException(`Unsupported rating category: ${category}.`);
      }
    }

    return { sort, verifiedOnly, category };
  }

  async getReviewById(event, reviewId) {
    // Review: Published reviews are public; unpublished data stays limited to the guest or host.
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

  async createReview(event) {
    // Review: Validates the completed stay before building the review, ratings, and workflow records.
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

  async updateReview(event) {
    // Review: Limits content changes to the author and delegates status transitions to the status service.
    const user = await this.authManager.authenticate(event.headers?.Authorization || event.headers?.authorization);
    const reviewId = event.pathParameters?.id || event.queryStringParameters?.id;
    const body = this.parseBody(event.body);

    if (!reviewId) {
      throw new BadRequestException("Missing review id.");
    }

    await this.validateUpdateReviewPayload(body);

    const review = await this.reviewRepository.getReviewById(reviewId);
    if (!review) {
      throw new NotFoundException("Review not found.");
    }

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

  async deleteReview(event) {
    // Review: Allows only the author to remove a review while retaining its workflow history.
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

  async validateCreateReviewPayload(body) {
    // Review: Rejects incomplete or unsupported review payloads before booking eligibility is queried.
    if (!body.bookingId) throw new BadRequestException("bookingId is required.");
    if (!body.propertyId) throw new BadRequestException("propertyId is required.");
    if (!body.reviewType) throw new BadRequestException("reviewType is required.");
    if (!REVIEW_TYPES.has(body.reviewType)) throw new BadRequestException("reviewType is not supported.");
    if (!body.title?.trim()) throw new BadRequestException("title is required.");
    if (!body.publicReview?.trim()) throw new BadRequestException("publicReview is required.");

    this.validateStatus(body.status, true);
    this.validateRating(body.overallRating, "overallRating");
    await this.validateCategoryRatings(body.categoryRatings, body.reviewType);
  }

  async validateUpdateReviewPayload(body) {
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

    if (body.title !== undefined && !body.title?.trim()) {
      throw new BadRequestException("title cannot be empty.");
    }

    if (body.publicReview !== undefined && !body.publicReview?.trim()) {
      throw new BadRequestException("publicReview cannot be empty.");
    }

    if (body.status !== undefined) {
      this.validateStatus(body.status, false);
    }

    if (body.overallRating !== undefined) {
      this.validateRating(body.overallRating, "overallRating");
    }

    if (body.categoryRatings !== undefined) {
      await this.validateCategoryRatings(body.categoryRatings, body.reviewType || "GUEST_TO_PROPERTY");
    }
  }

  validateStatus(status, allowEmpty) {
    if (status === undefined && allowEmpty) return;
    this.statusService.validate(status);
  }

  async validateCategoryRatings(categoryRatings = {}, reviewType) {
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

  validateRating(value, fieldName) {
    const rating = Number(value);

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException(`${fieldName} must be between 1 and 5.`);
    }
  }

  resolveInitialStatus(status) {
    return this.statusService.resolveInitialStatus(status);
  }

  resolveUpdateStatus({ currentStatus, requestedStatus, actorUserId, authorUserId, actorRole }) {
    return this.statusService.resolveUpdateStatus({
      currentStatus,
      requestedStatus,
      actorUserId,
      authorUserId,
      actorRole,
    });
  }

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
      overallRating: Number(body.overallRating),
      title: body.title.trim(),
      publicReview: body.publicReview.trim(),
      privateFeedback: body.privateFeedback?.trim() || null,
      verificationStatus: derivedStatuses.verificationStatus,
      publicationStatus: derivedStatuses.publicationStatus,
      status,
      createdAt: now,
      updatedAt: now,
    };
  }

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

  buildReviewRatingRecords({ reviewId, categoryRatings = {}, createdAt }) {
    return Object.entries(categoryRatings).map(([category, rating]) => ({
      id: randomUUID(),
      reviewId,
      category,
      rating: Number(rating),
      createdAt,
    }));
  }

  buildWorkflowRecords({ review, booking, status, now }) {
    // Review: Builds the request, verification, and moderation side records that match the review status.
    const isDraft = status === REVIEW_STATUSES.DRAFT;
    const isVerified = [
      REVIEW_STATUSES.VERIFIED,
      REVIEW_STATUSES.PENDING_MODERATION,
      REVIEW_STATUSES.PUBLISHED,
    ].includes(status);

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
      moderation:
        status === REVIEW_STATUSES.PENDING_MODERATION
          ? {
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
            }
          : status === REVIEW_STATUSES.PUBLISHED || status === REVIEW_STATUSES.REJECTED
            ? {
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
              }
            : null,
    };
  }

  parseBody(rawBody) {
    try {
      return typeof rawBody === "string" ? JSON.parse(rawBody || "{}") : rawBody || {};
    } catch {
      throw new BadRequestException("Request body must be valid JSON.");
    }
  }
}

export default ReviewService;
