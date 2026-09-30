import { ReviewService } from "../business/service/reviewService.js";
import { BadRequestException } from "../util/exception/badRequestException.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

const parseBody = (body) => {
    try {
        return JSON.parse(body || "{}");
    } catch {
        throw new BadRequestException("Request body must be valid JSON");
    }
};

export class Controller {
    constructor({ service = new ReviewService() } = {}) {
        this.service = service;
    }

    // Parses the request and delegates review creation to the service.
    // Returns a created response or maps failures to an HTTP error response.
    async createReview(event) {
        try {
            const reviewData = parseBody(event.body);
            const result = await this.service.createReview(reviewData);
            return { statusCode: 201, headers: responseHeaders, body: JSON.stringify(result) };
        } catch (error) {
            return this.handleError(error);
        }
    }

    // Converts an exception into the controller's standard response shape.
    // Uses the error status when available and defaults to HTTP 500.
    handleError(error) {
        return {
            statusCode: error.statusCode || 500,
            headers: responseHeaders,
            body: JSON.stringify({
                message: error.message || "Something went wrong, please contact support.",
            }),
        };
    }
}