jest.mock("../../functions/ReviewSystem/data/reviewRepository.js", () => ({ ReviewRepository: jest.fn() }));
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";
import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";

describe("property category ratings controller/service integration", () => {
  let repository, controller;
  const categories = [
    { category_key: "cleanliness", label: "Cleanliness", average_rating: 4.25, rating_count: 2 },
    { category_key: "comfort", label: "Comfort", average_rating: null, rating_count: 0 },
    { category_key: "custom", label: "Custom", average_rating: 3, rating_count: 1 },
  ];
  const request = (query = {}, claims = { sub: "host-sub", "cognito:username": "host-1" }) => ({
    httpMethod: "GET", requestContext: { authorizer: { claims } },
    queryStringParameters: { scope: "property-categories", propertyId: "p1", ...query },
  });
  beforeEach(() => {
    repository = {
      findManagedProperty: jest.fn().mockResolvedValue({ id: "p1" }),
      getPropertyCategoryRatings: jest.fn().mockResolvedValue(categories),
    };
    controller = new Controller({ service: new ReviewService({ repository }) });
  });
  test("returns category-specific averages/counts and ignores spoofed ownership", async () => {
    const result = await controller.manageReviews(request({ host_id: "spoofed" }));
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ property_id: "p1", categories });
    expect(repository.findManagedProperty).toHaveBeenCalledWith("p1", "host-1");
    expect(repository.getPropertyCategoryRatings).toHaveBeenCalledWith("p1", "host-1");
  });
  test.each([undefined, null, "", " ", 42, [], {}])("rejects invalid ID %j", async (propertyId) => {
    expect((await controller.manageReviews(request({ propertyId }))).statusCode).toBe(400);
    expect(repository.findManagedProperty).not.toHaveBeenCalled();
  });
  test.each([{}, { sub: "host-sub" }])("requires verified identity %j", async (claims) => {
    expect((await controller.manageReviews(request({}, claims))).statusCode).toBe(401);
    expect(repository.getPropertyCategoryRatings).not.toHaveBeenCalled();
  });
  test("denies inaccessible properties before retrieving ratings", async () => {
    repository.findManagedProperty.mockResolvedValue(null);
    expect((await controller.manageReviews(request())).statusCode).toBe(404);
    expect(repository.getPropertyCategoryRatings).not.toHaveBeenCalled();
  });
  test("rejects ambiguous requests", async () => {
    expect((await controller.manageReviews(request({ reviewId: "r1" }))).statusCode).toBe(400);
    expect(repository.findManagedProperty).not.toHaveBeenCalled();
  });
  test("handles no configured categories", async () => {
    repository.getPropertyCategoryRatings.mockResolvedValue([]);
    const result = await controller.manageReviews(request());
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ property_id: "p1", categories: [] });
  });
});
