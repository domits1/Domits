// Review: backend/functions/ReviewSystem/business/service/reviewService.js

import { randomUUID } from "node:crypto";
import ReviewRepository from "../../data/reviewRepository.js";
import AuthManager from "../../auth/authManager.js";
import ReviewEligibilityService from "./reviewEligibilityService.js";
import ReviewStatusService from "./reviewStatusService.js";
import ReviewVerificationService from "./reviewVerificationService.js";
import ReviewRequestService from "./reviewRequestService.js";
import { REVIEW_STATUSES } from "../model/reviewStatus.js";
import { HOST_RESPONSE_ROLES, REVIEW_RESPONSE_STATUSES } from "../model/reviewResponseStatus.js";
import { getReviewTypePolicy, isPublicReviewType, REVIEW_TYPES } from "../model/reviewTypes.js";
import BadRequestException from "../../util/exception/badRequestException.js";
import ForbiddenException from "../../util/exception/forbiddenException.js";
import NotFoundException from "../../util/exception/notFoundException.js";
import { REVIEW_REQUEST_DELAY_HOURS, REVIEW_WINDOW_DAYS } from "../../util/reviewPolicy.js";

const PUBLIC_REVIEW_TYPE = REVIEW_TYPES.GUEST_TO_PROPERTY;
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
  // Receives the services that coordinate review workflows.
  // Defaults provide production dependencies while allowing test overrides.
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

  // Routes property queries publicly and booking, host, or personal queries by scope.
  // Authenticates only the caller-specific views before reading reviews.
  async getReviews(event) {
    const query = event.queryStringParameters || {};
    const propertyId = query.propertyId || event.pathParameters?.propertyId;

    if (propertyId) {
      const publicReviewQuery = await this.parsePublicReviewQuery(query, propertyId);
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

  // Loads reviews for a host after confirming host or team-member access.
  // Filters the results to statuses visible to hosts.
  async getHostReviews(event, hostId) {
    const user = await this.getAuthenticatedUser(event);
    await this.assertHostReviewAccess(user, hostId, "You are not allowed to view these reviews.");
    const reviews = await this.reviewRepository.getReviewsForHost(hostId);

    return {
      reviews: reviews.filter((review) => HOST_VISIBLE_REVIEW_STATUSES.has(review.status)),
    };
  }

  async getReviewCategories(event) {
    const query = event.queryStringParameters || {};
    const reviewType = query.reviewType || REVIEW_TYPES.GUEST_TO_PROPERTY;

    this.validateReviewType(reviewType);

    return {
      categories: await this.reviewRepository.getRatingCategories(reviewType, {
        propertyId: query.propertyId || null,
      }),
    };
  }

  async getReviewCategoryConfiguration(event) {
    const user = await this.getAuthenticatedUser(event);
    const query = event.queryStringParameters || {};
    const propertyId = String(query.propertyId || "").trim();
    const reviewType = query.reviewType || REVIEW_TYPES.GUEST_TO_PROPERTY;

    if (!propertyId) throw new BadRequestException("propertyId is required.");
    this.validateReviewType(reviewType);

    const property = await this.assertReviewCategoryConfigurationAccess(user, propertyId);
    const categories = await this.reviewRepository.getRatingCategories(reviewType, {
      propertyId,
      includeInactive: true,
    });

    return { propertyId, hostId: property.hostid, reviewType, categories };
  }

  async saveReviewCategoryConfiguration(event) {
    const user = await this.getAuthenticatedUser(event);
    const body = this.parseBody(event.body);
    const propertyId = String(body.propertyId || "").trim();
    const reviewType = body.reviewType || REVIEW_TYPES.GUEST_TO_PROPERTY;

    if (!propertyId) throw new BadRequestException("propertyId is required.");
    this.validateReviewType(reviewType);

    const property = await this.assertReviewCategoryConfigurationAccess(user, propertyId);
    const categories = await this.validateReviewCategoryConfiguration({
      propertyId,
      reviewType,
      categories: body.categories,
    });

    const savedCategories = await this.reviewRepository.savePropertyRatingCategoryConfiguration({
      propertyId,
      hostId: property.hostid,
      reviewType,
      categories,
      actorUserId: user.sub,
      now: this.clock(),
    });

    return { propertyId, hostId: property.hostid, reviewType, categories: savedCategories };
  }

  // Normalizes sort, verification, and category filters for public review queries.
  // Validates each supplied filter before returning repository query options.
  async parsePublicReviewQuery(query, propertyId = null) {
    const sort = query.sort || DEFAULT_PUBLIC_REVIEW_SORT;
    const verifiedOnly = query.verified === "true";
    const category = query.category?.trim() || null;

    this.validatePublicReviewSort(sort);
    this.validatePublicReviewVerified(query.verified);

    if (category) {
      await this.validatePublicReviewCategory(category, propertyId);
    }

    return {
      sort,
      verifiedOnly,
      category,
    };
  }

  // Allows only the supported public review sort options.
  // Rejects invalid values before they reach the repository.
  validatePublicReviewSort(sort) {
    if (!PUBLIC_REVIEW_SORTS.has(sort)) {
      throw new BadRequestException("Unsupported review sort value.");
    }
  }

  // Accepts only the supported public verification filter value.
  // Rejects malformed values rather than broadening the query silently.
  validatePublicReviewVerified(verified) {
    if (verified !== undefined && verified !== "true") {
      throw new BadRequestException("verified must be true when provided.");
    }
  }

  // Loads the active categories for public property reviews.
  // Rejects a requested category that is not currently supported.
  async validatePublicReviewCategory(category, propertyId = null) {
    const supportedCategories = await this.reviewRepository.getActiveRatingCategoryKeys(PUBLIC_REVIEW_TYPE, propertyId);

    if (!supportedCategories.has(category)) {
      throw new BadRequestException(`Unsupported rating category: ${category}.`);
    }
  }

  // Returns published public reviews through a privacy-filtered DTO.
  // Restricts unpublished and private review details to authorized users.
  async getReviewById(event, reviewId) {
    const review = await this.reviewRepository.getReviewById(reviewId);

    if (!review) {
      throw new NotFoundException("Review not found.");
    }

    if (review.status === REVIEW_STATUSES.PUBLISHED && isPublicReviewType(review.reviewType)) {
      return { review: this.reviewRepository.toPublicReview(review) };
    }

    const user = await this.getAuthenticatedUser(event);

    if (review.reviewerUserId === user.sub) {
      return { review };
    }

    if (!HOST_VISIBLE_REVIEW_STATUSES.has(review.status)) {
      throw new ForbiddenException("This review has not been shared with the host.");
    }

    if (review.revieweeUserId === user.sub) {
      return { review };
    }

    await this.assertHostReviewAccess(user, review.hostId, "You are not allowed to view this review.");
    return { review };
  }

  // Validates the submission and booking before building review records.
  // Creates ratings and workflow records only after eligibility succeeds.
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

  // Returns internal feedback only to authorized Domits users.
  // Records an audit event when feedback is accessed.
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

  // Returns the internal Domits feedback inbox to authorized users.
  // Bounds the requested page size before querying the repository.
  async getDomitsPrivateFeedbackInbox(event) {
    const user = await this.getAuthenticatedUser(event);
    this.assertDomitsInternalAccess(user);
    const rawLimit = Number(event.queryStringParameters?.limit || 100);
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 100;

    return {
      feedback: await this.reviewRepository.listDomitsPrivateFeedback(limit),
    };
  }

  // Validates edits, authorization, and any required booking checks before updating.
  // Rebuilds affected review and workflow records, then persists the changes.
  async updateReview(event) {
    const user = await this.getAuthenticatedUser(event);
    const reviewId = this.getRequiredReviewId(event, { allowQueryString: true });
    const body = this.parseBody(event.body);

    const review = await this.reviewRepository.getReviewById(reviewId);
    if (!review) {
      throw new NotFoundException("Review not found.");
    }

    await this.validateUpdateReviewPayload(body, review.reviewType, review.propertyId);

    const isContentUpdate = this.hasReviewContentUpdate(body);
    this.assertReviewUpdateAllowed({ body, review, user, isContentUpdate });
    const booking = await this.getReviewUpdateBooking({ body, review, isContentUpdate });

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

    await this.applySubmissionVerification({
      booking,
      isContentUpdate,
      nextStatus,
      now,
      review,
      reviewId,
      updateData,
      user,
      workflowRecords,
    });

    return this.reviewRepository.updateReviewWithRatings(reviewId, updateData, ratings, workflowRecords);
  }

  // Checks whether the caller may change review content or status.
  // Keeps moderator decisions on the moderation workflow.
  assertReviewUpdateAllowed({ body, review, user, isContentUpdate }) {
    if (body.status && this.statusService.isModerator(user.role) && review.reviewerUserId !== user.sub) {
      throw new BadRequestException("Use the moderation endpoint for moderator decisions.");
    }
    if (isContentUpdate && review.reviewerUserId !== user.sub) {
      throw new ForbiddenException("Only the author can update review content.");
    }
    if (isContentUpdate && !this.statusService.canAuthorEditContent(review.status)) {
      throw new ForbiddenException("Review content can only be edited while draft or submitted.");
    }
  }

  // Loads the booking when content changes or a review is submitted.
  // Rechecks checkout and review-window eligibility before proceeding.
  async getReviewUpdateBooking({ body, review, isContentUpdate }) {
    const isSubmission = this.statusService.normalize(body.status) === REVIEW_STATUSES.SUBMITTED;
    if (!isContentUpdate && !isSubmission) return null;

    const booking = await this.reviewRepository.getBookingById(review.bookingId);
    if (!booking) throw new NotFoundException("Booking not found.");
    this.eligibilityService.assertCompletedStay(booking);
    this.eligibilityService.assertReviewWindowOpen(booking);
    return booking;
  }

  // Re-evaluates verification when a review is newly submitted or edited.
  // Adds a moderation record when the verification rules flag the review.
  async applySubmissionVerification({ booking, isContentUpdate, nextStatus, now, review, reviewId, updateData, user, workflowRecords }) {
    const shouldVerify = nextStatus === REVIEW_STATUSES.SUBMITTED &&
      (review.status !== REVIEW_STATUSES.SUBMITTED || isContentUpdate);
    if (!shouldVerify) return;

    const recentReviews = await this.reviewRepository.getRecentReviewsByReviewer(user.sub, now);
    workflowRecords.verification = this.verificationService.evaluate({
      review: { ...review, ...updateData },
      booking,
      now,
      recentReviews,
    });
    if (workflowRecords.verification.status === "NEEDS_REVIEW") {
      workflowRecords.moderation = this.buildModerationRecord(reviewId, now, "PENDING", "AUTOMATED_FLAG");
    }
  }

  // Allows only the review author to delete their review.
  // Uses soft deletion to preserve its booking and moderation history.
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

  // Delegates scheduled invitation processing to the request service.
  // Keeps request timing and delivery behavior outside this service.
  async processReviewRequests(detail = {}) {
    return this.requestService.processDue(detail);
  }

  // Gets the authenticated caller's review email preference.
  // Uses the caller identity rather than accepting a user id from the request.
  async getNotificationPreference(event) {
    const user = await this.getAuthenticatedUser(event);
    return this.reviewRepository.getReviewNotificationPreference(user.sub);
  }

  // Validates and saves the caller's review email preference.
  // Requires an explicit boolean value and records the update time.
  async setNotificationPreference(event) {
    const user = await this.getAuthenticatedUser(event);
    const body = this.parseBody(event.body);
    if (typeof body.emailEnabled !== "boolean") throw new BadRequestException("emailEnabled must be a boolean.");
    return this.reviewRepository.saveReviewNotificationPreference(user.sub, body.emailEnabled, this.clock());
  }

  // Loads the moderation queue for an authorized moderator.
  // Includes verification evidence and prior moderation history for each review.
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

  // Validates a moderator decision and rechecks booking and verification evidence.
  // Persists the resulting status and moderation audit record.
  async moderateReview(event) {
    const user = await this.getAuthenticatedUser(event);
    this.assertModerator(user);
    const reviewId = this.getRequiredReviewId(event);
    const body = this.parseBody(event.body);
    const decision = this.validateModerationRequest(body);
    const review = await this.getModeratableReview(reviewId);
    const booking = await this.getModerationBooking(review);
    const now = this.clock();
    const verification = await this.getModerationVerification({ review, booking, now });
    this.applyModerationOverride({ body, decision, now, user, verification });
    const status = decision === "APPROVE" ? "PUBLISHED" : "REJECTED";
    const moderation = this.buildModerationRecord(reviewId, now, decision === "APPROVE" ? "APPROVED" : "REJECTED", body.reason?.trim() || null, user.sub, body.notes?.trim() || null);
    const updated = await this.reviewRepository.decideReview({ reviewId, expectedStatus: review.status, status, verification, moderation, now });
    return { review: updated, moderation };
  }

  // Validates the requested moderation decision and optional text fields.
  // Requires a reason when rejecting a review.
  validateModerationRequest(body) {
    const decision = String(body.decision || "").toUpperCase();
    if (!["APPROVE", "REJECT"].includes(decision)) throw new BadRequestException("decision must be APPROVE or REJECT.");
    if (body.reason !== undefined && (typeof body.reason !== "string" || body.reason.length > 255)) throw new BadRequestException("reason must be 255 characters or less.");
    if (body.notes !== undefined && (typeof body.notes !== "string" || body.notes.length > 2000)) throw new BadRequestException("notes must be 2000 characters or less.");
    if (decision === "REJECT" && !body.reason?.trim()) throw new BadRequestException("reason is required when rejecting a review.");
    return decision;
  }

  // Loads the review selected for moderation.
  // Rejects reviews that are missing or no longer awaiting a decision.
  async getModeratableReview(reviewId) {
    const review = await this.reviewRepository.getReviewById(reviewId);
    if (!review) throw new NotFoundException("Review not found.");
    if (!["SUBMITTED", "VERIFIED", "PENDING_MODERATION"].includes(review.status)) {
      throw new BadRequestException("Review is not awaiting moderation.");
    }
    return review;
  }

  // Loads the review's booking and verifies it matches the reviewer and property.
  // Rejects moderation when the completed stay cannot be confirmed.
  async getModerationBooking(review) {
    const booking = await this.reviewRepository.getBookingById(review.bookingId);
    const isVerifiedBooking = booking &&
      String(booking.status).toLowerCase() === "completed" &&
      booking.guestid === review.reviewerUserId &&
      booking.property_id === review.propertyId &&
      Number(booking.departuredate) <= this.clock();

    if (!isVerifiedBooking) throw new ForbiddenException("Review booking could not be verified.");
    return booking;
  }

  // Uses stored verification evidence when it is already available.
  // Otherwise evaluates the review against the booking and reviewer history.
  async getModerationVerification({ review, booking, now }) {
    const currentVerification = await this.reviewRepository.getReviewVerification(review.id);
    if (currentVerification) return currentVerification;

    const recentReviews = await this.reviewRepository.getRecentReviewsByReviewer(review.reviewerUserId, now);
    return this.verificationService.evaluate({ review, booking, now, recentReviews });
  }

  // Applies a moderator override only when approving a flagged review.
  // Stores the reason and actor in verification evidence.
  applyModerationOverride({ body, decision, now, user, verification }) {
    if (decision !== "APPROVE" || verification.status !== "NEEDS_REVIEW") return;

    const overrideReason = body.reason?.trim();
    if (!overrideReason) {
      throw new BadRequestException("reason is required to approve a flagged review.");
    }

    verification.evidenceJson = JSON.stringify({
      ...JSON.parse(verification.evidenceJson || "{}"),
      overrideReason,
      overrideBy: user.sub,
    });
    verification.status = "VERIFIED_STAY";
    verification.verifiedAt = now;
    verification.updatedAt = now;
  }

  // Ensures moderation actions are restricted to moderator roles.
  // Rejects all other authenticated callers.
  assertModerator(user) {
    if (!this.statusService.isModerator(user.role)) throw new ForbiddenException("Moderator access is required.");
  }

  // Builds the record describing a moderation decision and its actor.
  // Leaves moderator identity and decision time empty for automated records.
  buildModerationRecord(reviewId, now, status, reason = null, actorId = null, notes = null) {
    return { id: randomUUID(), reviewId, targetType: "REVIEW", status, reason, notes,
      moderatedByUserId: actorId, moderatedAt: actorId ? now : null, createdAt: now, updatedAt: now };
  }

  // Saves a host response in draft state.
  // Delegates shared validation and persistence to the response workflow.
  async saveDraftResponse(event) {
    return this.upsertResponse(event, REVIEW_RESPONSE_STATUSES.DRAFT);
  }

  // Saves a host response in published state.
  // Delegates shared validation and persistence to the response workflow.
  async publishResponse(event) {
    return this.upsertResponse(event, REVIEW_RESPONSE_STATUSES.PUBLISHED);
  }

  // Validates access and updates an existing host response.
  // Records the change in the review response audit history.
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

  // Allows an authorized host or team member to remove a response from view.
  // Soft-deletes the response and records the action for auditing.
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

  // Creates or updates a response in the requested publication state.
  // Enforces response eligibility and access, then records an audit event.
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

  // Authenticates the request caller through the configured auth manager.
  // Extracts the authorization value using the shared header helper.
  async getAuthenticatedUser(event) {
    return this.authManager.authenticate(this.getAuthorizationHeader(event));
  }

  // Reads the authorization header in either common capitalization.
  // Returns undefined when the request has no authorization header.
  getAuthorizationHeader(event) {
    return event.headers?.Authorization || event.headers?.authorization;
  }

  // Reads the review id from the route or an allowed query parameter.
  // Rejects requests that do not provide an id.
  getRequiredReviewId(event, { allowQueryString = false } = {}) {
    const reviewId = event.pathParameters?.id || (allowQueryString ? event.queryStringParameters?.id : null);

    if (!reviewId) {
      throw new BadRequestException("Missing review id.");
    }

    return reviewId;
  }

  // Detects whether an update includes editable review content or ratings.
  // Separates content authorization rules from status-only changes.
  hasReviewContentUpdate(body) {
    return (
      body.title !== undefined ||
      body.publicReview !== undefined ||
      body.privateFeedback !== undefined ||
      body.overallRating !== undefined ||
      body.categoryRatings !== undefined
    );
  }

  // Validates required creation fields, feedback, status, and ratings.
  // Checks category names against the active review type configuration.
  async validateCreateReviewPayload(body) {
    if (!body.bookingId) throw new BadRequestException("bookingId is required.");
    if (!body.propertyId) throw new BadRequestException("propertyId is required.");
    if (!body.reviewType) throw new BadRequestException("reviewType is required.");
    this.validateReviewType(body.reviewType);
    if (!body.title?.trim()) throw new BadRequestException("title is required.");
    if (!body.publicReview?.trim()) throw new BadRequestException("publicReview is required.");
    this.validatePrivateFeedback(body.privateFeedback);
    this.validateDomitsPrivateFeedback(body.domitsPrivateFeedback);

    this.validateStatus(body.status, true);
    this.validateRating(body.overallRating, "overallRating");
    await this.validateCategoryRatings(body.reviewType, body.categoryRatings, body.propertyId);
  }

  // Validates only fields supplied in an update request.
  // Rejects empty content and invalid status or rating values.
  async validateUpdateReviewPayload(body, reviewType = REVIEW_TYPES.GUEST_TO_PROPERTY, propertyId = null) {
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
      await this.validateCategoryRatings(reviewType, body.categoryRatings, propertyId);
    }
  }

  validateReviewType(reviewType) {
    if (!getReviewTypePolicy(reviewType)) {
      throw new BadRequestException("reviewType is not supported.");
    }
  }

  // Delegates status validation to the shared status service.
  // Allows an omitted status only when the caller permits it.
  validateStatus(status, allowEmpty) {
    if (status === undefined && allowEmpty) return;
    this.statusService.validate(status);
  }

  // Checks category ratings against active categories for the review type.
  // Validates each rating using the shared five-star range rule.
  async validateCategoryRatings(reviewType, categoryRatings, propertyId = null) {
    if (categoryRatings === undefined) return;

    if (categoryRatings === null || Array.isArray(categoryRatings) || typeof categoryRatings !== "object") {
      throw new BadRequestException("categoryRatings must be an object.");
    }

    const supportedCategories = await this.reviewRepository.getActiveRatingCategoryKeys(reviewType, propertyId);

    Object.entries(categoryRatings).forEach(([category, rating]) => {
      if (!supportedCategories.has(category)) {
        throw new BadRequestException(`Unsupported rating category: ${category}.`);
      }

      this.validateRating(rating, `categoryRatings.${category}`);
    });
  }

  async assertReviewCategoryConfigurationAccess(user, propertyId) {
    const property = await this.reviewRepository.getPropertyById(propertyId);

    if (!property) {
      throw new NotFoundException("Property not found.");
    }

    await this.assertHostReviewAccess(
      user,
      property.hostid,
      "You are not allowed to configure review categories for this property."
    );

    return property;
  }

  async validateReviewCategoryConfiguration({ propertyId, reviewType, categories }) {
    if (!Array.isArray(categories) || categories.length === 0) {
      throw new BadRequestException("categories must be a non-empty array.");
    }

    const catalog = await this.reviewRepository.getRatingCategories(reviewType, { includeInactive: true });
    const catalogKeys = new Set(catalog.map((category) => category.key));
    const submittedKeys = new Set();

    const normalizedCategories = categories.map((category) => {
      const key = String(category?.key || "").trim();
      const sortOrder = Number(category?.sortOrder);

      if (!catalogKeys.has(key)) {
        throw new BadRequestException(`Unsupported rating category: ${key || "unknown"}.`);
      }

      if (submittedKeys.has(key)) {
        throw new BadRequestException(`Duplicate rating category: ${key}.`);
      }

      if (typeof category.isActive !== "boolean") {
        throw new BadRequestException(`categories.${key}.isActive must be a boolean.`);
      }

      if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) {
        throw new BadRequestException(`categories.${key}.sortOrder must be an integer between 0 and 10000.`);
      }

      submittedKeys.add(key);
      return { key, isActive: category.isActive, sortOrder };
    });

    if (submittedKeys.size !== catalogKeys.size) {
      throw new BadRequestException("Configuration must include every available category exactly once.");
    }

    if (!normalizedCategories.some((category) => category.isActive)) {
      throw new BadRequestException("At least one review category must remain active.");
    }

    return normalizedCategories;
  }

  // Converts a rating to a number and checks the supported scale.
  // Reports the specific field when its value is invalid.
  validateRating(value, fieldName) {
    const rating = Number(value);

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException(`${fieldName} must be between 1 and 5.`);
    }
  }

  // Ensures a host response contains a non-empty message.
  // Rejects blank text before any response is persisted.
  validateResponseMessage(message) {
    if (!message?.trim()) {
      throw new BadRequestException("message is required.");
    }
  }

  // Enforces the length limit for optional Domits-only feedback.
  // Allows the field to be omitted or left blank.
  validateDomitsPrivateFeedback(message) {
    if (message === undefined || message === null || !String(message).trim()) {
      return;
    }

    if (String(message).trim().length > DOMITS_PRIVATE_FEEDBACK_MAX_LENGTH) {
      throw new BadRequestException("Domits private feedback must be 2000 characters or less.");
    }
  }

  // Enforces the server-side length limit for private host feedback.
  // Allows the field to be omitted or left blank.
  validatePrivateFeedback(message) {
    if (message === undefined || message === null || !String(message).trim()) {
      return;
    }

    if (String(message).trim().length > PRIVATE_FEEDBACK_MAX_LENGTH) {
      throw new BadRequestException("Private feedback must be 2000 characters or less.");
    }
  }

  // Restricts internal feedback endpoints to approved Domits roles.
  // Normalizes role names before checking authorization.
  assertDomitsInternalAccess(user) {
    if (!DOMITS_INTERNAL_ROLES.has(this.normalizeRole(user.role))) {
      throw new ForbiddenException("Only authorized Domits internal users can view this feedback.");
    }
  }

  // Loads a review and checks whether it can receive a host response.
  // Requires a published public review with visible text.
  async getResponseEligibleReview(reviewId) {
    const review = await this.reviewRepository.getReviewById(reviewId);

    if (!review) {
      throw new NotFoundException("Review not found.");
    }

    const reviewTypePolicy = getReviewTypePolicy(review.reviewType);
    const isEligible =
      reviewTypePolicy?.allowsHostResponse === true &&
      review.status === REVIEW_STATUSES.PUBLISHED &&
      review.publicationStatus === "PUBLISHED" &&
      Boolean(review.publicReview?.trim());

    if (!isEligible) {
      throw new ForbiddenException("Only approved public reviews can receive host responses.");
    }

    return review;
  }

  // Checks whether the caller is the host or an authorized team member.
  // Rejects guests and callers without active host-team access.
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

  // Normalizes a response author's role, defaulting missing roles to host.
  // Provides a consistent role value for response authorization checks.
  normalizeResponseAuthorRole(role) {
    return this.normalizeRole(role || "host");
  }

  // Trims and lowercases role values for consistent comparisons.
  // Returns an empty string when no role is provided.
  normalizeRole(role) {
    return String(role || "").trim().toLowerCase();
  }

  // Checks whether a normalized role may respond for a host.
  // Uses the shared set of permitted host response roles.
  isHostResponseRole(role) {
    return HOST_RESPONSE_ROLES.has(this.normalizeResponseAuthorRole(role));
  }

  // Identifies guest-only roles that cannot respond on behalf of a host.
  // Normalizes the role before checking the restricted role list.
  isGuestOnlyRole(role) {
    return ["guest", "traveler", "customer"].includes(this.normalizeResponseAuthorRole(role));
  }

  // Writes an audit event when the repository supports response auditing.
  // Includes the review, response, actor, and occurrence time.
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

  // Resolves the valid initial status for a new review.
  // Delegates status policy to the shared status service.
  resolveInitialStatus(status) {
    return this.statusService.resolveInitialStatus(status);
  }

  // Resolves a requested status transition for an author or moderator.
  // Delegates transition rules to the shared status service.
  resolveUpdateStatus({ currentStatus, requestedStatus, actorUserId, authorUserId, actorRole }) {
    return this.statusService.resolveUpdateStatus({
      currentStatus,
      requestedStatus,
      actorUserId,
      authorUserId,
      actorRole,
    });
  }

  // Creates the persisted review record from validated input and booking data.
  // Derives reviewer, reviewee, and publication fields from policy and status.
  buildReviewRecord({ booking, body, reviewerUserId, status, now }) {
    const derivedStatuses = this.statusService.getDerivedStatuses(status);
    const reviewTypePolicy = getReviewTypePolicy(body.reviewType);

    return {
      id: randomUUID(),
      bookingId: booking.id,
      propertyId: booking.property_id,
      hostId: booking.hostid,
      reviewerUserId,
      revieweeUserId: booking[reviewTypePolicy.revieweeBookingField],
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

  // Builds an update containing only the supplied content fields.
  // Refreshes derived statuses and the update timestamp.
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

  // Converts category ratings into records associated with a review id.
  // Adds generated ids and a shared creation timestamp to each record.
  buildReviewRatingRecords({ reviewId, categoryRatings = {}, createdAt }) {
    return Object.entries(categoryRatings).map(([category, rating]) => ({
      id: randomUUID(),
      reviewId,
      category,
      rating: Number(rating),
      createdAt,
    }));
  }

  // Builds the related workflow records for a review's current status.
  // Includes only the request, verification, moderation, and private feedback records that apply.
  buildWorkflowRecords({ review, booking, status, now, domitsPrivateFeedback = null }) {
    const isDraft = status === REVIEW_STATUSES.DRAFT;
    const reviewTypePolicy = getReviewTypePolicy(review.reviewType);
    const normalizedDomitsPrivateFeedback = String(domitsPrivateFeedback ?? "").trim();
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
      reviewRequest: reviewTypePolicy.createsGuestRequest ? {
        id: randomUUID(),
        bookingId: review.bookingId,
        propertyId: review.propertyId,
        hostId: review.hostId,
        guestId: booking.guestid,
        reviewType: review.reviewType,
        status: isDraft ? "OPEN" : "COMPLETED",
        requestedAt: now,
        expiresAt: Number(booking.departuredate || now) + REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000,
        completedAt: isDraft ? null : now,
        nextSendAt: isDraft ? Math.max(now, Number(booking.departuredate || now) + REVIEW_REQUEST_DELAY_HOURS * 60 * 60 * 1000) : null,
        createdAt: now,
        updatedAt: now,
      } : null,
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
            guestId: booking.guestid,
            propertyId: review.propertyId,
            feedbackType: DOMITS_PRIVATE_FEEDBACK_TYPE,
            message: normalizedDomitsPrivateFeedback,
            createdAt: now,
            updatedAt: now,
          }
        : null,
    };
  }

  // Parses string request bodies and defaults empty bodies to an object.
  // Converts malformed JSON into a consistent client error.
  parseBody(rawBody) {
    try {
      return typeof rawBody === "string" ? JSON.parse(rawBody || "{}") : rawBody || {};
    } catch {
      throw new BadRequestException("Request body must be valid JSON.");
    }
  }
}

export default ReviewService;
