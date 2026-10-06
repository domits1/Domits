import { AuthManager } from "../auth/authManager.js";
import { ReviewService } from "../business/service/reviewService.js";
import { BadRequestException } from "../util/exception/badRequestException.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

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
  async getPublicReviews(event) {
    try {
      const result = await this.service.getPublicReviews(
        event.pathParameters?.propertyId, event.queryStringParameters?.offset,
      );
      return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
    } catch (error) {
      return this.handleError(error);
    }
  }

  constructor({ service = new ReviewService(), authManager = new AuthManager() } = {}) {
    this.service = service;
    this.authManager = authManager;
  }

  // Create a review from the authenticated user and validated request body.
  // This prevents impersonation by trusting the server-authenticated caller instead of the client.
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

  // Route review actions to the correct handler based on the HTTP method.
  // This keeps the API surface simple while enforcing one entry point for read/update/delete operations.
  async manageReviews(event) {
    try {
      const user = this.authManager.getUser(event);
      const query = { ...(event.queryStringParameters || {}) };
      if (event.resource === "/reviews/{id}") {
        if (typeof event.pathParameters?.id !== "string" || !event.pathParameters.id.trim()) {
          throw new BadRequestException("A review ID is required.");
        }
        query.reviewId = event.pathParameters.id;
        delete query.scope;
      } else if (query.reviewId !== undefined) {
        throw new BadRequestException("Use /reviews/{id} for an individual review.");
      }
      if (event.httpMethod === "GET") return await this.getReviews(user, query);
      if (event.httpMethod === "PATCH") return await this.patchReview(user, query, event.body);
      if (event.httpMethod === "DELETE") return await this.deleteReview(user, query);
      return { statusCode: 405, headers: responseHeaders, body: JSON.stringify({ message: "Method not supported." }) };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Fetch review data for the caller while guarding invalid query combinations.
  // This ensures the response matches the requested scope without exposing unauthorized or inconsistent data.
  async getReviews(user, query) {
    const propertyScope = ["property-score", "property-categories"].includes(query.scope);
    if (propertyScope && query.reviewId !== undefined) {
      throw new BadRequestException("Property aggregate and individual review requests cannot be combined.");
    }
    let result;
    if (query.scope === "property-score") {
      result = await this.service.getPropertyOverallScore(user.username, query.propertyId);
    } else if (query.scope === "property-categories") {
      result = await this.service.getPropertyCategoryRatings(user.username, query.propertyId);
    } else if (query.reviewId !== undefined) {
      result = await this.service.getEditableReview(user.userId, query.reviewId);
    } else {
      result = await this.service.getReviews(user.userId, query.scope);
    }
    return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
  }

  // Update an existing review only if the caller is allowed to edit it.
  // This prevents abandoned, stale, or unauthorized edits from changing a guest's review data.
  async patchReview(user, query, body) {
    const result = await this.service.updateReview(user.userId, query.reviewId, parseBody(body));
    return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
  }

  // Remove a review after confirming the caller owns it.
  // This enforces deletion safety and avoids allowing arbitrary users to delete another person's review.
  // Public property reads use the service's filtered, privacy-safe response.
  async getPublicPropertyReviews(event) {
    try {
      const result = await this.service.getPublicPropertyReviews(event.pathParameters?.propertyId, event.queryStringParameters || {});
      return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteReview(user, query) {
    await this.service.deleteReview(user.userId, query.reviewId);
    return { statusCode: 204, headers: responseHeaders, body: "" };
  }

  // Convert exceptions into safe HTTP responses for the client.
  // This hides internal implementation details while preserving validation and authorization feedback.
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
