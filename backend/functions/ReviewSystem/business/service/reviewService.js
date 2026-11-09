import { randomUUID } from "node:crypto";
import { ReviewRepository } from "../../data/reviewRepository.js";
import { BadRequestException } from "../../util/exception/badRequestException.js";
import { ConflictException } from "../../util/exception/conflictException.js";
import { ForbiddenException } from "../../util/exception/forbiddenException.js";
import { NotFoundException } from "../../util/exception/notFoundException.js";
import { UnauthorizedException } from "../../util/exception/unauthorizedException.js";
import { assertCaller, assertEligibleBooking, assertId, INVALID_TEXT_CONTROLS, isPublished, requireReview } from "../model/reviewRules.js";
import { DomitsAdminReviewService } from "./domitsAdminReviewService.js";
import { HostReviewService } from "./hostReviewService.js";

const REVIEWABLE_STATUSES = new Set(["paid", "confirmed"]);

const REVIEW_MIN_LENGTH = 1;
const REVIEW_MAX_LENGTH = 500;
const GUEST_REVIEW_TYPE = "GUEST_TO_PROPERTY";
const REVIEW_APPROVER_ROLES = [
  "Guest Experience Manager",
  "Property Operations Manager",
  "Reservation Manager",
  "General Manager",
];
const EDITABLE_FIELDS = new Set(["overall_rating", "title", "public_review", "private_feedback", "category_ratings"]);
const toReviewView = (review) => ({
  id: review.id, booking_id: review.booking_id, property_id: review.property_id,
  reviewer_user_id: review.reviewer_user_id, reviewee_user_id: review.reviewee_user_id,
  review_type: review.review_type, overall_rating: Number(review.overall_rating),
  title: review.title, public_review: review.public_review,
  verification_status: review.verification_status, publication_status: review.publication_status,
  status: review.status, created_at: review.created_at, updated_at: review.updated_at,
});
const toPendingReviewView = (review) => ({
  ...toReviewView(review), property_title: review.property_title ?? null,
  property_city: review.property_city ?? null, property_country: review.property_country ?? null,
  property_image_key: review.property_image_key ?? null, guest_name: review.guest_name ?? null,
});
const toResponseView = (response) => ({
  id: response.id, reviewId: response.reviewId, authorRole: response.authorRole,
  status: response.status, message: response.message, createdAt: response.createdAt,
  updatedAt: response.updatedAt, publishedAt: response.publishedAt,
});
const isDuplicateBookingReviewError = (error) => {
  const databaseError = error?.driverError || error;
  return (
    databaseError?.code === "23505" &&
    /\breview_booking_type_reviewer_unique(?:_test)?\b/.test(
      `${databaseError.constraint || ""} ${databaseError.message || ""}`
    )
  );
};

export class ReviewService {
  #hostReviewService;
  #domitsAdminReviewService;

  async getPublicReviews(propertyId, offset = "0") {
    if (typeof propertyId !== "string" || !propertyId.trim()) {
      throw new BadRequestException("A property ID is required.");
    }
    if (typeof offset !== "string" || !/^(0|[1-9]\d*)$/.test(offset)
      || !Number.isSafeInteger(Number(offset)) || Number(offset) > 100000) {
      throw new BadRequestException("Invalid review page offset.");
    }
    const result = await this.repository.getPublicReviewPage(propertyId.trim(), Number(offset));
    if (!result) throw new NotFoundException("Property not found.");
    return result;
  }

