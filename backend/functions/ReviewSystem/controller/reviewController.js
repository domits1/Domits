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

  async getDomitsPrivateFeedback(event) {
    try {
      const result = await this.reviewService.getDomitsPrivateFeedback(event);
      return this.ok(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async create(event) {
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

  async saveDraftResponse(event) {
    try {
      const result = await this.reviewService.saveDraftResponse(event);
      return this.ok(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async publishResponse(event) {
    try {
      const result = await this.reviewService.publishResponse(event);
      return this.ok(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async editResponse(event) {
    try {
      const result = await this.reviewService.editResponse(event);
      return this.ok(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteResponse(event) {
    try {
      const result = await this.reviewService.deleteResponse(event);
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
