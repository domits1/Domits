import { ReviewRepository } from "../../data/reviewRepository.js";
import { BadRequestException } from "../../util/exception/badRequestException.js";

const REQUIRED_FIELDS = ["reservation_id", "property_id", "host_id", "guest_id", "overall_rating"];

const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

export class ReviewService {
    constructor({ repository = new ReviewRepository(), now = () => Date.now() } = {}) {
        this.repository = repository;
        this.now = now;
    }

    // Validates and normalizes the review before persistence.
    // New reviews start pending verification and in draft publication status.
    async createReview(reviewData) {
        this.validateReviewPayload(reviewData);

        const now = this.now();

        return await this.repository.create({
            reservation_id: String(reviewData.reservation_id).trim(),
            property_id: String(reviewData.property_id).trim(),
            host_id: String(reviewData.host_id).trim(),
            guest_id: String(reviewData.guest_id).trim(),
            overall_rating: Number(reviewData.overall_rating),
            public_review: reviewData.public_review ? String(reviewData.public_review).trim() : null,
            private_feedback: reviewData.private_feedback ? String(reviewData.private_feedback).trim() : null,
            verification_status: "pending",
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