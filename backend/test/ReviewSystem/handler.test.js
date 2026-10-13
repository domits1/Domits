jest.mock("../../functions/ReviewSystem/controller/controller.js", () => ({
  Controller: jest.fn(() => ({
    createReview: jest.fn(async () => ({ statusCode: 201 })),
    manageReviews: jest.fn(async () => ({ statusCode: 200 })),
    getPublicPropertyReviews: jest.fn(async () => ({ statusCode: 200 })),
  })),
}));

import { handler } from "../../functions/ReviewSystem/index.js";
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";

it("routes POST /reviews to authenticated review creation", async () => {
  const event = { httpMethod: "POST", resource: "/reviews" };
  expect((await handler(event)).statusCode).toBe(201);
  expect(Controller.mock.results[0].value.createReview).toHaveBeenCalledWith(event);
});

it.each([
  { httpMethod: "GET", resource: "/reviews" },
  { httpMethod: "DELETE", resource: "/reviews/{id}" },
  { httpMethod: "GET", resource: "/properties/{propertyId}/reviews" },
])("routes supported review operations: %p", async (event) => {
  expect((await handler(event)).statusCode).toBe(200);
  const action = event.resource.startsWith("/properties/")
    ? "getPublicPropertyReviews" : "manageReviews";
  expect(Controller.mock.results[0].value[action]).toHaveBeenCalledWith(event);
});

it.each([
  { httpMethod: "GET", resource: "/reviews/{id}" },
  { httpMethod: "PATCH", resource: "/reviews/{id}" },
  { httpMethod: "POST", resource: "/reviews/{id}/response" },
  { httpMethod: "POST", resource: "/ReviewSystem" },
])("keeps unsupported foundation routes rejected: %p", async (event) => {
  expect((await handler(event)).statusCode).toBe(405);
});

it("allows preflight requests", async () => {
  expect((await handler({ httpMethod: "OPTIONS", resource: "/reviews" })).statusCode).toBe(200);
});
