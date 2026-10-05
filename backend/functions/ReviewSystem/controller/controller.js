import { AuthManager } from "../auth/authManager.js";
import { ReviewService } from "../business/service/reviewService.js";
import { BadRequestException } from "../util/exception/badRequestException.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

// Parse a raw request body into a plain object.
// This keeps malformed JSON and non-object payloads from reaching the review logic.
const parseBody = (body) => {
  let parsedBody;

  try {
    parsedBody = JSON.parse(body || "{}");
  } catch {
    throw new BadRequestException("Request body must be valid JSON");
  }

  if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
    throw new BadRequestException("Request body must be a review object");
  }

  return parsedBody;
};

export class Controller {
  // Connect the controller to the service and auth dependencies used across requests.
  // This makes the controller easy to test and keeps all handlers on the same trusted logic.
  constructor({ service = new ReviewService(), authManager = new AuthManager() } = {}) {
    this.service = service;
    this.authManager = authManager;
  }

  // Use verified identity instead of client-supplied IDs to prevent impersonation.
  // Reservation ownership can then be checked against a trusted caller.
  async createReview(event) {
    try {
      const authenticatedUser = this.authManager.getUser(event);
      const reviewData = parseBody(event.body);
      const result = await this.service.createReview(authenticatedUser.userId, reviewData);

      return { statusCode: 201, headers: responseHeaders, body: JSON.stringify(result) };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Route a review request to the correct action for the incoming HTTP method.
  // This keeps the review API centralized and prevents unsupported request types from being processed.
  async manageReviews(event) {
    try {
      const user = this.authManager.getUser(event);
      const query = event.queryStringParameters || {};
      if (event.httpMethod === "GET") return await this.getReviews(user, query);
      if (event.httpMethod === "DELETE") return await this.deleteReview(user, query);
      return { statusCode: 405, headers: responseHeaders, body: JSON.stringify({ message: "Method not supported." }) };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Fetch the caller's reviews using the requested scope.
  // This keeps listing logic simple and leaves authorization and filtering to the service layer.
  async getReviews(user, query) {
    const result = await this.service.getReviews(user.userId, query.scope);
    return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
  }

  // Delete a review after confirming the authenticated user owns it.
  // This prevents one user from removing another user's review record.
  async deleteReview(user, query) {
    await this.service.deleteReview(user.userId, query.reviewId);
    return { statusCode: 204, headers: responseHeaders, body: "" };
  }

  // Hide unexpected failure details because they may expose internal implementation data.
  // Preserve actionable client errors so callers can correct invalid requests.
  handleError(error) {
    const statusCode = error.statusCode || 500;
    const message = statusCode >= 500 ? "Something went wrong, please contact support." : error.message;

    return {
      statusCode,
      headers: responseHeaders,
      body: JSON.stringify({ message }),
    };
  }
}
