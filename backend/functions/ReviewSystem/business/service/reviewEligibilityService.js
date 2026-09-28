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

  // Validate the booking and guest before creating any review or workflow records.
  // Review: This is the main eligibility check that runs before a review can be created.
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

  // Ensure only the booking guest can submit a review for that reservation.
  // Review: This blocks unauthorized users from reviewing someone else’s stay.
  assertCorrectGuest({ booking, reviewerUserId }) {
    if (booking.guestid !== reviewerUserId) {
      throw new ForbiddenException("Only the guest of this booking can leave a review.");
    }
  }

  // Verify the review target matches the booking property.
  // Review: This prevents a review from being attached to the wrong accommodation.
  assertPropertyMatchesBooking({ booking, propertyId }) {
    if (booking.property_id !== propertyId) {
      throw new BadRequestException("Review property does not match booking property.");
    }
  }

  // Only allow reviews for bookings that are marked completed and already checked out.
  // Review: This enforces the completed-stay requirement before review creation.
  assertCompletedStay(booking) {
    if (!COMPLETED_BOOKING_STATUSES.has(String(booking.status || "").toLowerCase())) {
      throw new ForbiddenException("Only completed bookings can be reviewed.");
    }

    const departureDate = Number(booking.departuredate);

    if (!Number.isFinite(departureDate) || departureDate > this.clock()) {
      throw new ForbiddenException("You can review only after checkout.");
    }
  }

  // Reject expired review attempts after the allowed post-stay window closes.
  // Review: This protects the review window from being used after it has expired.
  assertReviewWindowOpen(booking) {
    const departureDate = Number(booking.departuredate);
    const reviewWindowMs = REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    if (this.clock() - departureDate > reviewWindowMs) {
      throw new ForbiddenException("The review window has expired.");
    }
  }

  // Prevent duplicate reviews for the same booking and review type.
  // Review: This blocks retries and re-submissions from creating a second review for one stay.
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
