jest.mock("../../functions/ReviewSystem/data/reviewRepository.js", () => ({ ReviewRepository: jest.fn() }));
jest.mock("../../functions/ReviewSystem/auth/authManager.js", () => ({ AuthManager: jest.fn() }));
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";
import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";

describe("property overall score controller/service integration", () => {
  let repository, authManager, controller;
  const event = (query = {}, headers = { Authorization: "token" }) => ({
    httpMethod: "GET", headers,
    queryStringParameters: { scope: "property-score", propertyId: "property-1", ...query },
  });
  beforeEach(() => {
    repository = {
      findManagedProperty: jest.fn().mockResolvedValue({ id: "property-1" }),
      getPropertyReviewScore: jest.fn().mockResolvedValue({
        property_id: "property-1", overall_score: 4.5, review_count: 2,
      }),
    };
    authManager = { getUser: jest.fn(async (token) => {
      if (!token || token === "expired") throw Object.assign(new Error("Invalid token"), { statusCode: 401 });
      return { userId: "cognito-sub", username: "host-1" };
    }) };
    controller = new Controller({ service: new ReviewService({ repository }), authManager });
  });
  test("returns score/count and ignores spoofed owner identities", async () => {
    const response = await controller.manageReviews(event({ host_id: "other", username: "other" }));
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ property_id: "property-1", overall_score: 4.5, review_count: 2 });
    expect(repository.findManagedProperty).toHaveBeenCalledWith("property-1", "host-1");
    expect(repository.getPropertyReviewScore).toHaveBeenCalledWith("property-1", "host-1");
  });
  test.each(["Authorization", "authorization"])("accepts %s", async (header) => {
    expect((await controller.manageReviews(event({}, { [header]: "token" }))).statusCode).toBe(200);
  });
  test.each([{}, { Authorization: "expired" }])("rejects invalid authentication: %j", async (headers) => {
    expect((await controller.manageReviews(event({}, headers))).statusCode).toBe(401);
    expect(repository.findManagedProperty).not.toHaveBeenCalled();
  });
  test("fails closed without a verified owner identity", async () => {
    authManager.getUser.mockResolvedValue({ userId: "cognito-sub" });
    expect((await controller.manageReviews(event())).statusCode).toBe(401);
    expect(repository.findManagedProperty).not.toHaveBeenCalled();
  });
  test.each([undefined, null, "", " \n ", 42, [], {}])("rejects invalid property ID: %j", async (propertyId) => {
    expect((await controller.manageReviews(event({ propertyId }))).statusCode).toBe(400);
    expect(repository.findManagedProperty).not.toHaveBeenCalled();
  });
  test("trims the property ID", async () => {
    await controller.manageReviews(event({ propertyId: " property-1 " }));
    expect(repository.findManagedProperty).toHaveBeenCalledWith("property-1", "host-1");
  });
  test("does not retrieve reviews for inaccessible or missing properties", async () => {
    repository.findManagedProperty.mockResolvedValue(null);
    expect((await controller.manageReviews(event())).statusCode).toBe(404);
    expect(repository.getPropertyReviewScore).not.toHaveBeenCalled();
  });
  test("returns no score for zero eligible reviews", async () => {
    repository.getPropertyReviewScore.mockResolvedValue({ property_id: "property-1", overall_score: null, review_count: 0 });
    const response = await controller.manageReviews(event());
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ property_id: "property-1", overall_score: null, review_count: 0 });
  });
  test("retrieves a fresh score on subsequent requests", async () => {
    const first = await controller.manageReviews(event());
    repository.getPropertyReviewScore.mockResolvedValue({ property_id: "property-1", overall_score: 4, review_count: 3 });
    const second = await controller.manageReviews(event());
    expect(JSON.parse(first.body).review_count).toBe(2);
    expect(JSON.parse(second.body)).toEqual({ property_id: "property-1", overall_score: 4, review_count: 3 });
    expect(repository.getPropertyReviewScore).toHaveBeenCalledTimes(2);
  });
  test("rejects an ambiguous individual-review request", async () => {
    expect((await controller.manageReviews(event({ reviewId: "review-1" }))).statusCode).toBe(400);
    expect(repository.findManagedProperty).not.toHaveBeenCalled();
  });
  test("hides internal failures", async () => {
    repository.getPropertyReviewScore.mockRejectedValue(new Error("Database credentials"));
    const response = await controller.manageReviews(event());
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toBe("Something went wrong, please contact support.");
  });
});
