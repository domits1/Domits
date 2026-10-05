import { ReviewRepository } from "../../data/reviewRepository.js";
import { BadRequestException } from "../../util/exception/badRequestException.js";
import { ConflictException } from "../../util/exception/conflictException.js";
import { ForbiddenException } from "../../util/exception/forbiddenException.js";
import { NotFoundException } from "../../util/exception/notFoundException.js";

const REVIEWABLE_STATUSES = new Set(["paid", "confirmed"]);
const REVIEW_MIN_LENGTH = 1;
const REVIEW_MAX_LENGTH = 500;
// eslint-disable-next-line no-control-regex -- Deliberately reject controls while allowing tabs and line breaks.
const INVALID_TEXT_CONTROLS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const isDuplicateReservationReviewError = (error) =>
  error?.code === "23505" &&
  String(error?.constraint || error?.message || "").includes("review_reservation_unique_idx");

export class ReviewService {
  // Missing or invalid policy configuration disables editing.
  constructor({ repository = new ReviewRepository(), now = () => Date.now(),
    editWindowMs = Number(process.env.REVIEW_EDIT_WINDOW_MS) } = {}) {
    this.repository = repository;
    this.now = now;
    this.editWindowMs = Number.isSafeInteger(editWindowMs) && editWindowMs > 0 ? editWindowMs : 0;
  }

  editDeadline(review) {
    const createdAt = Number(review.created_at);
    const deadline = createdAt + this.editWindowMs;
    return this.editWindowMs && Number.isSafeInteger(createdAt) && createdAt > 0
      && Number.isSafeInteger(deadline) ? deadline : 0;
  }

  async getEditableReview(callerUserId, reviewId) {
    if (typeof reviewId !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(reviewId)) {
      throw new BadRequestException("A valid review ID is required.");
    }
    const review = await this.repository.findReviewById(reviewId);
    if (!review) throw new NotFoundException("Review not found.");
    if (String(review.guest_id) !== String(callerUserId)) {
      throw new ForbiddenException("You can only edit your own reviews.");
    }
    const timestamp = this.now();
    if (timestamp < Number(review.created_at) || timestamp >= this.editDeadline(review)) {
      throw new ForbiddenException("The review editing period has ended or editing is unavailable.");
    }
    return { id: review.id, overall_rating: review.overall_rating,
      public_review: review.public_review, updated_at: Number(review.updated_at) };
  }

  async updateReview(callerUserId, reviewId, data) {
    const review = await this.getEditableReview(callerUserId, reviewId);
    const allowed = ["overall_rating", "public_review", "updated_at"];
    if (!data || typeof data !== "object" || Array.isArray(data)
      || Object.keys(data).some((key) => !allowed.includes(key))) {
      throw new BadRequestException("Only the rating, written review, and update version may be submitted.");
    }
    const publicReview = this.validateReviewPayload({
      reservation_id: reviewId, overall_rating: data.overall_rating, public_review: data.public_review,
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

  // Derive review ownership and property details from the booking to prevent client spoofing.
  // Restrict reviews to completed, caller-owned reservations to protect review integrity.
  async createReview(callerUserId, reviewData) {
    const publicReview = this.validateReviewPayload(reviewData);

    const reservationId = reviewData.reservation_id.trim();
    const booking = await this.repository.findBookingById(reservationId);

    if (!booking) {
      throw new NotFoundException("Reservation not found.");
    }

    if (String(booking.guestid) !== String(callerUserId)) {
      throw new ForbiddenException("You can only review your own reservation.");
    }

    const status = String(booking.status || "").trim().toLowerCase();
    const checkoutAt = Number(booking.departuredate);
    const now = this.now();

    if (!REVIEWABLE_STATUSES.has(status)) {
      throw new BadRequestException("Only paid or confirmed reservations can be reviewed.");
    }

    if (!Number.isFinite(checkoutAt) || checkoutAt <= 0 || checkoutAt > now) {
      throw new BadRequestException("You can only review a reservation after checkout.");
    }

    try {
      return await this.repository.create({
        reservation_id: reservationId,
        property_id: booking.property_id,
        host_id: booking.hostid,
        guest_id: booking.guestid,
        overall_rating: reviewData.overall_rating,
        public_review: publicReview,
        private_feedback: this.normalizeOptionalText(reviewData.private_feedback),
        verification_status: "verified",
        publication_status: "draft",
        created_at: now,
        updated_at: now,
      });
    } catch (error) {
      if (isDuplicateReservationReviewError(error)) {
        throw new ConflictException("This reservation already has a review.");
      }

      throw error;
    }
  }

  // Reject malformed input before reservation checks or persistence are attempted.
  // Validate types and rating bounds so invalid review data cannot enter the system.
  validateReviewPayload(reviewData) {
    if (!reviewData || typeof reviewData !== "object" || Array.isArray(reviewData)) {
      throw new BadRequestException("Request body must be a review object");
    }

    if (typeof reviewData.reservation_id !== "string") {
      throw new BadRequestException("reservation_id must be a string");
    }

    if (!reviewData.reservation_id.trim()) {
      throw new BadRequestException("reservation_id is required");
    }

    if (!Number.isInteger(reviewData.overall_rating) || reviewData.overall_rating < 1 || reviewData.overall_rating > 5) {
      throw new BadRequestException("Please select an overall experience rating from 1 to 5 stars.");
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

  normalizeOptionalText(value) {
    if (!value) return null;

    const text = value.trim();
    return text || null;
  }

  async getReviews(callerUserId, scope = "written") {
    if (scope !== "written" && scope !== "received") {
      throw new BadRequestException("Review scope must be written or received.");
    }
    const reviews = await this.repository.findReviews(scope === "written"
      ? { guest_id: callerUserId }
      : { host_id: callerUserId, publication_status: "published" });
    const timestamp = this.now();
    return reviews.map((review) => ({
      ...review, rating: review.overall_rating, content: review.public_review, date: review.created_at,
      can_edit: scope === "written" && timestamp >= Number(review.created_at)
        && timestamp < this.editDeadline(review),
      edit_expires_at: scope === "written" ? this.editDeadline(review) : 0,
    }));
  }

  async deleteReview(callerUserId, id) {
    if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new BadRequestException("A valid review ID is required.");
    }
    const result = await this.repository.deleteOwnReview(id, callerUserId);
    if (!result.affected) {
      throw new NotFoundException("Review not found.");
    }
  }
}
