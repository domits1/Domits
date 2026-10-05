import { AuthManager } from "../auth/authManager.js";
import { ReviewService } from "../business/service/reviewService.js";
import { BadRequestException } from "../util/exception/badRequestException.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

// Parse the raw JSON into a plain object before the review logic runs.
// This stops malformed payloads and array inputs from reaching business validation.
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
  // Attach the review service and auth dependency to the controller instance.
  // This keeps the controller testable and ensures all handlers share the same trusted dependencies.
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

  // Route the request to the right review operation based on the HTTP method.
  // This keeps review handling centralized and rejects unsupported request types early.
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

  // Fetch the user's reviews for the specific read scope.
  // This provides a clean read entry point while leaving filtering and authorization to the service layer.
  async getReviews(user, query) {
    const result = await this.service.getReviews(user.userId, query.scope);
    return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
  }

  // Delete a review after confirming the caller owns it.
  // This prevents users from removing someone else's review by mistake or by intent.
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
