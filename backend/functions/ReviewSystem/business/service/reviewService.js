
import { ReviewRepository } from "../../data/reviewRepository.js";
import { BadRequestException } from "../../util/exception/badRequestException.js";
import { ForbiddenException } from "../../util/exception/forbiddenException.js";
import { NotFoundException } from "../../util/exception/notFoundException.js";

const REQUIRED_FIELDS = ["reservation_id", "overall_rating"];
const CANCELLED_STATUSES = new Set(["cancelled", "canceled"]);

const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

export class ReviewService {
    constructor({ repository = new ReviewRepository(), now = () => Date.now() } = {}) {
        this.repository = repository;
        this.now = now;
    }

    // Validates the payload and confirms the caller can review the reservation.
    // Creates the review with reservation-derived IDs and verified draft status.
    async createReview(callerUserId, reviewData) {
        this.validateReviewPayload(reviewData);

        const reservationId = String(reviewData.reservation_id).trim();
        const booking = await this.repository.findBookingById(reservationId);

        if (!booking) {
            throw new NotFoundException("Reservation not found.");
        }

        if (String(booking.guestid) !== String(callerUserId)) {
            throw new ForbiddenException("You can only review your own reservation.");
        }

        if (CANCELLED_STATUSES.has(String(booking.status || "").toLowerCase())) {
            throw new BadRequestException("Cancelled reservations cannot be reviewed.");
        }

        if (Number(booking.departuredate) > this.now()) {
            throw new BadRequestException("You can only review a reservation after checkout.");
        }

        const now = this.now();

        return await this.repository.create({
            reservation_id: reservationId,
            property_id: booking.property_id,
            host_id: booking.hostid,
            guest_id: booking.guestid,
            overall_rating: Number(reviewData.overall_rating),
            public_review: reviewData.public_review ? String(reviewData.public_review).trim() : null,
            private_feedback: reviewData.private_feedback ? String(reviewData.private_feedback).trim() : null,
            verification_status: "verified",
            publication_status: "draft",
            created_at: now,
            updated_at: now,
        });
    }

    // Ensures required review fields are present and non-blank.
    // Rejects ratings outside the supported range of 1 through 5.
    validateReviewPayload(reviewData) {
        for (const field of REQUIRED_FIELDS) {
            if (isBlank(reviewData[field])) {
                throw new BadRequestException(`${field} is required`);
            }
        }

        const rating = Number(reviewData.overall_rating);
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
            throw new BadRequestException("overall_rating must be a number between 1 and 5");
        }
    }
}