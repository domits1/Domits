jest.mock("../../functions/ReviewSystem/data/reviewRepository.js", () => ({ ReviewRepository: jest.fn() }));
import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";

describe("property rating trends", () => {
  let repository, service, originalThreshold, originalMinimum;
  const query = { endDate: "2026-10-06", days: "30" };
  const scores = (previous, current, previousCount = 3, currentCount = 3) => {
    repository.getPropertyRatingTrendPage.mockResolvedValue([{ property_id: "p1",
      previous_average_rating: previous, current_average_rating: current,
      previous_review_count: previousCount, current_review_count: currentCount }]);
  };
  beforeEach(() => {
    originalThreshold = process.env.REVIEW_DECLINE_THRESHOLD;
    originalMinimum = process.env.REVIEW_TREND_MIN_REVIEWS;
    process.env.REVIEW_DECLINE_THRESHOLD = "0.5";
    process.env.REVIEW_TREND_MIN_REVIEWS = "3";
    repository = { getPropertyRatingTrendPage: jest.fn().mockResolvedValue([]) };
    service = new ReviewService({ repository, now: () => Date.parse("2026-10-07T12:00:00Z") });
  });
  afterEach(() => {
    for (const [key, value] of [["REVIEW_DECLINE_THRESHOLD", originalThreshold], ["REVIEW_TREND_MIN_REVIEWS", originalMinimum]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  test.each([[4.5, 4, "DECLINING", -0.5], [4, 4, "STABLE", 0],
    [4, 3.75, "STABLE", -0.25], [4, 4.5, "IMPROVING", 0.5]])(
    "classifies %s to %s as %s", async (previous, current, status, change) => {
      scores(previous, current);
      const result = await service.getPropertyRatingTrends("host-1", query);
      expect(result.properties[0]).toMatchObject({ property_id: "p1", previous_average_rating: previous,
        current_average_rating: current, rating_change: change, previous_review_count: 3,
        current_review_count: 3, trend_status: status });
    });
  test.each([[null, 4, 0, 3], [4, null, 3, 0], [4.5, 3, 2, 3]])(
    "handles insufficient data", async (previous, current, previousCount, currentCount) => {
      scores(previous, current, previousCount, currentCount);
      const result = await service.getPropertyRatingTrends("host-1", query);
      expect(result.properties[0]).toMatchObject({ rating_change: null, trend_status: "INSUFFICIENT_DATA" });
    });
  test("uses equal adjacent windows and ignores spoofed owner/policy parameters", async () => {
    scores(4.5, 4);
    await service.getPropertyRatingTrends("host-1", { ...query, hostId: "spoofed", threshold: 99 });
    expect(repository.getPropertyRatingTrendPage).toHaveBeenCalledWith("host-1", expect.objectContaining({
      previousStart: Date.parse("2026-08-08T00:00:00Z"), currentStart: Date.parse("2026-09-07T00:00:00Z"),
      endExclusive: Date.parse("2026-10-07T00:00:00Z"), threshold: 0.5, minimumReviews: 3,
    }));
  });
  test("returns empty results for managers without matching properties", async () => {
    expect((await service.getPropertyRatingTrends("host-1", query)).properties).toEqual([]);
  });
  test("returns a next offset when the filtered query has another result", async () => {
    repository.getPropertyRatingTrendPage.mockResolvedValue(Array.from({ length: 26 }, (_, index) => ({
      property_id: `p${index}`, previous_average_rating: 4, current_average_rating: 4,
      previous_review_count: 3, current_review_count: 3,
    })));
    const result = await service.getPropertyRatingTrends("host-1", { ...query, offset: "25" });
    expect(result.properties).toHaveLength(25);
    expect(result.next_offset).toBe(50);
    expect(repository.getPropertyRatingTrendPage).toHaveBeenCalledTimes(1);
  });
  test("passes validated filter and ordering into the database page query", async () => {
    await service.getPropertyRatingTrends("host-1", { ...query, status: "DECLINING", sort: "declining-first" });
    expect(repository.getPropertyRatingTrendPage).toHaveBeenCalledWith("host-1", expect.objectContaining({
      status: "DECLINING", sort: "declining-first", offset: 0,
    }));
  });
  test("handles decimal threshold boundaries", async () => {
    process.env.REVIEW_DECLINE_THRESHOLD = "0.3";
    scores(4.3, 4);
    expect((await service.getPropertyRatingTrends("host-1", query)).properties[0].trend_status).toBe("DECLINING");
  });
  test.each([{ days: "0" }, { days: "367" }, { days: "1.5" }, { offset: "-1" }, { offset: [] },
    { endDate: "2026-02-30" }, { endDate: "2026-10-07" }, { endDate: null }, { status: "unknown" }, { sort: "unknown" }, { status: [] }])("rejects invalid input %j", async (invalid) => {
    await expect(service.getPropertyRatingTrends("host-1", { ...query, ...invalid })).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.getPropertyRatingTrendPage).not.toHaveBeenCalled();
  });
  test.each([undefined, "", "0", "5", "NaN"])("fails closed for invalid policy %j", async (value) => {
    if (value === undefined) delete process.env.REVIEW_DECLINE_THRESHOLD; else process.env.REVIEW_DECLINE_THRESHOLD = value;
    await expect(service.getPropertyRatingTrends("host-1", query)).rejects.toThrow("not configured");
    expect(repository.getPropertyRatingTrendPage).not.toHaveBeenCalled();
  });
  test("controller rejects unauthenticated requests and missing manager identities", async () => {
    const controller = new Controller({ service });
    const request = { httpMethod: "GET", resource: "/reviews", queryStringParameters: { scope: "property-trends", ...query } };
    expect((await controller.manageReviews(request)).statusCode).toBe(401);
    request.requestContext = { authorizer: { claims: { sub: "user-sub" } } };
    expect((await controller.manageReviews(request)).statusCode).toBe(401);
    expect(repository.getPropertyRatingTrendPage).not.toHaveBeenCalled();
  });
  test("routes authenticated requests and hides configuration failures", async () => {
    const controller = new Controller({ service });
    const request = { httpMethod: "GET", resource: "/reviews", queryStringParameters: { scope: "property-trends", ...query },
      requestContext: { authorizer: { claims: { sub: "user-sub", "cognito:username": "host-1" } } } };
    scores(4.5, 4);
    expect((await controller.manageReviews(request)).statusCode).toBe(200);
    delete process.env.REVIEW_DECLINE_THRESHOLD;
    const failure = await controller.manageReviews(request);
    expect(failure.statusCode).toBe(500);
    expect(failure.body).not.toContain("policy");
  });
});
