jest.mock("../../functions/ReviewSystem/controller/controller.js", () => ({
  Controller: jest.fn(() => ({
    createReview: jest.fn(async () => ({ statusCode: 201 })),
    manageReviews: jest.fn(async () => ({ statusCode: 200 })),
    getPublicPropertyReviews: jest.fn(async () => ({ statusCode: 200 })),
  })),
}));

import { handler } from "../../functions/ReviewSystem/index.js";
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";

<<<<<<< HEAD
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
=======
it.each([["POST", 201], ["GET", 200]])(
  "routes %s reviews to the controller", async (httpMethod, statusCode) => {
    const event = { httpMethod, resource: "/reviews" };
    expect((await handler(event)).statusCode).toBe(statusCode);
    const controller = Controller.mock.results[0].value;
    expect(httpMethod === "POST" ? controller.createReview : controller.manageReviews)
      .toHaveBeenCalledWith(event);
  }
);

it.each([
  { httpMethod: "PUT", resource: "/reviews" },
  { httpMethod: "GET", resource: "/other" },
  { httpMethod: "GET", resource: "/ReviewSystem" },
  { httpMethod: "GET", resource: "/reviews/public" },
  { httpMethod: "GET", resource: "/ReviewSystem/public" },
])("rejects unsupported routes: %p", async (event) => {
>>>>>>> 6b844362778b4f7f14a2467f70ffd7316b3deede
  expect((await handler(event)).statusCode).toBe(405);
});

it("allows preflight requests", async () => {
  expect((await handler({ httpMethod: "OPTIONS", resource: "/reviews" })).statusCode).toBe(200);
});
<<<<<<< HEAD
=======

it.each(["/reviews", "/reviews/{id}"])("routes authenticated deletion at %s", async (resource) => {
  const event = { httpMethod: "DELETE", resource, pathParameters: { id: "review-1" } };
  expect((await handler(event)).statusCode).toBe(204);
  expect(Controller.mock.results[0].value.manageReviews).toHaveBeenCalledWith(event);
});

it("routes the established public property endpoint", async () => {
  const event = { httpMethod: "GET", resource: "/properties/{propertyId}/reviews", pathParameters: { propertyId: "property-1" } };
  expect((await handler(event)).statusCode).toBe(200);
  expect(Controller.mock.results[0].value.getPublicPropertyReviews).toHaveBeenCalledWith(event);
});
>>>>>>> 6b844362778b4f7f14a2467f70ffd7316b3deede
