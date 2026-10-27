import { AuthManager } from "../auth/authManager.js";
import { ReviewService } from "../business/service/reviewService.js";
import { BadRequestException } from "../util/exception/badRequestException.js";
import { UnauthorizedException } from "../util/exception/unauthorizedException.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

const parseBody = (event) => {
  let parsed;
  try {
    if (typeof event.body !== "string" || !event.body.trim()) throw new Error("Missing request body");
    const body = event.isBase64Encoded === true ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
    parsed = JSON.parse(body);
  } catch {
    throw new BadRequestException("Request body must be valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new BadRequestException("Request body must be a review object");
  }
  return parsed;
};

export class Controller {
  async saveHostResponse(event) {
    return this.executeAuthenticated(event, async (userId, user) => {
      let action = "draft";
      if (event.resource.endsWith("/publish")) action = "publish";
      else if (event.httpMethod === "PATCH") action = "edit";
      const response = await this.service.saveHostResponse(user,
        this.getPathParameter(event, "id"), parseBody(event), action);
      return this.jsonResponse(200, { response });
    });
  }
  constructor({ service = new ReviewService(), authManager = new AuthManager() } = {}) {
    this.service = service;
    this.authManager = authManager;
  }

  async getPublicReviews(event) {
    try {
      const { offset = "0", ...filters } = event.queryStringParameters ?? {};
      return this.jsonResponse(200, await this.service.getPublicReviews(
        this.getPathParameter(event, "propertyId"), offset, filters));
    } catch (error) {
      return this.handleError(error);
    }
  }

  jsonResponse(statusCode, result) {
    return { statusCode, headers: responseHeaders, body: JSON.stringify(result) };
  }

  getPathParameter(event, name) {
    const value = event.pathParameters?.[name];
    if (typeof value !== "string" || !value.trim() || value.trim().length > 255) {
      throw new BadRequestException(`A valid ${name} path parameter is required.`);
    }
    return value.trim();
  }

  async executeAuthenticated(event, callback) {
    try {
      const user = await this.authManager.getUser(event);
      if (typeof user?.userId !== "string" || !user.userId.trim()) {
        throw new UnauthorizedException("Verified authorization context is required.");
      }
      return await callback(user.userId, user);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Create a new review for the authenticated guest.
  // This keeps the entry point consistent with the service rules for booking eligibility and duplicate prevention.
  async createReview(event) {
    return this.executeAuthenticated(event, async (userId) =>
      this.jsonResponse(201, await this.service.createReview(userId, parseBody(event))));
  }

  // Fetch the caller's review list for the selected scope.
  // This lets the profile and dashboard view show written or received reviews without duplicating business logic.
  async manageReviewSchedule(event) {
    return this.executeAuthenticated(event, async userId => {
      const query = event.queryStringParameters ?? {};
      if (event.pathParameters?.id !== undefined ||
          Object.keys(query).some(key => !["scope", "propertyId"].includes(key))) throw new BadRequestException("Unexpected scheduling parameter.");
      return this.jsonResponse(200, await this.service.reviewSchedule(userId, query.propertyId,
        event.httpMethod === "PATCH" ? parseBody(event) : undefined));
    });
  }

  async getReviews(event) {
    if (event.queryStringParameters?.scope === "property-review-schedule") return this.manageReviewSchedule(event);
    return this.executeAuthenticated(event, async (userId, user) => {
      const query = event.queryStringParameters ?? {};
      const propertyScope = ["property-score", "property-categories", "property-performance", "property-trends"].includes(query.scope);
      if (propertyScope && (query.reviewId !== undefined || event.pathParameters?.id !== undefined)) {
        throw new BadRequestException("Property aggregate and individual review requests cannot be combined.");
      }
      let result;
      if (query.reviewId !== undefined && query.view !== undefined) {
        if (query.view !== "history" || Object.keys(query).some((key) => !["reviewId", "view"].includes(key))) {
          throw new BadRequestException("Unsupported review detail parameter.");
        }
        result = await this.service.getGuestReviewDetail(userId, query.reviewId);
      } else if (query.scope === "guest-history") {
        result = await this.service.getGuestReviewHistory(userId, query);
      } else if (query.scope === "respondable") {
        result = await this.service.getResponseEligibleReviews(user.username);
      } else if (query.scope === "property-trends") {
        result = await this.service.getPropertyRatingTrends(user.username, query);
      } else if (query.scope === "property-categories") {
        result = await this.service.getPropertyCategoryRatings(userId, query.propertyId);
      } else if (query.scope === "property-score") {
        result = await this.service.getPropertyReviewScore(userId, query.propertyId);
      } else if (query.scope === "property-performance") {
        result = await this.service.getPropertyReviewPerformance(userId, query.propertyId, query);
      } else if (query.reviewId !== undefined) {
        result = await this.service.getEditableReview(userId, query.reviewId);
      } else {
        result = await this.service.getReviews(userId, query.scope ?? "written");
      }
      return this.jsonResponse(200, result);
    });
  }

  // Fetch a single review with the correct visibility rules.
  // This ensures the endpoint returns a review only when it is permitted by the service's access checks.
  async getReviewById(event) {
    if (event.queryStringParameters?.view !== undefined) {
      return this.getReviews({ ...event, queryStringParameters: {
        ...event.queryStringParameters, reviewId: event.pathParameters?.id,
      } });
    }
    return this.executeAuthenticated(event, async (userId) =>
      this.jsonResponse(200, await this.service.getReviewById(userId, this.getPathParameter(event, "id"))));
  }

  // Update an unpublished review draft.
  // This keeps the controller thin while preserving the service's conflict and validation checks.
  async updateReview(event) {
    if (event.queryStringParameters?.scope === "property-review-schedule") return this.manageReviewSchedule(event);
    return this.executeAuthenticated(event, async (userId) => {
      const pathId = event.pathParameters?.id;
      const queryId = event.queryStringParameters?.reviewId;
      if (pathId !== undefined && queryId !== undefined && pathId !== queryId) {
        throw new BadRequestException("Conflicting review IDs.");
      }
      const data = parseBody(event);
      if (queryId !== undefined || Object.hasOwn(data, "updated_at")) {
        const reviewId = queryId ?? this.getPathParameter(event, "id");
        return this.jsonResponse(200, await this.service.updateEditableReview(userId, reviewId, data));
      }
      return this.jsonResponse(200, await this.service.updateReview(userId, this.getPathParameter(event, "id"), data));
    });
  }

  // Return the public review feed for a property.
  // This endpoint intentionally skips authenticated checks because the public listing data is designed for broad access.
  async getPropertyReviews(event) {
    try {
      return this.jsonResponse(200, await this.service.getPublicPropertyReviews(
        this.getPathParameter(event, "propertyId"), event.queryStringParameters ?? {}));
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Return private feedback only for authorized callers.
  // This keeps guest notes hidden from normal public access while still allowing the right user to read them.
  async getPrivateFeedback(event) {
    return this.executeAuthenticated(event, async (userId) =>
      this.jsonResponse(200, await this.service.getPrivateFeedback(userId, this.getPathParameter(event, "id"))));
  }

  // Create a host response to a review.
  // This routes the host reply through the service so permission and validation rules stay in one place.
  async createReviewResponse(event) {
    return this.executeAuthenticated(event, async (userId) =>
      this.jsonResponse(201, await this.service.createReviewResponse(userId, this.getPathParameter(event, "id"), parseBody(event))));
  }

  // Update a host response.
  // This keeps the response paths predictable while reusing the same service authorization checks.
  async updateReviewResponse(event) {
    return this.executeAuthenticated(event, async (userId) =>
      this.jsonResponse(200, await this.service.updateReviewResponse(userId, this.getPathParameter(event, "id"), parseBody(event))));
  }

  // Delete a host response.
  // This removes the reply and keeps the controller response format consistent with other idempotent delete routes.
  async deleteReviewResponse(event) {
    return this.executeAuthenticated(event, async (userId) => {
      await this.service.deleteReviewResponse(userId, this.getPathParameter(event, "id"));
      return { statusCode: 204, headers: responseHeaders, body: "" };
    });
  }

  // Publish a review draft after validation.
  // This allows the guest to finalize a review only when business rules confirm the reservation still qualifies.
  async publishReview(event) {
    return this.executeAuthenticated(event, async (userId) =>
      this.jsonResponse(200, await this.service.publishReview(userId, this.getPathParameter(event, "id"))));
  }

  // Delete a review owned by the caller.
  // This preserves the soft-delete flow while keeping the route consistent with the service contract.
  async deleteReview(event) {
    return this.executeAuthenticated(event, async (userId) => {
      const reviewId = event.pathParameters?.id ?? event.pathParameters?.reviewId ?? event.queryStringParameters?.reviewId;
      await this.service.deleteReview(userId, reviewId);
      return { statusCode: 204, headers: responseHeaders, body: "" };
    });
  }

  // Retain existing direct callers while index uses the individual route methods.
  async manageReviews(event) {
    if (event.httpMethod === "GET") return event.pathParameters?.id !== undefined
      ? this.getReviewById(event) : this.getReviews(event);
    if (event.httpMethod === "PATCH") return this.updateReview(event);
    if (event.httpMethod === "DELETE") return this.deleteReview(event);
    return this.jsonResponse(405, { message: "Method not supported." });
  }

  // Retain compatibility with direct callers of the public property review method.
  async getPublicPropertyReviews(event) {
    return this.getPropertyReviews(event);
  }

  // Hide unexpected failure details because they may expose internal implementation data.
  // Preserve actionable client errors so callers can correct invalid requests.
  handleError(error) {
    const statusCode = Number.isInteger(error?.statusCode) && error.statusCode >= 400 && error.statusCode <= 599
      ? error.statusCode : 500;
    if (statusCode >= 500) console.error("ReviewSystem request failed:", error);
    return this.jsonResponse(statusCode, {
      message: statusCode >= 500 ? "Something went wrong, please contact support." : error?.message || "Request failed",
    });
  }
}
