import { AuthManager } from "../auth/authManager.js";
import { ReviewService } from "../business/service/reviewService.js";
import { BadRequestException } from "../util/exception/badRequestException.js";
import { UnauthorizedException } from "../util/exception/unauthorizedException.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

const parseBody = (body, isBase64Encoded = false) => {
  let parsedBody;

  try {
    if (typeof body !== "string" || !body.trim()) {
      throw new Error("Missing request body");
    }
    const jsonBody = isBase64Encoded ? Buffer.from(body, "base64").toString("utf8") : body;
    parsedBody = JSON.parse(jsonBody);
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
      const authenticatedUser = await this.authManager.getUser(event);
      if (typeof authenticatedUser?.userId !== "string" || !authenticatedUser.userId.trim()) {
        throw new UnauthorizedException("Verified authorization context is required.");
      }
      const reviewData = parseBody(event.body, event.isBase64Encoded === true);
      const result = await this.service.createReview(authenticatedUser.userId, reviewData);

      return { statusCode: 201, headers: responseHeaders, body: JSON.stringify(result) };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Hide unexpected failure details because they may expose internal implementation data.
  // Preserve actionable client errors so callers can correct invalid requests.
  handleError(error) {
    const statusCode = Number.isInteger(error?.statusCode) && error.statusCode >= 400 && error.statusCode <= 599
      ? error.statusCode : 500;
    if (statusCode >= 500) console.error("Review creation failed:", error);
    const message = statusCode >= 500 ? "Something went wrong, please contact support." : error?.message || "Request failed";

    return {
      statusCode,
      headers: responseHeaders,
      body: JSON.stringify({ message }),
    };
  }
}
