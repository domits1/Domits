jest.mock("../../functions/ReviewSystem/controller/controller.js", () => ({
  Controller: jest.fn(() => ({ createReview: jest.fn(async () => ({ statusCode: 201 })) })),
}));

import { handler } from "../../functions/ReviewSystem/index.js";
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";

it("routes POST /reviews to authenticated review creation", async () => {
  const event = { httpMethod: "POST", resource: "/reviews" };
  expect((await handler(event)).statusCode).toBe(201);
  expect(Controller.mock.results[0].value.createReview).toHaveBeenCalledWith(event);
});

// This foundation branch does not implement downstream dashboard, editing or response routes.
it.each([
  { httpMethod: "GET", resource: "/reviews" },
  { httpMethod: "GET", resource: "/reviews/{id}" },
  { httpMethod: "PATCH", resource: "/reviews/{id}" },
  { httpMethod: "DELETE", resource: "/reviews/{id}" },
  { httpMethod: "GET", resource: "/properties/{propertyId}/reviews" },
  { httpMethod: "POST", resource: "/reviews/{id}/response" },
  { httpMethod: "POST", resource: "/ReviewSystem" },
])("keeps unsupported foundation routes rejected: %p", async (event) => {
  expect((await handler(event)).statusCode).toBe(405);
});

it("allows preflight requests", async () => {
  expect((await handler({ httpMethod: "OPTIONS", resource: "/reviews" })).statusCode).toBe(200);
});
