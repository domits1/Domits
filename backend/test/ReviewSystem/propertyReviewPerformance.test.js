jest.mock("../../functions/ReviewSystem/data/reviewRepository.js", () => ({ ReviewRepository: jest.fn() }));
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";
import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";

describe("property review performance controller/service", () => {
  let repository, controller;
  const event = (query = {}) => ({ httpMethod: "GET", resource: "/reviews",
    requestContext: { authorizer: { claims: { sub: "user-sub", "cognito:username": "host-1" } } },
    queryStringParameters: { scope: "property-performance", propertyId: "property-1",
      startDate: "2026-01-15", endDate: "2026-03-10", ...query } });
  beforeEach(() => {
    repository = { findManagedProperty: jest.fn().mockResolvedValue({ id: "property-1" }),
      getPropertyReviewPerformance: jest.fn().mockResolvedValue([
        { period: "2026-03-01", average_score: "4", review_count: "1" },
        { period: "2026-01-01", average_score: "4.5", review_count: "2" },
      ]) };
    controller = new Controller({ service: new ReviewService({ repository }) });
  });
  test("returns chronological numeric chart points and fills empty months", async () => {
    const response = await controller.manageReviews(event());
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ property_id: "property-1", interval: "month",
      timezone: "UTC", start_date: "2026-01-15", end_date: "2026-03-10", periods: [
        { period: "2026-01-01", average_score: 4.5, review_count: 2 },
        { period: "2026-02-01", average_score: null, review_count: 0 },
        { period: "2026-03-01", average_score: 4, review_count: 1 },
      ] });
  });
  test("uses the selected property, trusted owner and exact inclusive date bounds", async () => {
    await controller.manageReviews(event({ propertyId: " property-1 ", hostId: "spoofed" }));
    expect(repository.findManagedProperty).toHaveBeenCalledWith("property-1", "host-1");
    expect(repository.getPropertyReviewPerformance).toHaveBeenCalledWith("property-1", "host-1",
      Date.parse("2026-01-15T00:00:00Z"), Date.parse("2026-03-11T00:00:00Z"), "month");
  });
  test("returns null scores and zero counts when there are no reviews", async () => {
    repository.getPropertyReviewPerformance.mockResolvedValue([]);
    const response = await controller.manageReviews(event());
    expect(JSON.parse(response.body).periods).toEqual([
      { period: "2026-01-01", average_score: null, review_count: 0 },
      { period: "2026-02-01", average_score: null, review_count: 0 },
      { period: "2026-03-01", average_score: null, review_count: 0 },
    ]);
  });
  test("supports a single-day leap-year range", async () => {
    const response = await controller.manageReviews(event({ startDate: "2024-02-29", endDate: "2024-02-29" }));
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).periods).toHaveLength(1);
    expect(repository.getPropertyReviewPerformance).toHaveBeenCalledWith("property-1", "host-1",
      Date.parse("2024-02-29T00:00:00Z"), Date.parse("2024-03-01T00:00:00Z"), "month");
  });
  test("fills months across year boundaries", async () => {
    repository.getPropertyReviewPerformance.mockResolvedValue([]);
    const response = await controller.manageReviews(event({ startDate: "2025-12-31", endDate: "2026-01-01" }));
    expect(JSON.parse(response.body).periods.map((point) => point.period)).toEqual(["2025-12-01", "2026-01-01"]);
  });
  test.each([
    ["week", "2025-12-31", "2026-01-08", ["2025-12-29", "2026-01-05"]],
    ["year", "2024-06-01", "2026-02-01", ["2024-01-01", "2025-01-01", "2026-01-01"]],
  ])("fills chronological %s buckets", async (interval, startDate, endDate, expected) => {
    repository.getPropertyReviewPerformance.mockResolvedValue([]);
    const response = await controller.manageReviews(event({ interval, startDate, endDate }));
    const result = JSON.parse(response.body);
    expect(response.statusCode).toBe(200);
    expect(result.interval).toBe(interval);
    expect(result.periods.map((point) => point.period)).toEqual(expected);
    expect(result.periods.every((point) => point.average_score === null && point.review_count === 0)).toBe(true);
    expect(repository.getPropertyReviewPerformance).toHaveBeenCalledWith("property-1", "host-1",
      Date.parse(`${startDate}T00:00:00Z`), Date.parse(`${endDate}T00:00:00Z`) + 86400000, interval);
  });
  test.each([
    { startDate: undefined }, { endDate: undefined }, { startDate: "2026-02-30" },
    { startDate: "2025-02-29" }, { startDate: "15-01-2026" }, { startDate: [] },
    { endDate: "2026-13-01" }, { endDate: null }, { startDate: "2026-01-01T00:00:00Z" },
    { startDate: "2026-04-01", endDate: "2026-03-01" },
    { startDate: "2010-01-01", endDate: "2026-01-01" }, { interval: "day" }, { propertyId: "" },
  ])("rejects invalid input: %j", async (query) => {
    expect((await controller.manageReviews(event(query))).statusCode).toBe(400);
    expect(repository.getPropertyReviewPerformance).not.toHaveBeenCalled();
  });
  test("rejects unauthenticated requests before repository access", async () => {
    const request = event();
    delete request.requestContext;
    expect((await controller.manageReviews(request)).statusCode).toBe(401);
    expect(repository.findManagedProperty).not.toHaveBeenCalled();
  });
  test("requires a verified manager identity", async () => {
    const request = event();
    delete request.requestContext.authorizer.claims["cognito:username"];
    expect((await controller.manageReviews(request)).statusCode).toBe(401);
    expect(repository.getPropertyReviewPerformance).not.toHaveBeenCalled();
  });
  test("rejects inaccessible properties before aggregation", async () => {
    repository.findManagedProperty.mockResolvedValue(null);
    expect((await controller.manageReviews(event())).statusCode).toBe(404);
    expect(repository.getPropertyReviewPerformance).not.toHaveBeenCalled();
  });
  test("rejects combining aggregate and individual review requests", async () => {
    expect((await controller.manageReviews(event({ reviewId: "r1" }))).statusCode).toBe(400);
    expect(repository.getPropertyReviewPerformance).not.toHaveBeenCalled();
  });
  test("hides internal database failures", async () => {
    repository.getPropertyReviewPerformance.mockRejectedValue(new Error("database credentials"));
    const response = await controller.manageReviews(event());
    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain("credentials");
  });
});
