import { randomUUID } from "node:crypto";
import { ReviewRepository } from "../../data/reviewRepository.js";
import { BadRequestException } from "../../util/exception/badRequestException.js";
import { ConflictException } from "../../util/exception/conflictException.js";
import { ForbiddenException } from "../../util/exception/forbiddenException.js";
import { NotFoundException } from "../../util/exception/notFoundException.js";
import { UnauthorizedException } from "../../util/exception/unauthorizedException.js";
import { assertEligibleBooking, assertHostResponseAccess, isPublished } from "../reviewRules.js";

import { UnauthorizedException } from "../../util/exception/unauthorizedException.js";

const REVIEWABLE_STATUSES = new Set(["paid", "confirmed"]);

const GUEST_REVIEW_TYPE = "GUEST_TO_PROPERTY";
const EDITABLE_FIELDS = new Set(["overall_rating", "title", "public_review", "private_feedback", "category_ratings"]);
const toReviewView = (review) => ({
  id: review.id, booking_id: review.booking_id, property_id: review.property_id,
  reviewer_user_id: review.reviewer_user_id, reviewee_user_id: review.reviewee_user_id,
  review_type: review.review_type, overall_rating: Number(review.overall_rating),
  title: review.title, public_review: review.public_review,
  verification_status: review.verification_status, publication_status: review.publication_status,
  status: review.status, created_at: review.created_at, updated_at: review.updated_at,
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
  constructor({ repository = new ReviewRepository(), now = () => Date.now(),
    canReadPrivateFeedback = async () => false, canPublishReview = async () => false } = {}) {
    this.repository = repository;
    this.now = now;
    this.canReadPrivateFeedback = canReadPrivateFeedback;
    this.canPublishReview = canPublishReview;
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
    this.validateReviewPayload({ ...review, overall_rating: Number(review.overall_rating), ...changes });
    if (changes.category_ratings !== undefined && Object.keys(changes.category_ratings).length) {
      const supported = await this.repository.findActiveCategoryKeys(review.review_type);
      if (Object.keys(changes.category_ratings).some((key) => !supported.has(key))) {
        throw new BadRequestException("Unsupported rating category.");
      }
    }
    const fields = { updated_at: this.now() };
    for (const key of keys) {
      if (key === "category_ratings") continue;
      fields[key] = key === "private_feedback" ? this.normalizeOptionalText(changes[key])
        : typeof changes[key] === "string" ? changes[key].trim() : changes[key];
    }
    const updated = await this.repository.updateDraft({ reviewId: review.id, reviewerUserId: userId,
      expectedUpdatedAt: review.updated_at, fields, categoryRatings: changes.category_ratings });
    if (!updated) throw new ConflictException("Review changed. Reload it before editing.");
    return toReviewView(updated);
  }

  // Expose private feedback only to authorized users.
  // This keeps guest notes visible to the right audience without leaking them to the public review feed.
  async getPrivateFeedback(userId, reviewId) {
    this.assertCaller(userId);
    const review = await this.requireReview(reviewId);
    if (!(await this.canReadPrivateFeedback({ userId, review }))) {
      throw new ForbiddenException("You cannot access this private feedback.");
    }
    return { review_id: review.id, private_feedback: review.private_feedback };
  }

  // Create a host response for a review.
  // This supports the public reply flow while enforcing the host-only access rules for the review.
  async createReviewResponse(userId, reviewId, data) {
    this.assertCaller(userId);
    const message = this.validateResponse(data);
    const review = await this.requireReview(reviewId);
    assertHostResponseAccess(review, userId);
    const timestamp = this.now();
    const response = await this.repository.createResponse({ id: randomUUID(), reviewId: review.id,
      authorId: userId, authorRole: "host", status: "published", message, createdAt: timestamp,
      updatedAt: timestamp, publishedAt: timestamp, deletedAt: null });
    return toResponseView(response);
  }

  // Update an existing host reply.
  // This keeps the response editable after publication without allowing unrelated users to change it.
  async updateReviewResponse(userId, reviewId, data) {
    this.assertCaller(userId);
    const message = this.validateResponse(data);
    const review = await this.requireReview(reviewId);
    assertHostResponseAccess(review, userId);
    const response = await this.repository.updateResponse({ reviewId: review.id, authorId: userId,
      message, updatedAt: this.now() });
    if (!response) throw new NotFoundException("Review response not found.");
    return toResponseView(response);
  }

  // Delete a host response in a controlled way.
  // This removes the reply while preserving the review history and validating that the host is still authorized.
  async deleteReviewResponse(userId, reviewId) {
    this.assertCaller(userId);
    const review = await this.requireReview(reviewId);
    assertHostResponseAccess(review, userId);
    if (!(await this.repository.softDeleteResponse({ reviewId: review.id, authorId: userId, deletedAt: this.now() }))) {
      throw new NotFoundException("Review response not found.");
    }
  }

  // Publish a draft review when the reservation is still valid.
  // This finalizes the guest review only after the booking checks and authorization rules confirm it is eligible.
  async publishReview(userId, reviewId) {
    this.assertCaller(userId);
    const review = await this.requireReview(reviewId);
    if (!(await this.canPublishReview({ userId, review }))) throw new ForbiddenException("You cannot publish this review.");
    if (isPublished(review)) return toReviewView(review);
    if (review.status !== "DRAFT" || review.publication_status !== "UNPUBLISHED") {
      throw new ConflictException("Review cannot be published in its current state.");
    }
    this.validateReviewPayload({ ...review, overall_rating: Number(review.overall_rating) });
    const booking = await this.repository.findBookingById(review.booking_id);
    this.assertPublicationBooking(booking, review, this.now());
    const published = await this.repository.publishDraft({ reviewId: review.id,
      expectedUpdatedAt: review.updated_at, updatedAt: this.now(),
      authorize: (current) => this.canPublishReview({ userId, review: current }) });
    if (!published) throw new ConflictException("Review changed. Reload it before publishing.");
    return toReviewView(published);
  }

  assertPublicationBooking(booking, review, now) {
    assertEligibleBooking(booking, review.reviewer_user_id, now);
    if (String(booking.property_id) !== String(review.property_id) || String(booking.hostid) !== String(review.host_id)) {
      throw new ConflictException("The reservation is no longer eligible for publication.");
    }
  }

  async requireReview(reviewId) {
    this.assertId(reviewId, "review ID");
    const review = await this.repository.findById(reviewId.trim());
    if (!review || ["DELETED", "REJECTED"].includes(review.status)) throw new NotFoundException("Review not found.");
    return review;
  }

  assertCaller(userId) {
    if (typeof userId !== "string" || !userId.trim()) throw new UnauthorizedException("An authenticated caller is required.");
  }

  assertId(value, name) {
    if (typeof value !== "string" || !value.trim() || value.trim().length > 255) {
      throw new BadRequestException(`A valid ${name} is required.`);
    }
  }

  assertObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestException("Request body must be a JSON object.");
  }

  validateResponse(data) {
    this.assertObject(data);
    if (Object.keys(data).some((key) => key !== "message") || typeof data.message !== "string" || !data.message.trim()) {
      throw new BadRequestException("Provide a non-empty message field.");
    }
    return data.message.trim();
  }

  // Create a new guest review for a completed reservation.
  // This enforces booking eligibility and prevents duplicate or invalid review submissions.
  async createReview(callerUserId, reviewData) {
    if (typeof callerUserId !== "string" || !callerUserId.trim()) {
      throw new UnauthorizedException("An authenticated caller is required.");
    }
    this.validateReviewPayload(reviewData);

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
    const categoryRatings = reviewData.category_ratings ?? {};
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
          public_review: reviewData.public_review.trim(),
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
        throw new ConflictException("This reservation already has a review.");
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

    if (
      !Number.isInteger(reviewData.overall_rating) ||
      reviewData.overall_rating < 1 ||
      reviewData.overall_rating > 5
    ) {
      throw new BadRequestException("Please select an overall experience rating from 1 to 5 stars.");
    }

    if (typeof reviewData.title !== "string" || !reviewData.title.trim() || reviewData.title.trim().length > 120) {
      throw new BadRequestException("A review title of up to 120 characters is required");
    }
    const ratings = reviewData.category_ratings;
    if (
      ratings !== undefined &&
      (!ratings ||
        typeof ratings !== "object" ||
        Array.isArray(ratings) ||
        Object.values(ratings).some((value) => !Number.isFinite(value) || value < 1 || value > 5))
    ) {
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
