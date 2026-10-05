import { AuthManager } from "../auth/authManager.js";
import { ReviewService } from "../business/service/reviewService.js";
import { BadRequestException } from "../util/exception/badRequestException.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

// Parse the raw request payload into a validated review object.
// This prevents malformed JSON or array payloads from reaching business logic.
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

  // Route each request to the correct review action based on the HTTP method.
  // This keeps review API handling centralized and prevents unhandled request types.
  async manageReviews(event) {
    try {
      const user = this.authManager.getUser(event);
      const query = event.queryStringParameters || {};
      if (event.httpMethod === "GET") return await this.getReviews(user, query);
      if (event.httpMethod === "PATCH") return await this.patchReview(user, query, event.body);
      if (event.httpMethod === "DELETE") return await this.deleteReview(user, query);
      return { statusCode: 405, headers: responseHeaders, body: JSON.stringify({ message: "Method not supported." }) };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Fetch review data in the requested scope while enforcing valid combinations.
  // This prevents ambiguous or unauthorized queries from being processed.
  async getReviews(user, query) {
    if (query.scope === "property-score" && query.reviewId !== undefined) {
      throw new BadRequestException("Property score and individual review requests cannot be combined.");
    }
    let result;
    if (query.scope === "property-score") {
      result = await this.service.getPropertyOverallScore(user.username, query.propertyId);
    } else if (query.reviewId !== undefined) {
      result = await this.service.getEditableReview(user.userId, query.reviewId);
    } else {
      result = await this.service.getReviews(user.userId, query.scope);
    }
    return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
  }

  // Update an existing review after authenticating the caller and validating the payload.
  // This keeps edits limited to the intended review and protects against stale or malformed updates.
  async patchReview(user, query, body) {
    const result = await this.service.updateReview(user.userId, query.reviewId, parseBody(body));
    return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
  }

  // Delete a review only for the authenticated owner.
  // This avoids allowing one user to remove another user's review.
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
