// Review: backend/functions/ReviewSystem/business/service/reviewService.js

import { randomUUID } from "node:crypto";
import ReviewRepository from "../../data/reviewRepository.js";
import AuthManager from "../../auth/authManager.js";
import ReviewEligibilityService from "./reviewEligibilityService.js";
import ReviewStatusService from "./reviewStatusService.js";
import ReviewVerificationService from "./reviewVerificationService.js";
import ReviewRequestService from "./reviewRequestService.js";
import { REVIEW_STATUSES } from "./reviewStatus.js";
import { HOST_RESPONSE_ROLES, REVIEW_RESPONSE_STATUSES } from "./reviewResponseStatus.js";
import BadRequestException from "../../util/exception/badRequestException.js";
import ForbiddenException from "../../util/exception/forbiddenException.js";
import NotFoundException from "../../util/exception/notFoundException.js";
import { REVIEW_REQUEST_DELAY_HOURS, REVIEW_WINDOW_DAYS } from "../../util/reviewPolicy.js";

const REVIEW_TYPES = new Set(["GUEST_TO_PROPERTY"]);
const PUBLIC_REVIEW_TYPE = "GUEST_TO_PROPERTY";
const PUBLIC_REVIEW_SORTS = new Set(["recent", "highest", "lowest"]);
const DEFAULT_PUBLIC_REVIEW_SORT = "recent";
const HOST_VISIBLE_REVIEW_STATUSES = new Set([
  REVIEW_STATUSES.SUBMITTED,
  REVIEW_STATUSES.VERIFIED,
  REVIEW_STATUSES.PENDING_MODERATION,
  REVIEW_STATUSES.PUBLISHED,
]);
const DOMITS_PRIVATE_FEEDBACK_TYPE = "domits_private";
const PRIVATE_FEEDBACK_MAX_LENGTH = 2000;
const DOMITS_PRIVATE_FEEDBACK_MAX_LENGTH = 2000;
const DOMITS_INTERNAL_ROLES = new Set([
  "admin",
  "internal",
  "domits_admin",
  "domits_internal",
  "moderator",
  "review_moderator",
  "review moderator",
]);

// Review: Coordinates guest submissions, reminders, moderation, private feedback, and host responses.
class ReviewService {
  constructor({
    reviewRepository = new ReviewRepository(),
    authManager = new AuthManager(),
    eligibilityService = null,
    statusService = new ReviewStatusService(),
    verificationService = new ReviewVerificationService(),
    requestService = null,
    clock = Date.now,
  } = {}) {
    this.reviewRepository = reviewRepository;
    this.authManager = authManager;
    this.clock = clock;
    this.statusService = statusService;
    this.verificationService = verificationService;
    this.requestService = requestService || new ReviewRequestService({ reviewRepository, clock });
    this.eligibilityService =
      eligibilityService ||
      new ReviewEligibilityService({
        reviewRepository,
        clock,
      });
  }

  // Review: Property reviews are public; booking, host, and personal views stay scoped to the authenticated caller.
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

  // Review: Return reviews visible to a host after checking host or team access.
  async getHostReviews(event, hostId) {
    const user = await this.getAuthenticatedUser(event);
    await this.assertHostReviewAccess(user, hostId, "You are not allowed to view these reviews.");
    const reviews = await this.reviewRepository.getReviewsForHost(hostId);

    return {
      reviews: reviews.filter((review) => HOST_VISIBLE_REVIEW_STATUSES.has(review.status)),
    };
  }

  // Review: Normalize public-review filters before passing them to the repository.
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

  // Review: Keep public review sorting limited to the supported choices.
  validatePublicReviewSort(sort) {
    if (!PUBLIC_REVIEW_SORTS.has(sort)) {
      throw new BadRequestException("Unsupported review sort value.");
    }
  }

  // Review: Reject malformed verification filters instead of silently broadening the query.
  validatePublicReviewVerified(verified) {
    if (verified !== undefined && verified !== "true") {
      throw new BadRequestException("verified must be true when provided.");
    }
  }

  // Review: Ensure a requested category is active for the public review type.
  async validatePublicReviewCategory(category) {
    const supportedCategories = await this.reviewRepository.getActiveRatingCategoryKeys(PUBLIC_REVIEW_TYPE);

    if (!supportedCategories.has(category)) {
      throw new BadRequestException(`Unsupported rating category: ${category}.`);
    }
  }

