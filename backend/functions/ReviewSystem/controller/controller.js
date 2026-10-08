import { AuthManager } from "../auth/authManager.js";
import { ReviewService } from "../business/service/reviewService.js";
import { BadRequestException } from "../util/exception/badRequestException.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

// Parse the raw request payload into a plain object.
// This blocks malformed JSON or array payloads from reaching the review flow.
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
  // Connect the controller to the service and auth dependencies used by all handlers.
  // This keeps dependency injection flexible and ensures each request uses the same trusted logic.
  constructor({ service = new ReviewService(), authManager = new AuthManager() } = {}) {
    this.service = service;
    this.authManager = authManager;
  }

  // Create a review for the authenticated user and validated request body.
  // This prevents impersonation by trusting the server-verified caller instead of client-supplied data.
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

  // Route the request to the correct review action for the incoming HTTP method.
  // This centralizes review handling and prevents unsupported operations from being processed.
  async manageReviews(event) {
    try {
      const user = this.authManager.getUser(event);
      const query = { ...event.queryStringParameters,
        reviewId: event.pathParameters?.id ?? event.pathParameters?.reviewId ?? event.queryStringParameters?.reviewId };
      if (event.httpMethod === "GET") return await this.getReviews(user, query);
      if (event.httpMethod === "DELETE") return await this.deleteReview(user, query);
      return { statusCode: 405, headers: responseHeaders, body: JSON.stringify({ message: "Method not supported." }) };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Fetch the caller's review list with the requested scope.
  // This keeps read behavior simple while leaving access rules to the service layer.
  async getReviews(user, query) {
    const result = await this.service.getReviews(user.userId, query.scope);
    return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
  }

  // Public property reads use the service's filtered, privacy-safe response.
  async getPublicPropertyReviews(event) {
    try {
      const result = await this.service.getPublicPropertyReviews(event.pathParameters?.propertyId, event.queryStringParameters || {});
      return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Remove a review only for the authenticated owner.
  // This stops one user from deleting another user's review record.
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
