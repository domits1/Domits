import ReviewService from "../business/service/reviewService.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

// Review: Thin HTTP controller that maps review routes to service workflows and shared responses.
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
    // Review: Returns public, host, booking, or personal review lists based on query parameters.
    return this.respond(() => this.reviewService.getReviews(event));
  }

  async getById(event) {
    return this.respond(() => this.reviewService.getReviewById(event, event.pathParameters?.id));
  }

  async getDomitsPrivateFeedback(event) {
    return this.respond(() => this.reviewService.getDomitsPrivateFeedback(event));
  }

  async getDomitsPrivateFeedbackInbox(event) {
    return this.respond(() => this.reviewService.getDomitsPrivateFeedbackInbox(event));
  }

  async create(event) {
    // Review: Creates a guest review after the service validates eligibility and workflow state.
    return this.respond(() => this.reviewService.createReview(event), 201);
  }

  async update(event) {
    return this.respond(() => this.reviewService.updateReview(event));
  }

  async notificationPreference(event) {
    return this.respond(() => this.reviewService.getNotificationPreference(event));
  }

  async setNotificationPreference(event) {
    return this.respond(() => this.reviewService.setNotificationPreference(event));
  }

  async moderationQueue(event) {
    return this.respond(() => this.reviewService.getModerationQueue(event));
  }

  async moderate(event) {
    return this.respond(() => this.reviewService.moderateReview(event));
  }

  async processReviewRequests(detail) {
    // Review: Handles scheduled review invitation and reminder processing outside the HTTP flow.
    return this.respond(() => this.reviewService.processReviewRequests(detail));
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
    // Review: Wraps successful service results in the Lambda proxy response format.
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
    // Review: Converts domain exceptions into consistent API errors for review clients.
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
