import { describe, expect, it, jest } from "@jest/globals";
import ReviewController from "../../functions/ReviewSystem/controller/reviewController.js";

describe("ReviewController", () => {
  it("returns public reviews from the service", async () => {
    const reviewService = {
      getReviews: jest.fn().mockResolvedValue({ reviews: [], totalReviews: 0, overallRating: null }),
    };

    const controller = new ReviewController({ reviewService });
    const event = {
      httpMethod: "GET",
      queryStringParameters: { propertyId: "property-1" },
    };
    const response = await controller.get(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ reviews: [], totalReviews: 0, overallRating: null });
    expect(reviewService.getReviews).toHaveBeenCalledWith(event);
  });

  it("returns one review from the service", async () => {
    const reviewService = {
      getReviewById: jest.fn().mockResolvedValue({ review: { id: "review-1" } }),
    };

    const controller = new ReviewController({ reviewService });
    const event = {
      httpMethod: "GET",
      pathParameters: { id: "review-1" },
    };
    const response = await controller.getById(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ review: { id: "review-1" } });
    expect(reviewService.getReviewById).toHaveBeenCalledWith(event, "review-1");
  });

  it("returns 201 when a review is created", async () => {
    const reviewService = {
      createReview: jest.fn().mockResolvedValue({ review: { id: "review-1" } }),
    };

    const controller = new ReviewController({ reviewService });
    const response = await controller.create({ httpMethod: "POST", body: "{}" });

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body)).toEqual({ review: { id: "review-1" } });
  });

  it("returns updated review from the service", async () => {
    const reviewService = {
      updateReview: jest.fn().mockResolvedValue({ id: "review-1", title: "Updated" }),
    };

    const controller = new ReviewController({ reviewService });
    const event = {
      httpMethod: "PATCH",
      pathParameters: { id: "review-1" },
      body: JSON.stringify({ title: "Updated" }),
    };
    const response = await controller.update(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ id: "review-1", title: "Updated" });
    expect(reviewService.updateReview).toHaveBeenCalledWith(event);
  });

  it("maps service errors to HTTP responses", async () => {
    const error = Object.assign(new Error("Invalid review."), { statusCode: 400 });
    const reviewService = {
      createReview: jest.fn().mockRejectedValue(error),
    };

    const controller = new ReviewController({ reviewService });
    const response = await controller.create({ httpMethod: "POST", body: "{}" });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ message: "Invalid review." });
  });

  it("returns CORS headers for preflight requests", () => {
    const controller = new ReviewController({ reviewService: {} });
    const response = controller.options();

    expect(response.statusCode).toBe(200);
    expect(response.headers["Access-Control-Allow-Headers"]).toContain("Authorization");
  });
});