  // Review: Published detail views use the public DTO so private reviewer and Domits feedback never leaks by id.
  async getReviewById(event, reviewId) {
    const review = await this.reviewRepository.getReviewById(reviewId);

    if (!review) {
      throw new NotFoundException("Review not found.");
    }

    if (review.status === REVIEW_STATUSES.PUBLISHED) {
      return { review: this.reviewRepository.toPublicReview(review) };
    }

    const user = await this.getAuthenticatedUser(event);

    if (review.reviewerUserId === user.sub) {
      return { review };
    }

    if (!HOST_VISIBLE_REVIEW_STATUSES.has(review.status)) {
      throw new ForbiddenException("This review has not been shared with the host.");
    }

    await this.assertHostReviewAccess(user, review.hostId, "You are not allowed to view this review.");
    return { review };
  }

  // Review: Eligibility is checked before records are built so duplicate, stay-window, and booking errors stop one workflow.
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
    if (status === REVIEW_STATUSES.SUBMITTED) {
      const recentReviews = await this.reviewRepository.getRecentReviewsByReviewer(user.sub, now);
      workflowRecords.verification = this.verificationService.evaluate({ review, booking, now, recentReviews });
      if (workflowRecords.verification.status === "NEEDS_REVIEW") {
        workflowRecords.moderation = this.buildModerationRecord(review.id, now, "PENDING", "AUTOMATED_FLAG");
      }
    }

