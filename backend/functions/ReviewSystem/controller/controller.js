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

  async manageReviews(event) {
    try {
      const user = this.authManager.getUser(event);
      const query = { ...event.queryStringParameters,
        reviewId: event.pathParameters?.id ?? event.pathParameters?.reviewId ?? event.queryStringParameters?.reviewId };
      if (event.httpMethod === "GET") return await this.getReviews(user, query);
      if (event.httpMethod === "PATCH") return await this.patchReview(user, query, event.body);
      if (event.httpMethod === "DELETE") return await this.deleteReview(user, query);
      return { statusCode: 405, headers: responseHeaders, body: JSON.stringify({ message: "Method not supported." }) };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getReviews(user, query) {
    if (query.scope === "property-score" && query.reviewId !== undefined) {
      throw new BadRequestException("Property score and individual review requests cannot be combined.");
    }
    let result;
    if (query.scope === "property-score") {
      result = await this.service.getPropertyOverallScore(user.userId, query.propertyId);
    } else if (query.reviewId !== undefined) {
      result = await this.service.getEditableReview(user.userId, query.reviewId);
    } else {
      result = await this.service.getReviews(user.userId, query.scope);
    }
    return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
  }

  async patchReview(user, query, body) {
    const result = await this.service.updateReview(user.userId, query.reviewId, parseBody(body));
    return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
  }

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
