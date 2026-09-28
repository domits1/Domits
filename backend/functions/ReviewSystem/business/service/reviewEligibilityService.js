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

  // Validate whether a booking can receive a review from the current guest.
  // Review: Runs all eligibility checks before any review or workflow records are created.
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

  // Confirm the authenticated user matches the booking guest.
  // Review: Only the guest who made the booking may create a review for it.
  assertCorrectGuest({ booking, reviewerUserId }) {
    if (booking.guestid !== reviewerUserId) {
      throw new ForbiddenException("Only the guest of this booking can leave a review.");
    }
  }

  // Check that the requested property matches the booking property.
  // Review: This prevents a guest from submitting a review for the wrong property.
  assertPropertyMatchesBooking({ booking, propertyId }) {
    if (booking.property_id !== propertyId) {
      throw new BadRequestException("Review property does not match booking property.");
    }
  }

  // Verify the stay is complete and the review date is allowed.
  // Review: This enforces that only completed bookings can be reviewed after checkout.
  assertCompletedStay(booking) {
    if (!COMPLETED_BOOKING_STATUSES.has(String(booking.status || "").toLowerCase())) {
      throw new ForbiddenException("Only completed bookings can be reviewed.");
    }

    const departureDate = Number(booking.departuredate);

    if (!Number.isFinite(departureDate) || departureDate > this.clock()) {
      throw new ForbiddenException("You can review only after checkout.");
    }
  }

  // Check that the review falls within the allowed time window.
  // Review: This blocks submissions outside the configured review period after departure.
  assertReviewWindowOpen(booking) {
    const departureDate = Number(booking.departuredate);
    const reviewWindowMs = REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    if (this.clock() - departureDate > reviewWindowMs) {
      throw new ForbiddenException("The review window has expired.");
    }
  }

  // Prevent duplicate reviews for the same booking and guest.
  // Review: Keeps retries and repeat submissions from creating a second review for the same stay.
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
