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

const pendingRoutes = [
  ["GET", "/reviews", "getReviews"],
  ["GET", "/reviews/{id}", "getReviewById"],
  ["PATCH", "/reviews/{id}", "updateReview"],
  ["GET", "/properties/{propertyId}/reviews", "getPropertyReviews"],
  ["GET", "/reviews/{id}/domits-private-feedback", "getPrivateFeedback"],
  ["POST", "/reviews/{id}/response", "createReviewResponse"],
  ["PATCH", "/reviews/{id}/response", "updateReviewResponse"],
  ["DELETE", "/reviews/{id}/response", "deleteReviewResponse"],
  ["POST", "/reviews/{id}/publish", "publishReview"],
];

it.each(pendingRoutes)("recognizes pending %s %s without exposing implementation details", async (httpMethod, resource, action) => {
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    const response = await handler({ httpMethod, resource });
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({ message: "Internal Server Error" });
    expect(log).toHaveBeenCalledWith("ReviewSystem controller method is not implemented:", action);
  } finally {
    log.mockRestore();
  }
});

it.each(pendingRoutes)("dispatches %s %s when its controller implementation is available", async (httpMethod, resource, action) => {
  await handler({ httpMethod: "POST", resource: "/reviews" });
  const instance = Controller.mock.results[0].value;
  const result = { statusCode: 200, headers: { "X-Test": "preserved" }, body: "[]" };
  instance[action] = jest.fn().mockResolvedValue(result);
  const event = { httpMethod, resource };
  try {
    const response = await handler(event);
    expect(instance[action]).toHaveBeenCalledWith(event);
    expect(response).toMatchObject(result);
    expect(response.headers["Access-Control-Allow-Methods"]).toBe("GET,POST,PATCH,DELETE,OPTIONS");
  } finally {
    delete instance[action];
  }
});

it("rejects unsupported methods with Allow and unknown resources with 404", async () => {
  const response = await handler({ httpMethod: "DELETE", resource: "/reviews/{id}" });
  expect(response.statusCode).toBe(405);
  expect(response.headers.Allow).toBe("GET,PATCH,OPTIONS");
  expect((await handler({ httpMethod: "POST", resource: "/ReviewSystem" })).statusCode).toBe(404);
});

it("allows preflight requests", async () => {
  const response = await handler({ httpMethod: "OPTIONS", resource: "/reviews" });
  expect(response.statusCode).toBe(200);
  expect(response.body).toBe("");
  expect(response.headers["Access-Control-Allow-Methods"]).toBe("GET,POST,OPTIONS");
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
