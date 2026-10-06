import { randomUUID } from "node:crypto";
import { ReviewRepository } from "../../data/reviewRepository.js";
import { BadRequestException } from "../../util/exception/badRequestException.js";
import { ConflictException } from "../../util/exception/conflictException.js";
import { ForbiddenException } from "../../util/exception/forbiddenException.js";
import { NotFoundException } from "../../util/exception/notFoundException.js";

const REVIEWABLE_STATUSES = new Set(["paid", "confirmed"]);


const GUEST_REVIEW_TYPE = "GUEST_TO_PROPERTY";
const isDuplicateBookingReviewError = (error) => {
  const databaseError = error?.driverError || error;
  return databaseError?.code === "23505" &&
    /\breview_booking_type_reviewer_unique(?:_test)?\b/.test(
      `${databaseError.constraint || ""} ${databaseError.message || ""}`
    );
};

export class ReviewService {
  constructor({ repository = new ReviewRepository(), now = () => Date.now() } = {}) {
    this.repository = repository;
    this.now = now;
  }

  // Derive review ownership and property details from the booking to prevent client spoofing.
  // Restrict reviews to completed, caller-owned reservations to protect review integrity.
  async createReview(callerUserId, reviewData) {
    this.validateReviewPayload(reviewData);

    const bookingId = reviewData.booking_id.trim();
    const booking = await this.repository.findBookingById(bookingId);

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
      return await this.repository.create({
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
      }, categoryRatings);
    } catch (error) {
      if (isDuplicateBookingReviewError(error)) {
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
    if (typeof reviewData.public_review !== "string" || !reviewData.public_review.trim()) {
      throw new BadRequestException("public_review is required and must be a string");
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
  }

  normalizeOptionalText(value) {
    if (!value) return null;

    const text = value.trim();
    return text || null;
  }

}
