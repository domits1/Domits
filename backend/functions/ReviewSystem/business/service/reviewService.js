import { ReviewRepository } from "../../data/reviewRepository.js";
import { BadRequestException } from "../../util/exception/badRequestException.js";
import { ConflictException } from "../../util/exception/conflictException.js";
import { ForbiddenException } from "../../util/exception/forbiddenException.js";
import { NotFoundException } from "../../util/exception/notFoundException.js";

const REQUIRED_FIELDS = ["reservation_id", "overall_rating"];
const REVIEWABLE_STATUSES = new Set(["paid", "confirmed"]);

const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

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

    // An expired inquiry or unpaid booking is not evidence of a completed stay.
    if (!REVIEWABLE_STATUSES.has(status)) {
      throw new BadRequestException("Only confirmed reservations can be reviewed.");
    }

    if (!Number.isFinite(checkoutAt) || checkoutAt <= 0 || checkoutAt > this.now()) {
      throw new BadRequestException("You can only review a reservation after checkout.");
    }

    const now = this.now();

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
    for (const field of REQUIRED_FIELDS) {
      if (isBlank(reviewData[field])) {
        throw new BadRequestException(`${field} is required`);
      }
    }

    if (typeof reviewData.reservation_id !== "string") {
      throw new BadRequestException("reservation_id must be a string");
    }

    if (typeof reviewData.overall_rating !== "number") {
      throw new BadRequestException("overall_rating must be a number between 1 and 5");
    }

    if (!Number.isFinite(reviewData.overall_rating) || reviewData.overall_rating < 1 || reviewData.overall_rating > 5) {
      throw new BadRequestException("overall_rating must be a number between 1 and 5");
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
}
