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
  constructor({ service = new ReviewService(), authManager = new AuthManager() } = {}) {
    this.service = service;
    this.authManager = authManager;
  }

  // Use verified identity instead of client-supplied IDs to prevent impersonation.
  // Reservation ownership can then be checked against a trusted caller.
  async createReview(event) {
    try {
      const token = event.headers?.Authorization || event.headers?.authorization;
      const authenticatedUser = await this.authManager.getUser(token);
      const reviewData = parseBody(event.body);
      const result = await this.service.createReview(authenticatedUser.userId, reviewData);

      return { statusCode: 201, headers: responseHeaders, body: JSON.stringify(result) };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async manageReviews(event) {
    try {
      const user = await this.authManager.getUser(event.headers?.Authorization || event.headers?.authorization);
      const query = event.queryStringParameters || {};
      if (event.httpMethod === "DELETE") {
        await this.service.deleteReview(user.userId, query.reviewId);
        return { statusCode: 204, headers: responseHeaders, body: "" };
      }
      const reviews = event.httpMethod === "PATCH"
        ? await this.service.updateReview(user.userId, query.reviewId, parseBody(event.body))
        : query.reviewId !== undefined
          ? await this.service.getEditableReview(user.userId, query.reviewId)
          : await this.service.getReviews(user.userId, query.scope);
      return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(reviews) };
    } catch (error) {
      return this.handleError(error);
    }
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
