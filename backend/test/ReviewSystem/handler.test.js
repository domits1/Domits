jest.mock("../../functions/ReviewSystem/controller/controller.js", () => ({
  Controller: jest.fn(() => ({
    createReview: jest.fn(async () => ({ statusCode: 201 })),
    getPublicReviews: jest.fn(async () => ({ statusCode: 200 })),
    manageReviews: jest.fn(async (event) => ({ statusCode: event.httpMethod === "DELETE" ? 204 : 200 })),
  })),
}));

import { handler } from "../../functions/ReviewSystem/index.js";
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";

it("routes anonymous public listing reviews separately", async () => {
  const event = { httpMethod: "GET", resource: "/properties/{propertyId}/reviews", pathParameters: { propertyId: "p1" } };
  expect((await handler(event)).statusCode).toBe(200);
  expect(Controller.mock.results[0].value.getPublicReviews).toHaveBeenCalledWith(event);
});

it.each([["POST", 201], ["GET", 200], ["PATCH", 200]])(
  "routes %s reviews to the controller", async (httpMethod, statusCode) => {
    const event = { httpMethod, resource: httpMethod === "PATCH" ? "/reviews/{id}" : "/reviews",
      pathParameters: { id: "r1" } };
    expect((await handler(event)).statusCode).toBe(statusCode);
    const controller = Controller.mock.results[0].value;
    expect(httpMethod === "POST" ? controller.createReview : controller.manageReviews)
      .toHaveBeenCalledWith(event);
  }
);

it.each([
  { httpMethod: "PUT", resource: "/reviews" },
  { httpMethod: "GET", resource: "/other" },
  { httpMethod: "GET", resource: "/reviews/public" },
  { httpMethod: "PATCH", resource: "/reviews" },
  { httpMethod: "DELETE", resource: "/reviews/{id}" },
])("rejects unsupported routes: %p", async (event) => {
  expect((await handler(event)).statusCode).toBe(405);
});

it("allows preflight requests", async () => {
  expect((await handler({ httpMethod: "OPTIONS", resource: "/reviews" })).statusCode).toBe(200);
});

it("routes individual review reads", async () => {
  const event = { httpMethod: "GET", resource: "/reviews/{id}", pathParameters: { id: "r1" } };
  expect((await handler(event)).statusCode).toBe(200);
  expect(Controller.mock.results[0].value.manageReviews).toHaveBeenCalledWith(event);
});
