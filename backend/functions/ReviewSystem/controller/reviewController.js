import ReviewService from "../business/service/reviewService.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

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
    return this.respond(() => this.reviewService.getReviews(event));
  }

  async getById(event) {
    return this.respond(() => this.reviewService.getReviewById(event, event.pathParameters?.id));
  }

  async getDomitsPrivateFeedback(event) {
    return this.respond(() => this.reviewService.getDomitsPrivateFeedback(event));
  }

  async create(event) {
    return this.respond(() => this.reviewService.createReview(event), 201);
  }

  async update(event) {
    return this.respond(() => this.reviewService.updateReview(event));
  }

  async saveDraftResponse(event) {
    return this.respond(() => this.reviewService.saveDraftResponse(event));
  }

  async publishResponse(event) {
    return this.respond(() => this.reviewService.publishResponse(event));
  }

  async editResponse(event) {
    return this.respond(() => this.reviewService.editResponse(event));
  }

  async deleteResponse(event) {
    return this.respond(() => this.reviewService.deleteResponse(event));
  }

  async delete(event) {
    return this.respond(() => this.reviewService.deleteReview(event));
  }

  async respond(action, statusCode = 200) {
    try {
      const result = await action();
      return {
        statusCode,
        headers: responseHeaders,
        body: JSON.stringify(result),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

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

export default ReviewController;