    return this.reviewRepository.createReviewWithRatings(review, ratings, workflowRecords);
  }

  // Review: Internal Domits feedback is audited on read because it is intentionally hidden from hosts and public DTOs.
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

  // Review: The internal inbox includes feedback from reviews that have already left the moderation queue.
  async getDomitsPrivateFeedbackInbox(event) {
    const user = await this.getAuthenticatedUser(event);
    this.assertDomitsInternalAccess(user);
    const rawLimit = Number(event.queryStringParameters?.limit || 100);
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 100;

    return {
      feedback: await this.reviewRepository.listDomitsPrivateFeedback(limit),
    };
  }

  // Review: Content edits and status transitions have different actors, so each rule is enforced before persistence.
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

    if (body.status && this.statusService.isModerator(user.role) && review.reviewerUserId !== user.sub) {
      throw new BadRequestException("Use the moderation endpoint for moderator decisions.");
    }

    if (isContentUpdate && review.reviewerUserId !== user.sub) {
      throw new ForbiddenException("Only the author can update review content.");
    }

    if (isContentUpdate && !this.statusService.canAuthorEditContent(review.status)) {
      throw new ForbiddenException("Review content can only be edited while draft or submitted.");
    }

    const needsBookingCheck = isContentUpdate || this.statusService.normalize(body.status) === REVIEW_STATUSES.SUBMITTED;
    const booking = needsBookingCheck ? await this.reviewRepository.getBookingById(review.bookingId) : null;
    if (needsBookingCheck) {
      if (!booking) throw new NotFoundException("Booking not found.");
      this.eligibilityService.assertCompletedStay(booking);
      this.eligibilityService.assertReviewWindowOpen(booking);
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

    if (nextStatus === REVIEW_STATUSES.SUBMITTED && (review.status !== REVIEW_STATUSES.SUBMITTED || isContentUpdate)) {
      const recentReviews = await this.reviewRepository.getRecentReviewsByReviewer(user.sub, now);
      workflowRecords.verification = this.verificationService.evaluate({ review: { ...review, ...updateData }, booking, now, recentReviews });
      if (workflowRecords.verification.status === "NEEDS_REVIEW") {
        workflowRecords.moderation = this.buildModerationRecord(reviewId, now, "PENDING", "AUTOMATED_FLAG");
      }
    }

    return this.reviewRepository.updateReviewWithRatings(reviewId, updateData, ratings, workflowRecords);
  }

  // Review: Reviews are soft-deleted to preserve the moderation and booking history tied to the stay.
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

  // Review: Delegate scheduled invitation work to the service that owns request timing.
  async processReviewRequests(detail = {}) {
    return this.requestService.processDue(detail);
  }

  // Review: Return the caller's current review-email preference.
  async getNotificationPreference(event) {
    const user = await this.getAuthenticatedUser(event);
    return this.reviewRepository.getReviewNotificationPreference(user.sub);
  }

  // Review: Persist whether the caller wants future review invitations.
  async setNotificationPreference(event) {
    const user = await this.getAuthenticatedUser(event);
    const body = this.parseBody(event.body);
    if (typeof body.emailEnabled !== "boolean") throw new BadRequestException("emailEnabled must be a boolean.");
    return this.reviewRepository.saveReviewNotificationPreference(user.sub, body.emailEnabled, this.clock());
  }

  // Review: Load reviews awaiting moderation together with verification evidence and history.
  async getModerationQueue(event) {
    const user = await this.getAuthenticatedUser(event);
    this.assertModerator(user);
    const reviews = await this.reviewRepository.listModerationQueue();
    return { reviews: await Promise.all(reviews.map(async (review) => {
      let verification = await this.reviewRepository.getReviewVerification(review.id);
      if (!verification) {
        const booking = await this.reviewRepository.getBookingById(review.bookingId);
        if (booking) {
          const recentReviews = await this.reviewRepository.getRecentReviewsByReviewer(review.reviewerUserId, this.clock());
          verification = this.verificationService.evaluate({ review, booking, now: this.clock(), recentReviews });
        }
      }
      return { ...review, verification,
        moderationHistory: await this.reviewRepository.getReviewModerationHistory(review.id) };
    })) };
  }

  // Review: Apply a moderator decision only after rechecking the booking and verification evidence.
  async moderateReview(event) {
    const user = await this.getAuthenticatedUser(event);
    this.assertModerator(user);
    const reviewId = this.getRequiredReviewId(event);
    const body = this.parseBody(event.body);
    const decision = String(body.decision || "").toUpperCase();
    if (!["APPROVE", "REJECT"].includes(decision)) throw new BadRequestException("decision must be APPROVE or REJECT.");
    if (body.reason !== undefined && (typeof body.reason !== "string" || body.reason.length > 255)) throw new BadRequestException("reason must be 255 characters or less.");
    if (body.notes !== undefined && (typeof body.notes !== "string" || body.notes.length > 2000)) throw new BadRequestException("notes must be 2000 characters or less.");
    if (decision === "REJECT" && !body.reason?.trim()) throw new BadRequestException("reason is required when rejecting a review.");
    const review = await this.reviewRepository.getReviewById(reviewId);
    if (!review) throw new NotFoundException("Review not found.");
    if (!["SUBMITTED", "VERIFIED", "PENDING_MODERATION"].includes(review.status)) {
      throw new BadRequestException("Review is not awaiting moderation.");
    }
    const booking = await this.reviewRepository.getBookingById(review.bookingId);
    if (!booking || String(booking.status).toLowerCase() !== "completed" ||
        booking.guestid !== review.reviewerUserId || booking.property_id !== review.propertyId ||
        Number(booking.departuredate) > this.clock()) {
      throw new ForbiddenException("Review booking could not be verified.");
    }
    const now = this.clock();
    const currentVerification = await this.reviewRepository.getReviewVerification(reviewId);
    const recentReviews = currentVerification ? [] : await this.reviewRepository.getRecentReviewsByReviewer(review.reviewerUserId, now);
    const verification = currentVerification || this.verificationService.evaluate({ review, booking, now, recentReviews });
    if (decision === "APPROVE" && verification.status === "NEEDS_REVIEW" && !body.reason?.trim()) {
      throw new BadRequestException("reason is required to approve a flagged review.");
    }
    if (decision === "APPROVE" && verification.status === "NEEDS_REVIEW") {
      verification.evidenceJson = JSON.stringify({ ...JSON.parse(verification.evidenceJson || "{}"),
        overrideReason: body.reason.trim(), overrideBy: user.sub });
      verification.status = "VERIFIED_STAY";
      verification.verifiedAt = now;
      verification.updatedAt = now;
    }
    const status = decision === "APPROVE" ? "PUBLISHED" : "REJECTED";
    const moderation = this.buildModerationRecord(reviewId, now, decision === "APPROVE" ? "APPROVED" : "REJECTED", body.reason?.trim() || null, user.sub, body.notes?.trim() || null);
    const updated = await this.reviewRepository.decideReview({ reviewId, expectedStatus: review.status, status, verification, moderation, now });
    return { review: updated, moderation };
  }

  // Review: Guard moderation endpoints against non-moderator callers.
  assertModerator(user) {
    if (!this.statusService.isModerator(user.role)) throw new ForbiddenException("Moderator access is required.");
  }

  // Review: Build the audit record that explains how a review moderation decision was made.
  buildModerationRecord(reviewId, now, status, reason = null, actorId = null, notes = null) {
    return { id: randomUUID(), reviewId, targetType: "REVIEW", status, reason, notes,
      moderatedByUserId: actorId, moderatedAt: actorId ? now : null, createdAt: now, updatedAt: now };
  }

  // Review: Save a host response without making it publicly visible yet.
  async saveDraftResponse(event) {
    return this.upsertResponse(event, REVIEW_RESPONSE_STATUSES.DRAFT);
  }

  // Review: Save and publish a host response in one workflow step.
  async publishResponse(event) {
    return this.upsertResponse(event, REVIEW_RESPONSE_STATUSES.PUBLISHED);
  }

  // Review: Update an existing host response while preserving its audit trail.
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

  // Review: Soft-delete a host response so its history remains available for auditing.
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

  // Review: Create or update a host response with the requested publication state.
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

    const publishedAt = status === REVIEW_RESPONSE_STATUSES.PUBLISHED ? existingResponse?.publishedAt || now : null;
    const responseData = {
      reviewId,
      authorId: user.sub,
      authorRole: this.normalizeResponseAuthorRole(user.role),
      status,
      message: body.message.trim(),
      updatedAt: now,
      publishedAt,
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

  // Review: Authenticate the caller using the request's authorization header.
  async getAuthenticatedUser(event) {
    return this.authManager.authenticate(this.getAuthorizationHeader(event));
  }

  // Review: Accept either capitalization used by API Gateway clients for authorization.
  getAuthorizationHeader(event) {
    return event.headers?.Authorization || event.headers?.authorization;
  }

  // Review: Resolve the review id from the route, optionally allowing a query parameter.
  getRequiredReviewId(event, { allowQueryString = false } = {}) {
    const reviewId = event.pathParameters?.id || (allowQueryString ? event.queryStringParameters?.id : null);

    if (!reviewId) {
      throw new BadRequestException("Missing review id.");
    }

    return reviewId;
  }

  // Review: Detect whether an update changes review content rather than only its status.
  hasReviewContentUpdate(body) {
    return (
      body.title !== undefined ||
      body.publicReview !== undefined ||
      body.privateFeedback !== undefined ||
      body.overallRating !== undefined ||
      body.categoryRatings !== undefined
    );
  }

  // Review: Validate the fields required to create a review and its ratings.
  async validateCreateReviewPayload(body) {
    if (!body.bookingId) throw new BadRequestException("bookingId is required.");
    if (!body.propertyId) throw new BadRequestException("propertyId is required.");
    if (!body.reviewType) throw new BadRequestException("reviewType is required.");
    if (!REVIEW_TYPES.has(body.reviewType)) throw new BadRequestException("reviewType is not supported.");
    if (!body.title?.trim()) throw new BadRequestException("title is required.");
    if (!body.publicReview?.trim()) throw new BadRequestException("publicReview is required.");
    this.validatePrivateFeedback(body.privateFeedback);
    this.validateDomitsPrivateFeedback(body.domitsPrivateFeedback);

    this.validateStatus(body.status, true);
    this.validateRating(body.overallRating, "overallRating");
    await this.validateCategoryRatings(body.reviewType, body.categoryRatings);
  }

  // Review: Validate only the fields supplied when an existing review is edited.
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

    this.validatePrivateFeedback(body.privateFeedback);

    if (body.status !== undefined) {
      this.validateStatus(body.status, false);
    }

    if (body.overallRating !== undefined) {
      this.validateRating(body.overallRating, "overallRating");
    }

    if (body.categoryRatings !== undefined) {
      await this.validateCategoryRatings(body.reviewType || "GUEST_TO_PROPERTY", body.categoryRatings);
    }
  }

  // Review: Reuse the status service while allowing drafts to omit a status on creation.
  validateStatus(status, allowEmpty) {
    if (status === undefined && allowEmpty) return;
    this.statusService.validate(status);
  }

  // Review: Check category names and rating ranges against the active configuration.
  async validateCategoryRatings(reviewType, categoryRatings = {}) {
    if (!categoryRatings || Array.isArray(categoryRatings) || typeof categoryRatings !== "object") {
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

  // Review: Keep every overall and category rating within the five-star scale.
  validateRating(value, fieldName) {
    const rating = Number(value);

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException(`${fieldName} must be between 1 and 5.`);
    }
  }

  // Review: Require a non-empty message before creating or updating a host response.
  validateResponseMessage(message) {
    if (!message?.trim()) {
      throw new BadRequestException("message is required.");
    }
  }

  // Review: Validate optional internal feedback without rejecting an intentionally empty value.
  validateDomitsPrivateFeedback(message) {
    if (message === undefined || message === null || !String(message).trim()) {
      return;
    }

    if (String(message).trim().length > DOMITS_PRIVATE_FEEDBACK_MAX_LENGTH) {
      throw new BadRequestException("Domits private feedback must be 2000 characters or less.");
    }
  }

  // Review: Host feedback is private, but it still needs the same server-side size boundary as the form.
  validatePrivateFeedback(message) {
    if (message === undefined || message === null || !String(message).trim()) {
      return;
    }

    if (String(message).trim().length > PRIVATE_FEEDBACK_MAX_LENGTH) {
      throw new BadRequestException("Private feedback must be 2000 characters or less.");
    }
  }

  // Review: Restrict internal feedback access to authorized Domits roles.
  assertDomitsInternalAccess(user) {
    if (!DOMITS_INTERNAL_ROLES.has(this.normalizeRole(user.role))) {
      throw new ForbiddenException("Only authorized Domits internal users can view this feedback.");
    }
  }

  // Review: Only published public reviews may receive a host response.
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

  // Review: Confirm that the host or an authorized team member owns the response context.
  async assertHostReviewAccess(user, hostId, deniedMessage = "You are not allowed to respond to this review.") {
    const actorRole = this.normalizeResponseAuthorRole(user.role);

    if (user.sub === hostId && !this.isGuestOnlyRole(actorRole)) {
      return;
    }

    const hasTeamAccess = await this.reviewRepository.hasActiveTeamMembership(user.sub, hostId);
    if (hasTeamAccess && this.isHostResponseRole(actorRole)) {
      return;
    }

    throw new ForbiddenException(deniedMessage);
  }

  // Review: Normalize response roles before applying host-access rules.
  normalizeResponseAuthorRole(role) {
    return this.normalizeRole(role || "host");
  }

  // Review: Normalize role values for reliable authorization comparisons.
  normalizeRole(role) {
    return String(role || "").trim().toLowerCase();
  }

  // Review: Check whether a role can publish a response on behalf of a host.
  isHostResponseRole(role) {
    return HOST_RESPONSE_ROLES.has(this.normalizeResponseAuthorRole(role));
  }

  // Review: Identify roles that must never act as host responders.
  isGuestOnlyRole(role) {
    return ["guest", "traveler", "customer"].includes(this.normalizeResponseAuthorRole(role));
  }

  // Review: Record response reads and changes when repository audit support is available.
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

  // Review: Resolve the allowed starting status for a new review.
  resolveInitialStatus(status) {
    return this.statusService.resolveInitialStatus(status);
  }

  // Review: Resolve an author or moderator transition through the status service.
  resolveUpdateStatus({ currentStatus, requestedStatus, actorUserId, authorUserId, actorRole }) {
    return this.statusService.resolveUpdateStatus({
      currentStatus,
      requestedStatus,
      actorUserId,
      authorUserId,
      actorRole,
    });
  }

  // Review: Build the persisted review fields from the verified booking and request body.
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

  // Review: Build only the changed review fields while refreshing derived statuses.
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

  // Review: Convert category ratings into database records for the review transaction.
  buildReviewRatingRecords({ reviewId, categoryRatings = {}, createdAt }) {
    return Object.entries(categoryRatings).map(([category, rating]) => ({
      id: randomUUID(),
      reviewId,
      category,
      rating: Number(rating),
      createdAt,
    }));
  }

  // Review: Assemble request, verification, moderation, and internal-feedback records together.
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
        expiresAt: Number(booking.departuredate || now) + REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000,
        completedAt: isDraft ? null : now,
        nextSendAt: isDraft ? Math.max(now, Number(booking.departuredate || now) + REVIEW_REQUEST_DELAY_HOURS * 60 * 60 * 1000) : null,
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

  // Review: Parse JSON request bodies and return a consistent client error for malformed input.
  parseBody(rawBody) {
    try {
      return typeof rawBody === "string" ? JSON.parse(rawBody || "{}") : rawBody || {};
    } catch {
      throw new BadRequestException("Request body must be valid JSON.");
    }
  }
}

export default ReviewService;
