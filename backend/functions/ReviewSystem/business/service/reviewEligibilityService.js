import BadRequestException from "../../util/exception/badRequestException.js";
import ForbiddenException from "../../util/exception/forbiddenException.js";
import ConflictException from "../../util/exception/conflictException.js";
import NotFoundException from "../../util/exception/notFoundException.js";
import { REVIEW_WINDOW_DAYS } from "../../util/reviewPolicy.js";
import { getReviewTypePolicy } from "../model/reviewTypes.js";

const COMPLETED_BOOKING_STATUSES = new Set(["completed"]);

class ReviewEligibilityService {
  // Stores dependencies used for booking lookups and time-based checks.
  // An injectable clock keeps date rules deterministic in tests.
  constructor({ reviewRepository, clock = Date.now } = {}) {
    this.reviewRepository = reviewRepository;
    this.clock = clock;
  }

  // Validates request fields, loads the booking, and runs all eligibility checks.
  // Returns the booking only after reviewer, stay, window, and duplicate checks pass.
  async validateReservationEligibility({ bookingId, propertyId, reviewType, reviewerUserId }) {
    if (!bookingId) {
      throw new BadRequestException("bookingId is required.");
    }

    if (!propertyId) {
      throw new BadRequestException("propertyId is required.");
    }

    if (!reviewType) {
      throw new BadRequestException("reviewType is required.");
    }

    if (!reviewerUserId) {
      throw new ForbiddenException("Authenticated reviewer is required.");
    }

    const booking = await this.reviewRepository.getBookingById(bookingId);

    if (!booking) {
      throw new NotFoundException("Booking not found.");
    }

    this.assertCorrectReviewer({ booking, reviewType, reviewerUserId });
    this.assertPropertyMatchesBooking({ booking, propertyId });
    this.assertCompletedStay(booking);
    this.assertReviewWindowOpen(booking);

    await this.assertNoDuplicateReview({
      bookingId,
      reviewType,
      reviewerUserId,
    });

    return booking;
  }

  // Matches the authenticated author to the guest or host required by the review type.
  // Rejects unsupported types and reviewers who are not part of the booking.
  assertCorrectReviewer({ booking, reviewType, reviewerUserId }) {
    const policy = getReviewTypePolicy(reviewType);

    if (!policy) {
      throw new BadRequestException("reviewType is not supported.");
    }

    if (booking[policy.reviewerBookingField] !== reviewerUserId) {
      throw new ForbiddenException(
        policy.reviewerBookingField === "hostid"
          ? "Only the host of this booking can leave this review."
          : "Only the guest of this booking can leave a review."
      );
    }
  }

  // Keeps a review attached to the property recorded on its booking.
  // Rejects requests that identify a different property.
  assertPropertyMatchesBooking({ booking, propertyId }) {
    if (booking.property_id !== propertyId) {
      throw new BadRequestException("Review property does not match booking property.");
    }
  }

  // Requires a completed booking whose checkout time has passed.
  // Prevents reviews for active stays or bookings with invalid checkout dates.
  assertCompletedStay(booking) {
    if (!COMPLETED_BOOKING_STATUSES.has(String(booking.status || "").toLowerCase())) {
      throw new ForbiddenException("Only completed bookings can be reviewed.");
    }

    const departureDate = Number(booking.departuredate);

    if (!Number.isFinite(departureDate) || departureDate > this.clock()) {
      throw new ForbiddenException("You can review only after checkout.");
    }
  }

  // Checks whether the booking is still within the configured review period.
  // Rejects reviews submitted after that period has elapsed.
  assertReviewWindowOpen(booking) {
    const departureDate = Number(booking.departuredate);
    const reviewWindowMs = REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    if (this.clock() - departureDate > reviewWindowMs) {
      throw new ForbiddenException("The review window has expired.");
    }
  }

  // Looks up an existing review for this booking, type, and reviewer.
  // Rejects the request if that reviewer has already submitted one.
  async assertNoDuplicateReview({ bookingId, reviewType, reviewerUserId }) {
    const existingReview = await this.reviewRepository.getReviewByBookingTypeAndReviewer({
      bookingId,
      reviewType,
      reviewerUserId,
    });

    if (existingReview) {
      throw new ConflictException("You have already reviewed this booking.");
    }
  }
}

export default ReviewEligibilityService;
