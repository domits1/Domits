// backend/functions/ReviewSystem/business/service/reviewService.js

import { randomUUID } from "node:crypto";
import ReviewRepository from "../../data/reviewRepository.js";
import AuthManager from "../../auth/authManager.js";
import ReviewEligibilityService from "./reviewEligibilityService.js";
import ReviewStatusService from "./reviewStatusService.js";
import { REVIEW_STATUSES } from "./reviewStatus.js";
import { HOST_RESPONSE_ROLES, REVIEW_RESPONSE_STATUSES } from "./reviewResponseStatus.js";
import BadRequestException from "../../util/exception/badRequestException.js";
import ForbiddenException from "../../util/exception/forbiddenException.js";
import NotFoundException from "../../util/exception/notFoundException.js";

const REVIEW_WINDOW_DAYS = 30;
const REVIEW_TYPES = new Set(["GUEST_TO_PROPERTY"]);
const PUBLIC_REVIEW_TYPE = "GUEST_TO_PROPERTY";
const PUBLIC_REVIEW_SORTS = new Set(["recent", "highest", "lowest"]);
const DEFAULT_PUBLIC_REVIEW_SORT = "recent";
const DOMITS_PRIVATE_FEEDBACK_TYPE = "domits_private";
const DOMITS_PRIVATE_FEEDBACK_MAX_LENGTH = 2000;
const DOMITS_INTERNAL_ROLES = new Set([
  "admin",
  "internal",
  "domits_admin",
  "domits_internal",
  "moderator",
  "review_moderator",
]);

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

  // Property reviews are public; booking, host, and personal views stay scoped to the authenticated caller.
  async getReviews(event) {
    const query = event.queryStringParameters || {};
    const propertyId = query.propertyId || event.pathParameters?.propertyId;

    if (propertyId) {
      const publicReviewQuery = await this.parsePublicReviewQuery(query);
      return this.reviewRepository.getPublishedReviewsByPropertyId(propertyId, publicReviewQuery);
    }

    if (query.hostId) {
      return this.getHostReviews(event, query.hostId);
    }

    if (query.bookingId) {
      const user = await this.getAuthenticatedUser(event);
      return this.reviewRepository.getReviewsByBookingForUser(query.bookingId, user.sub);
    }

    if (query.mine === "true") {
      const user = await this.getAuthenticatedUser(event);
      return this.reviewRepository.getReviewsWrittenByUser(user.sub);
    }

    throw new BadRequestException("Missing review query.");
  }

  async getHostReviews(event, hostId) {
    const user = await this.getAuthenticatedUser(event);
    await this.assertHostReviewAccess(user, hostId);

    return {
      reviews: await this.reviewRepository.getReviewsForHost(hostId),
    };
  }

  async parsePublicReviewQuery(query) {
    const sort = query.sort || DEFAULT_PUBLIC_REVIEW_SORT;
    const verifiedOnly = query.verified === "true";
    const category = query.category?.trim() || null;

    this.validatePublicReviewSort(sort);
    this.validatePublicReviewVerified(query.verified);

    if (category) {
      await this.validatePublicReviewCategory(category);
    }

    return {
      sort,
      verifiedOnly,
      category,
    };
  }

  validatePublicReviewSort(sort) {
    if (!PUBLIC_REVIEW_SORTS.has(sort)) {
      throw new BadRequestException("Unsupported review sort value.");
    }
  }

  validatePublicReviewVerified(verified) {
    if (verified !== undefined && verified !== "true") {
      throw new BadRequestException("verified must be true when provided.");
    }
  }

  async validatePublicReviewCategory(category) {
    const supportedCategories = await this.reviewRepository.getActiveRatingCategoryKeys(PUBLIC_REVIEW_TYPE);

    if (!supportedCategories.has(category)) {
      throw new BadRequestException(`Unsupported rating category: ${category}.`);
    }
  }

  // Published detail views use the public DTO so private reviewer and Domits feedback never leaks by id.
  async getReviewById(event, reviewId) {
    const review = await this.reviewRepository.getReviewById(reviewId);

    if (!review) {
      throw new NotFoundException("Review not found.");
    }

    if (review.status === REVIEW_STATUSES.PUBLISHED) {
      return { review: this.reviewRepository.toPublicReview(review) };
    }

    const user = await this.getAuthenticatedUser(event);

    if (review.reviewerUserId !== user.sub && review.hostId !== user.sub) {
      throw new ForbiddenException("You are not allowed to view this review.");
    }

    return { review };
  }

  // Eligibility is checked before records are built so duplicate, stay-window, and booking errors stop one workflow.
  async createReview(event) {
    const user = await this.getAuthenticatedUser(event);
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
      domitsPrivateFeedback: body.domitsPrivateFeedback,
    });

    return this.reviewRepository.createReviewWithRatings(review, ratings, workflowRecords);
  }

  // Internal Domits feedback is audited on read because it is intentionally hidden from hosts and public DTOs.
  async getDomitsPrivateFeedback(event) {
    const user = await this.getAuthenticatedUser(event);
    this.assertDomitsInternalAccess(user);

    const reviewId = this.getRequiredReviewId(event);

    const review = await this.reviewRepository.getReviewById(reviewId);
    if (!review) {
      throw new NotFoundException("Review not found.");
    }

    const feedback = await this.reviewRepository.getDomitsPrivateFeedbackForReview(reviewId);

    if (typeof this.reviewRepository.recordReviewAuditEvent === "function") {
      await this.reviewRepository.recordReviewAuditEvent({
        action: "review.domits_private_feedback.read",
        reviewId,
        actorId: user.sub,
        actorRole: this.normalizeRole(user.role),
        occurredAt: this.clock(),
      });
    }

    return { feedback };
  }

  // Content edits and status transitions have different actors, so each rule is enforced before persistence.
  async updateReview(event) {
    const user = await this.getAuthenticatedUser(event);
    const reviewId = this.getRequiredReviewId(event, { allowQueryString: true });
    const body = this.parseBody(event.body);

    await this.validateUpdateReviewPayload(body);

    const review = await this.reviewRepository.getReviewById(reviewId);
    if (!review) {
      throw new NotFoundException("Review not found.");
    }

    const isContentUpdate = this.hasReviewContentUpdate(body);

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

  // Reviews are soft-deleted to preserve the moderation and booking history tied to the stay.
  async deleteReview(event) {
    const user = await this.getAuthenticatedUser(event);
    const reviewId = this.getRequiredReviewId(event, { allowQueryString: true });

    const review = await this.reviewRepository.getReviewById(reviewId);
    if (!review) {
      throw new NotFoundException("Review not found.");
    }

    if (review.reviewerUserId !== user.sub) {
      throw new ForbiddenException("Only the author can delete this review.");
    }

    return this.reviewRepository.softDeleteReview(reviewId);
  }

  async saveDraftResponse(event) {
    return this.upsertResponse(event, REVIEW_RESPONSE_STATUSES.DRAFT);
  }

  async publishResponse(event) {
    return this.upsertResponse(event, REVIEW_RESPONSE_STATUSES.PUBLISHED);
  }

  async editResponse(event) {
    const user = await this.getAuthenticatedUser(event);
    const reviewId = this.getRequiredReviewId(event);
    const body = this.parseBody(event.body);

    this.validateResponseMessage(body.message);

    const review = await this.getResponseEligibleReview(reviewId);
    await this.assertHostReviewAccess(user, review.hostId);

    const existingResponse = await this.reviewRepository.getResponseByReviewId(reviewId);
    if (!existingResponse) {
      throw new NotFoundException("Review response not found.");
    }

    const now = this.clock();
    const response = await this.reviewRepository.updateReviewResponse(existingResponse.id, {
      message: body.message.trim(),
      updatedAt: now,
    });

    await this.logReviewResponseAudit({
      action: "review.response.updated",
      review,
      response,
      actor: user,
      occurredAt: now,
    });

    return { response };
  }

  async deleteResponse(event) {
    const user = await this.getAuthenticatedUser(event);
    const reviewId = this.getRequiredReviewId(event);

    const review = await this.getResponseEligibleReview(reviewId);
    await this.assertHostReviewAccess(user, review.hostId);

    const existingResponse = await this.reviewRepository.getResponseByReviewId(reviewId);
    if (!existingResponse) {
      throw new NotFoundException("Review response not found.");
    }

    const now = this.clock();
    const response = await this.reviewRepository.updateReviewResponse(existingResponse.id, {
      deletedAt: now,
      updatedAt: now,
    });

    await this.logReviewResponseAudit({
      action: "review.response.deleted",
      review,
      response,
      actor: user,
      occurredAt: now,
    });

    return { message: "Review response deleted successfully." };
  }

  async upsertResponse(event, status) {
    const user = await this.getAuthenticatedUser(event);
    const reviewId = this.getRequiredReviewId(event);
    const body = this.parseBody(event.body);

    this.validateResponseMessage(body.message);

    const review = await this.getResponseEligibleReview(reviewId);
    await this.assertHostReviewAccess(user, review.hostId);

    const now = this.clock();
    const existingResponse = await this.reviewRepository.getResponseByReviewId(reviewId, { includeDeleted: true });

    if (existingResponse?.status === REVIEW_RESPONSE_STATUSES.PUBLISHED && status === REVIEW_RESPONSE_STATUSES.DRAFT) {
      throw new BadRequestException("Published responses cannot be saved as draft.");
    }

    const responseData = {
      reviewId,
      authorId: user.sub,
      authorRole: this.normalizeResponseAuthorRole(user.role),
      status,
      message: body.message.trim(),
      updatedAt: now,
      publishedAt: status === REVIEW_RESPONSE_STATUSES.PUBLISHED ? existingResponse?.publishedAt || now : null,
      deletedAt: null,
    };

    const response = existingResponse
      ? await this.reviewRepository.updateReviewResponse(existingResponse.id, responseData)
      : await this.reviewRepository.saveReviewResponse({
          id: randomUUID(),
          ...responseData,
          createdAt: now,
        });

    await this.logReviewResponseAudit({
      action:
        status === REVIEW_RESPONSE_STATUSES.PUBLISHED
          ? "review.response.published"
          : "review.response.saved_as_draft",
      review,
      response,
      actor: user,
      occurredAt: now,
    });

    return { response };
  }

  async getAuthenticatedUser(event) {
    return this.authManager.authenticate(this.getAuthorizationHeader(event));
  }

  getAuthorizationHeader(event) {
    return event.headers?.Authorization || event.headers?.authorization;
  }

  getRequiredReviewId(event, { allowQueryString = false } = {}) {
    const reviewId = event.pathParameters?.id || (allowQueryString ? event.queryStringParameters?.id : null);

    if (!reviewId) {
      throw new BadRequestException("Missing review id.");
    }

    return reviewId;
  }

  hasReviewContentUpdate(body) {
    return (
      body.title !== undefined ||
      body.publicReview !== undefined ||
      body.privateFeedback !== undefined ||
      body.overallRating !== undefined ||
      body.categoryRatings !== undefined
    );
  }

  async validateCreateReviewPayload(body) {
    if (!body.bookingId) throw new BadRequestException("bookingId is required.");
    if (!body.propertyId) throw new BadRequestException("propertyId is required.");
    if (!body.reviewType) throw new BadRequestException("reviewType is required.");
    if (!REVIEW_TYPES.has(body.reviewType)) throw new BadRequestException("reviewType is not supported.");
    if (!body.title?.trim()) throw new BadRequestException("title is required.");
    if (!body.publicReview?.trim()) throw new BadRequestException("publicReview is required.");
    this.validateDomitsPrivateFeedback(body.domitsPrivateFeedback);

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

  validateResponseMessage(message) {
    if (!message?.trim()) {
      throw new BadRequestException("message is required.");
    }
  }

  validateDomitsPrivateFeedback(message) {
    if (message === undefined || message === null || !String(message).trim()) {
      return;
    }

    if (String(message).trim().length > DOMITS_PRIVATE_FEEDBACK_MAX_LENGTH) {
      throw new BadRequestException("Domits private feedback must be 2000 characters or less.");
    }
  }

  assertDomitsInternalAccess(user) {
    if (!DOMITS_INTERNAL_ROLES.has(this.normalizeRole(user.role))) {
      throw new ForbiddenException("Only authorized Domits internal users can view this feedback.");
    }
  }

  async getResponseEligibleReview(reviewId) {
    const review = await this.reviewRepository.getReviewById(reviewId);

    if (!review) {
      throw new NotFoundException("Review not found.");
    }

    const isEligible =
      review.status === REVIEW_STATUSES.PUBLISHED &&
      review.publicationStatus === "PUBLISHED" &&
      Boolean(review.publicReview?.trim());

    if (!isEligible) {
      throw new ForbiddenException("Only approved public reviews can receive host responses.");
    }

    return review;
  }

  async assertHostReviewAccess(user, hostId) {
    const actorRole = this.normalizeResponseAuthorRole(user.role);

    if (user.sub === hostId && !this.isGuestOnlyRole(actorRole)) {
      return;
    }

    const hasTeamAccess = await this.reviewRepository.hasActiveTeamMembership(user.sub, hostId);
    if (hasTeamAccess && this.isHostResponseRole(actorRole)) {
      return;
    }

    throw new ForbiddenException("You are not allowed to respond to this review.");
  }

  normalizeResponseAuthorRole(role) {
    return this.normalizeRole(role || "host");
  }

  normalizeRole(role) {
    return String(role || "").trim().toLowerCase();
  }

  isHostResponseRole(role) {
    return HOST_RESPONSE_ROLES.has(this.normalizeResponseAuthorRole(role));
  }

  isGuestOnlyRole(role) {
    return ["guest", "traveler", "customer"].includes(this.normalizeResponseAuthorRole(role));
  }

  async logReviewResponseAudit({ action, review, response, actor, occurredAt }) {
    if (typeof this.reviewRepository.recordReviewAuditEvent !== "function") {
      return;
    }

    await this.reviewRepository.recordReviewAuditEvent({
      action,
      reviewId: review.id,
      responseId: response?.id || null,
      actorId: actor.sub,
      actorRole: this.normalizeResponseAuthorRole(actor.role),
      occurredAt,
    });
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

  buildWorkflowRecords({ review, booking, status, now, domitsPrivateFeedback = null }) {
    const isDraft = status === REVIEW_STATUSES.DRAFT;
    const normalizedDomitsPrivateFeedback =
      domitsPrivateFeedback === undefined || domitsPrivateFeedback === null
        ? ""
        : String(domitsPrivateFeedback).trim();
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
      domitsPrivateFeedback: normalizedDomitsPrivateFeedback
        ? {
            id: randomUUID(),
            reviewId: review.id,
            reservationId: booking.id || review.bookingId,
            guestId: review.reviewerUserId,
            propertyId: review.propertyId,
            feedbackType: DOMITS_PRIVATE_FEEDBACK_TYPE,
            message: normalizedDomitsPrivateFeedback,
            createdAt: now,
            updatedAt: now,
          }
        : null,
    };
  }

  parseBody(rawBody) {
    try {
      return typeof rawBody === "string"? JSON.parse(rawBody || "{}") : rawBody || {};
    } catch {
      throw new BadRequestException("Request body must be valid JSON.");
    }
  }
}

export default ReviewService;
