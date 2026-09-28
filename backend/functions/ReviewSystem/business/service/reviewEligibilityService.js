import BadRequestException from "../../util/exception/badRequestException.js";
import ForbiddenException from "../../util/exception/forbiddenException.js";
import ConflictException from "../../util/exception/conflictException.js";
import NotFoundException from "../../util/exception/notFoundException.js";

const REVIEW_WINDOW_DAYS = 30;
const COMPLETED_BOOKING_STATUSES = new Set(["completed"]);

// Review: Enforces booking ownership, completed-stay timing, and one-review-per-booking rules.
class ReviewEligibilityService {
  constructor({ reviewRepository, clock = Date.now } = {}) {
    this.reviewRepository = reviewRepository;
    this.clock = clock;
  }

  // Validate the booking, guest, timing, and duplicate rules before creating a review.
  // Review: This is the main gate that checks every eligibility condition before a review is created.
  async validateReservationEligibility({ bookingId, propertyId, reviewType, reviewerUserId }) {
    // Review: Runs all eligibility checks before any review or workflow records are created.
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

  // Ensure the account belongs to the booking guest before allowing any review attempt.
  // Review: This prevents a user from reviewing someone else’s reservation.
  assertCorrectGuest({ booking, reviewerUserId }) {
    if (booking.guestid !== reviewerUserId) {
      throw new ForbiddenException("Only the guest of this booking can leave a review.");
    }
  }

  // Verify the submitted property matches the reservation before continuing.
  // Review: This stops a review from being attached to the wrong accommodation.
  assertPropertyMatchesBooking({ booking, propertyId }) {
    if (booking.property_id !== propertyId) {
      throw new BadRequestException("Review property does not match booking property.");
    }
  }

  // Only completed stays can be reviewed after checkout has happened.
  // Review: This enforces required booking status and departure timing checks.
  assertCompletedStay(booking) {
    if (!COMPLETED_BOOKING_STATUSES.has(String(booking.status || "").toLowerCase())) {
      throw new ForbiddenException("Only completed bookings can be reviewed.");
    }

    const departureDate = Number(booking.departuredate);

    if (!Number.isFinite(departureDate) || departureDate > this.clock()) {
      throw new ForbiddenException("You can review only after checkout.");
    }
  }

  // Reject review requests that fall outside the allowed post-stay window.
  // Review: This prevents expired reviews from being accepted after the deadline.
  assertReviewWindowOpen(booking) {
    const departureDate = Number(booking.departuredate);
    const reviewWindowMs = REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    if (this.clock() - departureDate > reviewWindowMs) {
      throw new ForbiddenException("The review window has expired.");
    }
  }

  // Block repeated review submissions for the same booking and review type.
  // Review: This protects against duplicate entries caused by retries or resubmits.
  async assertNoDuplicateReview({ bookingId, reviewType, reviewerUserId }) {
    // Review: Keeps retries and repeat submissions from creating a second review for the same stay.
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
