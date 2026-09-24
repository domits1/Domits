import BadRequestException from "../../util/exception/badRequestException.js";
import ForbiddenException from "../../util/exception/forbiddenException.js";
import ConflictException from "../../util/exception/conflictException.js";
import NotFoundException from "../../util/exception/notFoundException.js";
import { REVIEW_WINDOW_DAYS } from "../../util/reviewPolicy.js";

const COMPLETED_BOOKING_STATUSES = new Set(["completed"]);

class ReviewEligibilityService {
  constructor({ reviewRepository, clock = Date.now } = {}) {
    this.reviewRepository = reviewRepository;
    this.clock = clock;
  }

  // Review: Walk through every rule before allowing a guest to start a review.
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

    this.assertCorrectGuest({ booking, reviewerUserId });
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

  // Review: A booking can only be reviewed by the guest who made it.
  assertCorrectGuest({ booking, reviewerUserId }) {
    if (booking.guestid !== reviewerUserId) {
      throw new ForbiddenException("Only the guest of this booking can leave a review.");
    }
  }

  // Review: Keep reviews attached to the property that was actually booked.
  assertPropertyMatchesBooking({ booking, propertyId }) {
    if (booking.property_id !== propertyId) {
      throw new BadRequestException("Review property does not match booking property.");
    }
  }

  // Review: Reviews open only after a completed stay has ended.
  assertCompletedStay(booking) {
    if (!COMPLETED_BOOKING_STATUSES.has(String(booking.status || "").toLowerCase())) {
      throw new ForbiddenException("Only completed bookings can be reviewed.");
    }

    const departureDate = Number(booking.departuredate);

    if (!Number.isFinite(departureDate) || departureDate > this.clock()) {
      throw new ForbiddenException("You can review only after checkout.");
    }
  }

  // Review: Stop guests from submitting reviews long after the stay is over.
  assertReviewWindowOpen(booking) {
    const departureDate = Number(booking.departuredate);
    const reviewWindowMs = REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    if (this.clock() - departureDate > reviewWindowMs) {
      throw new ForbiddenException("The review window has expired.");
    }
  }

  // Review: Prevent the same guest from reviewing the same booking twice.
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