  constructor({ repository = new ReviewRepository(), now = () => Date.now(),
    canReadPrivateFeedback = async ({ userId, review }) =>
      review.reviewer_user_id === userId || review.host_id === userId,
    canPublishReview = async ({ userId, review }) => review.reviewer_user_id === userId,
    editWindowMs = Number(process.env.REVIEW_EDIT_WINDOW_MS) } = {}) {
    this.repository = repository;
    this.now = now;
    this.canReadPrivateFeedback = canReadPrivateFeedback;
    this.canPublishReview = canPublishReview;
    this.#hostReviewService = new HostReviewService({ repository, now: () => this.now() });
    this.#domitsAdminReviewService = new DomitsAdminReviewService({
      repository,
      canReadPrivateFeedback: (context) => this.canReadPrivateFeedback(context),
    });
    this.editWindowMs =
      Number.isSafeInteger(editWindowMs) && editWindowMs > 0
        ? editWindowMs
        : 0;
  }

  async saveHostResponse(user, reviewId, body, action) {
    return this.#hostReviewService.saveHostResponse(user, reviewId, body, action);
  }

  async getResponseEligibleReviews(username) {
    return this.#hostReviewService.getResponseEligibleReviews(username);
  }

  async authorizeManagedProperty(callerUserId, propertyId) {
    return this.#hostReviewService.authorizeManagedProperty(callerUserId, propertyId);
  }

  async getPropertyRatingTrends(username, query) {
    return this.#hostReviewService.getPropertyRatingTrends(username, query);
  }

  async getPropertyReviewPerformance(userId, propertyId, query) {
    return this.#hostReviewService.getPropertyReviewPerformance(userId, propertyId, query);
  }

  async getPropertyCategoryRatings(userId, propertyId) {
    return this.#hostReviewService.getPropertyCategoryRatings(userId, propertyId);
  }

  async getPropertyReviewScore(userId, propertyId) {
    return this.#hostReviewService.getPropertyReviewScore(userId, propertyId);
  }

  async deleteReviewResponse(user, reviewId) {
    return this.#hostReviewService.deleteReviewResponse(user, reviewId);
  }

  assertHostResponseIdentity(user) {
    return this.#hostReviewService.assertHostResponseIdentity(user);
  }

  async getPrivateFeedback(userId, reviewId) {
    return this.#domitsAdminReviewService.getPrivateFeedback(userId, reviewId);
  }

  editDeadline(review) {
    const createdAt = Number(review.created_at);
    const deadline = createdAt + this.editWindowMs;
    return this.editWindowMs && Number.isSafeInteger(createdAt) && createdAt > 0
      && Number.isSafeInteger(deadline) ? deadline : 0;
  }

  async getEditableReview(callerUserId, reviewId) {
    this.assertCaller(callerUserId);
    if (typeof reviewId !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(reviewId)) {
      throw new BadRequestException("A valid review ID is required.");
    }
    const review = await this.repository.findReviewById(reviewId);
    if (!review || ["DELETED", "REJECTED"].includes(review.status)) throw new NotFoundException("Review not found.");
    if (String(review.reviewer_user_id) !== String(callerUserId)) {
      throw new ForbiddenException("You can only edit your own reviews.");
    }
    if (review.status !== "DRAFT" || review.publication_status !== "UNPUBLISHED") {
      throw new ConflictException("Only unpublished drafts can be edited.");
    }
    const timestamp = this.now();
    if (timestamp < Number(review.created_at) || timestamp >= this.editDeadline(review)) {
      throw new ForbiddenException("The review editing period has ended or editing is unavailable.");
    }
    return { id: review.id, overall_rating: review.overall_rating,
      public_review: review.public_review, updated_at: Number(review.updated_at) };
  }

  async updateEditableReview(callerUserId, reviewId, data) {
    const review = await this.getEditableReview(callerUserId, reviewId);
    const allowed = new Set(["overall_rating", "public_review", "updated_at"]);
    if (!data || typeof data !== "object" || Array.isArray(data)
      || Object.keys(data).some((key) => !allowed.has(key))) {
      throw new BadRequestException("Only the rating, written review, and update version may be submitted.");
    }
    const publicReview = this.validateReviewPayload({
      booking_id: reviewId, title: "Existing review", overall_rating: data.overall_rating, public_review: data.public_review,
    });
    if (!Number.isSafeInteger(data.updated_at) || data.updated_at < 0 || data.updated_at >= Number.MAX_SAFE_INTEGER) {
      throw new BadRequestException("A valid review update version is required.");
    }
    if (data.updated_at !== review.updated_at) {
      throw new ConflictException("This review has changed. Reload it before editing.");
    }
    const result = await this.repository.updateEditableReview({
      id: reviewId, guestId: callerUserId, previousUpdatedAt: data.updated_at,
      editWindowMs: this.editWindowMs, now: this.now,
      overallRating: data.overall_rating, publicReview,
    });
    if (!result.affected) {
      throw new ConflictException("The review changed or its editing period ended. Reload the review.");
    }
    return { id: reviewId, overall_rating: data.overall_rating,
      public_review: publicReview, updated_at: result.updated_at };
  }

  // Fetch the caller's reviews by scope.
  // This keeps the profile and dashboard views consistent with the user's written and received history.
  async getReviews(callerUserId, scope = "written") {
    this.assertCaller(callerUserId);
    if (!["written", "received"].includes(scope)) {
      throw new BadRequestException("scope must be written or received.");
    }
    const reviews = await this.repository.findForUser(callerUserId, scope);
    return reviews.filter((review) => scope === "written"
      ? String(review.reviewer_user_id) === callerUserId && !["DELETED", "REJECTED"].includes(review.status)
      : String(review.reviewee_user_id) === callerUserId && isPublished(review)).map((review) => ({
        ...toReviewView(review), rating: Number(review.overall_rating), content: review.public_review, date: review.created_at,
        ...(scope === "received" ? { guest_name: review.guest_name ?? null } : {}),
        can_edit: scope === "written" && review.status === "DRAFT" && review.publication_status === "UNPUBLISHED" && this.now() >= Number(review.created_at) && this.now() < this.editDeadline(review),
        edit_expires_at: scope === "written" ? this.editDeadline(review) : 0,
      }));
  }

  // Remove a review only when it still belongs to the caller.
  // This prevents accidental deletion of someone else's record while preserving the soft-delete audit trail.
  async deleteReview(callerUserId, reviewId) {
    this.assertCaller(callerUserId);
    this.assertId(reviewId, "review ID");
    const review = await this.repository.findById(reviewId.trim());
    if (!review || ["DELETED", "REJECTED"].includes(review.status)) {
      throw new NotFoundException("Review not found.");
    }
    if (String(review.reviewer_user_id) !== String(callerUserId)) {
      throw new ForbiddenException("You can only delete your own review.");
    }
    const result = await this.repository.softDelete(review.id, callerUserId, this.now());
    if (result.affected !== 1) throw new NotFoundException("Review not found.");
  }

  // Return the published review feed for a property.
  // This powers the public listing page without exposing private feedback or unreleased drafts.
  async getPublicPropertyReviews(propertyId, query = {}) {
    this.assertId(propertyId, "property ID");
    for (const key of ["limit", "offset"]) {
      if (query[key] !== undefined && (typeof query[key] !== "string" || !/^\d+$/.test(query[key]))) {
        throw new BadRequestException("Pagination values must be integers.");
      }
    }
    const limit = Number(query.limit ?? 20);
    const offset = Number(query.offset ?? 0);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 ||
        !Number.isSafeInteger(offset) || offset < 0) {
      throw new BadRequestException("limit must be between 1 and 100; offset must be a non-negative integer.");
    }
    const reviews = await this.repository.findPublicForProperty(propertyId.trim(), { limit, offset });
    return reviews.map((review) => ({
      id: review.id, property_id: review.property_id, overall_rating: Number(review.overall_rating),
      title: review.title, public_review: review.public_review, created_at: review.created_at,
      categoryRatings: review.categoryRatings ?? {},
      response: review.response?.status === "published" && review.response.deletedAt == null
        ? toResponseView(review.response) : null,
    }));
  }

  // Fetch one review with the required visibility rules.
  // This lets the caller read their own review or a published review without revealing hidden content.
  async getReviewById(userId, reviewId) {
    this.assertCaller(userId);
    const review = await this.requireReview(reviewId);
    if (String(review.reviewer_user_id) !== userId && !isPublished(review)) {
      throw new NotFoundException("Review not found.");
    }
    return toReviewView(review);
  }

  // Update an unpublished draft review safely.
  // This lets the guest refine their draft while preventing edits after publication or conflicting changes.
  async updateReview(userId, reviewId, changes) {
    this.assertCaller(userId);
    this.assertObject(changes);
    const keys = Object.keys(changes);
    if (!keys.length || keys.some((key) => !EDITABLE_FIELDS.has(key))) {
      throw new BadRequestException("Provide only editable review fields.");
    }
    const review = await this.requireReview(reviewId);
    if (String(review.reviewer_user_id) !== userId) throw new ForbiddenException("You can only update your own review.");
    if (review.status !== "DRAFT" || review.publication_status !== "UNPUBLISHED") {
      throw new ConflictException("Only unpublished draft reviews can be edited.");
    }
    const publicReview = this.validateReviewPayload({ ...review, overall_rating: Number(review.overall_rating), ...changes });
    if (changes.category_ratings !== undefined && Object.keys(changes.category_ratings).length) {
      const supported = await this.repository.findActiveCategoryKeys(review.review_type);
      if (Object.keys(changes.category_ratings).some((key) => !supported.has(key))) {
        throw new BadRequestException("Unsupported rating category.");
      }
    }
    const fields = { updated_at: this.now() };
    for (const key of keys) {
      if (key === "category_ratings") continue;
      const value = changes[key];
      if (key === "public_review") {
        fields[key] = this.normalizePublicReview(value);
      } else if (key === "private_feedback") {
        fields[key] = this.normalizeOptionalText(value);
      } else {
        fields[key] = typeof value === "string" ? value.trim() : value;
      }
    }
    if (Object.hasOwn(changes, "public_review")) fields.public_review = publicReview;
    const updated = await this.repository.updateDraft({ reviewId: review.id, reviewerUserId: userId,
      expectedUpdatedAt: review.updated_at, fields, categoryRatings: changes.category_ratings });
    if (!updated) throw new ConflictException("Review changed. Reload it before editing.");
    return toReviewView(updated);
  }

  // Publish a draft review when the reservation is still valid.
  // This finalizes the guest review only after the booking checks and authorization rules confirm it is eligible.
  assertAdministrator(userId, username) {
    this.assertCaller(userId);
    const admins = String(process.env.PROPERTY_REVIEW_ADMIN_USER_IDS || "").split(/[,\s;]+/).filter(Boolean);
    if (typeof username !== "string" || !admins.includes(username.trim())) {
      throw new ForbiddenException("Administrator access is required.");
    }
  }

  // Any host can create team_member rows, so a role alone does not prove Domits staff.
  // The allowlist establishes that; the role narrows which staff may approve.
  async assertReviewApprover(userId, username, manager) {
    this.assertAdministrator(userId, username);

    if (!(await this.repository.hasActiveReviewApproverRole(username, REVIEW_APPROVER_ROLES, manager))) {
      throw new ForbiddenException("An active review approver role is required.");
    }
  }

  async getPendingReviews(userId, username) {
    await this.assertReviewApprover(userId, username);
    return (await this.repository.findPendingReviews()).map(toPendingReviewView);
  }

  async approveReview(userId, username, reviewId, version) {
    await this.assertReviewApprover(userId, username);
    if (!Number.isSafeInteger(version) || version < 0 || version >= Number.MAX_SAFE_INTEGER) {
      throw new BadRequestException("A valid review update version is required.");
    }
    const review = await this.requireReview(reviewId);
    return this.changePublicationState(review, "PENDING_APPROVAL", "PUBLISHED", async (_current, manager) => {
      await this.assertReviewApprover(userId, username, manager);
      return true;
    }, version);
  }

  async changePublicationState(review, from, to, authorize, version = review.updated_at) {
    if (review.status !== from || review.publication_status !== "UNPUBLISHED") {
      throw new ConflictException("Review cannot transition in its current state.");
    }
    const validate = (current) => {
      if (current.review_type !== GUEST_REVIEW_TYPE
        || !["UNVERIFIED", "VERIFIED", "VERIFIED_STAY"].includes(current.verification_status)) {
        throw new ConflictException("Review is not eligible for moderation.");
      }
      this.validateReviewPayload({ ...current, overall_rating: Number(current.overall_rating) });
    };
    validate(review);
    this.assertPublicationBooking(await this.repository.findBookingById(review.booking_id), review, this.now());
    const result = await this.repository.publishDraft({ reviewId: review.id,
      expectedUpdatedAt: version, updatedAt: this.now(), from, to, validate, authorize });
    if (!result) throw new ConflictException("Review changed. Reload before continuing.");
    return toReviewView(result);
  }

  async publishReview(userId, reviewId, username) {
    this.assertCaller(userId);
    const review = await this.requireReview(reviewId);
    const authorize = async (current, manager) => {
      if (current.status === "APPROVED") {
        await this.assertReviewApprover(userId, username, manager);
        return true;
      }
      return this.canPublishReview({ userId, review: current });
    };
    if (!(await authorize(review))) throw new ForbiddenException("You cannot publish this review.");
    if (isPublished(review)) return toReviewView(review);
    return this.changePublicationState(review, review.status === "DRAFT" ? "DRAFT" : "APPROVED",
      review.status === "DRAFT" ? "PENDING_APPROVAL" : "PUBLISHED", authorize);
  }

  assertPublicationBooking(booking, review, now) {
    assertEligibleBooking(booking, review.reviewer_user_id, now);
    if (String(booking.property_id) !== String(review.property_id) || String(booking.hostid) !== String(review.host_id)) {
      throw new ConflictException("The reservation is no longer eligible for publication.");
    }
  }

  async requireReview(reviewId) {
    return requireReview(this.repository, reviewId);
  }

  assertCaller(userId) {
    assertCaller(userId);
  }

  assertId(value, name) {
    assertId(value, name);
  }

  assertObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestException("Request body must be a JSON object.");
  }

  // Create a new guest review for a completed reservation.
  // This enforces booking eligibility and prevents duplicate or invalid review submissions.
  async createReview(callerUserId, reviewData) {
    if (typeof callerUserId !== "string" || !callerUserId.trim()) {
      throw new UnauthorizedException("An authenticated caller is required.");
    }
    const publicReview = this.validateReviewPayload(reviewData);

    const bookingId = reviewData.booking_id.trim();
    const booking = await this.repository.findBookingById(bookingId);

    if (!booking) {
      throw new NotFoundException("Reservation not found.");
    }

    if (String(booking.guestid) !== String(callerUserId)) {
      throw new ForbiddenException("You can only review your own reservation.");
    }

    if (String(booking.hostid) === String(callerUserId)) {
      throw new ForbiddenException("You cannot review your own property.");
    }

    const status = String(booking.status || "")
      .trim()
      .toLowerCase();
    const checkoutAt = Number(booking.departuredate);
    const now = this.now();

    if (!REVIEWABLE_STATUSES.has(status)) {
      throw new BadRequestException("Only paid or confirmed reservations can be reviewed.");
    }

    if (!Number.isFinite(checkoutAt) || checkoutAt <= 0 || checkoutAt > now) {
      throw new BadRequestException("You can only review a reservation after checkout.");
    }

    const duplicateKey = { booking_id: bookingId, review_type: GUEST_REVIEW_TYPE, reviewer_user_id: callerUserId };
    if (await this.repository.findReviewByBookingTypeAndReviewer(duplicateKey)) {
      throw new ConflictException("This reservation already has a review.");
    }
    const categoryRatings = reviewData.category_ratings || {};
    if (Object.keys(categoryRatings).length) {
      const supported = await this.repository.findActiveCategoryKeys(GUEST_REVIEW_TYPE);
      if (Object.keys(categoryRatings).some((key) => !supported.has(key))) {
        throw new BadRequestException("Unsupported rating category.");
      }
    }

    try {
      return await this.repository.create(
        {
          id: randomUUID(),
          ...duplicateKey,
          property_id: booking.property_id,
          host_id: booking.hostid,
          reviewee_user_id: booking.hostid,
          overall_rating: reviewData.overall_rating,
          title: reviewData.title.trim(),
          public_review: publicReview,
          private_feedback: this.normalizeOptionalText(reviewData.private_feedback),
          verification_status: "UNVERIFIED",
          publication_status: "UNPUBLISHED",
          status: "DRAFT",
          created_at: now,
          updated_at: now,
        },
        categoryRatings
      );
    } catch (error) {
      if (isDuplicateBookingReviewError(error)) {
        throw new ConflictException(
          "This reservation already has a review."
        );
      }

      throw error;
    }
  }

  validateReviewPayload(reviewData) {
    if (!reviewData || typeof reviewData !== "object" || Array.isArray(reviewData)) {
      throw new BadRequestException("Request body must be a review object");
    }

    if (typeof reviewData.booking_id !== "string") {
      throw new BadRequestException("booking_id must be a string");
    }
    if (!reviewData.booking_id.trim() || reviewData.booking_id.trim().length > 255) {
      throw new BadRequestException("A booking_id of up to 255 characters is required");
    }

    if (!Number.isInteger(reviewData.overall_rating) || reviewData.overall_rating < 1 || reviewData.overall_rating > 5) {
      throw new BadRequestException("Please select an overall experience rating from 1 to 5 stars.");
    }

    if (typeof reviewData.title !== "string" || !reviewData.title.trim() || reviewData.title.trim().length > 120) {
      throw new BadRequestException("A review title of up to 120 characters is required");
    }
    const ratings = reviewData.category_ratings;
    if (ratings !== undefined && (!ratings || typeof ratings !== "object" || Array.isArray(ratings) ||
      Object.values(ratings).some((value) => !Number.isFinite(value) || value < 1 || value > 5))) {
      throw new BadRequestException("category_ratings must contain ratings from 1 to 5");
    }

    if (
      reviewData.private_feedback !== undefined &&
      reviewData.private_feedback !== null &&
      typeof reviewData.private_feedback !== "string"
    ) {
      throw new BadRequestException("private_feedback must be a string");
    }
    return this.normalizePublicReview(reviewData.public_review);
  }

  // Normalize and sanitize the written review text before saving it.
  // This ensures reviews are plain text, within limits, and free of unsafe control characters.
  normalizePublicReview(value) {
    if (value === undefined || value === null) {
      throw new BadRequestException("Please describe your stay before submitting your review.");
    }
    if (typeof value !== "string") throw new BadRequestException("Written review must be plain text.");
    if (INVALID_TEXT_CONTROLS.test(value)) {
      throw new BadRequestException("Please remove unsupported control characters from your review.");
    }
    const text = value.replace(/\r\n?/g, "\n").trim();
    if (text.length < REVIEW_MIN_LENGTH) {
      throw new BadRequestException("Please describe your stay before submitting your review.");
    }
    if (text.length > REVIEW_MAX_LENGTH) {
      throw new BadRequestException(`Your written review must be ${REVIEW_MAX_LENGTH} characters or fewer.`);
    }
    // Store plain text; React text children escape HTML when displaying it.
    return text;
  }

  // Normalize optional private feedback without letting blanks become stored garbage.
  // This keeps optional feedback consistent while avoiding empty values in the database.
  normalizeOptionalText(value) {
    if (!value) return null;

    const text = value.trim();
    return text || null;
  }
}
