import ReviewService from "../business/service/reviewService.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

// Review: Maps ReviewSystem HTTP requests to service operations and consistent Lambda responses.
class ReviewController {
  constructor({ reviewService = new ReviewService() } = {}) {
    this.reviewService = reviewService;
  }

  options() {
    return {
      statusCode: 200,
      headers: responseHeaders,
      body: "",
    };
  }

  async get(event) {
    // Review: Returns the review collection selected by the request query parameters.
    try {
      const result = await this.reviewService.getReviews(event);
      return this.ok(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getById(event) {
    try {
      const result = await this.reviewService.getReviewById(event, event.pathParameters?.id);
      return this.ok(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async create(event) {
    // Review: Creates a review and returns the REST create status code.
    try {
      const result = await this.reviewService.createReview(event);
      return {
        statusCode: 201,
        headers: responseHeaders,
        body: JSON.stringify(result),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async update(event) {
    try {
      const result = await this.reviewService.updateReview(event);
      return this.ok(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async delete(event) {
    try {
      const result = await this.reviewService.deleteReview(event);
      return {
        statusCode: 200,
        headers: responseHeaders,
        body: JSON.stringify(result),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  ok(result) {
    return {
      statusCode: 200,
      headers: responseHeaders,
      body: JSON.stringify(result),
    };
  }

  handleError(error) {
    // Review: Preserves domain status codes while hiding internal error details from clients.
    return {
      statusCode: error.statusCode || 500,
      headers: responseHeaders,
      body: JSON.stringify({
        message: error.message || "Something went wrong, please contact support.",
      }),
    };
  }
}

export default ReviewController;
