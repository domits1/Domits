import ReviewService from "../business/service/reviewService.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

class ReviewController {
  // Stores the review service used by controller routes.
  // Allows a service instance to be injected for isolated tests.
  constructor({ reviewService = new ReviewService() } = {}) {
    this.reviewService = reviewService;
  }

  // Returns the shared CORS preflight response.
  // No service call is needed for OPTIONS requests.
  options() {
    return {
      statusCode: 200,
      headers: responseHeaders,
      body: "",
    };
  }

  // Loads reviews selected by the request's query parameters.
  // Wraps the service result in a standard HTTP response.
  async get(event) {
    return this.respond(() => this.reviewService.getReviews(event));
  }

  // Loads a single review using the id from the route.
  // Wraps the service result in a standard HTTP response.
  async getById(event) {
    return this.respond(() => this.reviewService.getReviewById(event, event.pathParameters?.id));
  }

  // Loads rating categories for the requested review context.
  // Delegates category lookup and response formatting to the service.
  async getCategories(event) {
    return this.respond(() => this.reviewService.getReviewCategories(event));
  }

  // Loads the active rating category configuration.
  // Delegates configuration lookup to the service.
  async getCategoryConfiguration(event) {
    return this.respond(() => this.reviewService.getReviewCategoryConfiguration(event));
  }

  // Saves rating category configuration from the request.
  // Delegates validation and persistence to the service.
  async saveCategoryConfiguration(event) {
    return this.respond(() => this.reviewService.saveReviewCategoryConfiguration(event));
  }

  // Loads internal Domits feedback for a specific review.
  // Delegates access checks and auditing to the service.
  async getDomitsPrivateFeedback(event) {
    return this.respond(() => this.reviewService.getDomitsPrivateFeedback(event));
  }

  // Loads the internal Domits private feedback inbox.
  // Delegates authorization and retrieval to the service.
  async getDomitsPrivateFeedbackInbox(event) {
    return this.respond(() => this.reviewService.getDomitsPrivateFeedbackInbox(event));
  }

  // Creates a guest review through the review service.
  // Uses HTTP 201 when the review is successfully created.
  async create(event) {
    return this.respond(() => this.reviewService.createReview(event), 201);
  }

  // Updates a review using the submitted request fields.
  // Wraps the service result in a standard HTTP response.
  async update(event) {
    return this.respond(() => this.reviewService.updateReview(event));
  }

  // Loads the caller's review notification preference.
  // Wraps the service result in a standard HTTP response.
  async notificationPreference(event) {
    return this.respond(() => this.reviewService.getNotificationPreference(event));
  }

  // Updates the caller's review notification preference.
  // Wraps the service result in a standard HTTP response.
  async setNotificationPreference(event) {
    return this.respond(() => this.reviewService.setNotificationPreference(event));
  }

  // Loads reviews awaiting moderator decisions.
  // Delegates authorization and queue construction to the service.
  async moderationQueue(event) {
    return this.respond(() => this.reviewService.getModerationQueue(event));
  }

  // Applies a moderator decision to a review.
  // Delegates validation and persistence to the service.
  async moderate(event) {
    return this.respond(() => this.reviewService.moderateReview(event));
  }

  // Processes scheduled review invitations and reminders.
  // Delegates scheduled work to the service outside normal HTTP routes.
  async processReviewRequests(detail) {
    return this.respond(() => this.reviewService.processReviewRequests(detail));
  }

  // Saves a host response as a draft.
  // Wraps the service result in a standard HTTP response.
  async saveDraftResponse(event) {
    return this.respond(() => this.reviewService.saveDraftResponse(event));
  }

  // Publishes a host response to an eligible review.
  // Wraps the service result in a standard HTTP response.
  async publishResponse(event) {
    return this.respond(() => this.reviewService.publishResponse(event));
  }

  // Edits an existing host response.
  // Wraps the service result in a standard HTTP response.
  async editResponse(event) {
    return this.respond(() => this.reviewService.editResponse(event));
  }

  // Deletes a host response while preserving its audit history.
  // Wraps the service result in a standard HTTP response.
  async deleteResponse(event) {
    return this.respond(() => this.reviewService.deleteResponse(event));
  }

  // Deletes the caller's review through the review service.
  // Wraps the service result in a standard HTTP response.
  async delete(event) {
    return this.respond(() => this.reviewService.deleteReview(event));
  }

  // Executes a service action and formats its successful result.
  // Converts thrown service errors into consistent API responses.
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

  // Converts a domain or unexpected error into an HTTP response.
  // Uses the provided status and message or falls back to a generic 500 error.
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
