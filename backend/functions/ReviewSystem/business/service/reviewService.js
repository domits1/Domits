import { ReviewRepository } from "../../data/reviewRepository.js";
import { BadRequestException } from "../../util/exception/badRequestException.js";
import { ConflictException } from "../../util/exception/conflictException.js";
import { ForbiddenException } from "../../util/exception/forbiddenException.js";
import { NotFoundException } from "../../util/exception/notFoundException.js";

const REVIEWABLE_STATUSES = new Set(["paid", "confirmed"]);


const isDuplicateReservationReviewError = (error) =>
  error?.code === "23505" &&
  String(error?.constraint || error?.message || "").includes("review_reservation_unique_idx");

export class ReviewService {
  constructor({ repository = new ReviewRepository(), now = () => Date.now() } = {}) {
    this.repository = repository;
    this.now = now;
  }

  // Derive review ownership and property details from the booking to prevent client spoofing.
  // Restrict reviews to completed, caller-owned reservations to protect review integrity.
  async createReview(callerUserId, reviewData) {
    this.validateReviewPayload(reviewData);

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
        public_review: this.normalizeOptionalText(reviewData.public_review),
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
      reviewData.public_review !== undefined &&
      reviewData.public_review !== null &&
      typeof reviewData.public_review !== "string"
    ) {
      throw new BadRequestException("public_review must be a string");
    }

    if (
      reviewData.private_feedback !== undefined &&
      reviewData.private_feedback !== null &&
      typeof reviewData.private_feedback !== "string"
    ) {
      throw new BadRequestException("private_feedback must be a string");
    }
  }

  normalizeOptionalText(value) {
    if (!value) return null;

    const text = value.trim();
    return text || null;
  }

  async getReviews(callerUserId, scope) {
    if (scope !== "written" && scope !== "received") {
      throw new BadRequestException("Review scope must be written or received.");
    }
    const reviews = await this.repository.findReviews(scope === "written"
      ? { guest_id: callerUserId }
      : { host_id: callerUserId, publication_status: "published" });
    return reviews.map((review) => ({
      ...review, rating: review.overall_rating, content: review.public_review, date: review.created_at,
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
