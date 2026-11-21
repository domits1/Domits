const routeCases = [
  ["GET", "/reviews", "getReviews", 200],
  ["POST", "/reviews", "createReview", 201],
  ["PATCH", "/reviews", "updateReview", 200],
  ["GET", "/reviews/{id}", "getReviewById", 200],
  ["PATCH", "/reviews/{id}", "updateReview", 200],
  ["DELETE", "/reviews/{id}", "deleteReview", 204],
  ["GET", "/properties/{propertyId}/reviews", "getPublicReviews", 200],
  ["GET", "/reviews/{id}/domits-private-feedback", "getDomitsPrivateFeedback", 200],
  ["GET", "/reviews/{id}/private-feedback", "getPrivateFeedback", 200],
  ["POST", "/reviews/{id}/response", "saveHostResponse", 200],
  ["PATCH", "/reviews/{id}/response", "saveHostResponse", 200],
  ["POST", "/reviews/{id}/response/publish", "saveHostResponse", 200],
  ["DELETE", "/reviews/{id}/response", "deleteReviewResponse", 204],
  ["POST", "/reviews/{id}/publish", "publishReview", 200],
];

jest.mock("../../functions/ReviewSystem/controller/controller.js", () => ({
  Controller: jest.fn(() => ({})),
}));

import { handler } from "../../functions/ReviewSystem/index.js";
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";

it.each(routeCases)("dispatches %s %s with the complete controller response", async (httpMethod, resource, action, statusCode) => {
  // Initialize the cached controller without relying on test execution order.
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    await handler({ httpMethod: "POST", resource: "/reviews" });
    const instance = Controller.mock.results[0].value;
    const result = { statusCode, headers: { "X-Test": "preserved" }, body: statusCode === 204 ? "" : "[]" };
    instance[action] = jest.fn().mockResolvedValue(result);
    const event = { httpMethod, resource };
    try {
      expect(await handler(event)).toMatchObject(result);
      expect(instance[action]).toHaveBeenCalledWith(event);
    } finally {
      delete instance[action];
    }
  } finally {
    log.mockRestore();
  }
});

it("returns a safe failure if a controller route disappears", async () => {
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    const response = await handler({ httpMethod: "GET", resource: "/reviews" });
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({ message: "Internal Server Error" });
  } finally {
    log.mockRestore();
  }
});

it("rejects unsupported methods with Allow and unknown resources with 404", async () => {
  const response = await handler({ httpMethod: "PUT", resource: "/reviews/{id}" });
  expect(response.statusCode).toBe(405);
  expect(response.headers.Allow).toBe("GET,PATCH,DELETE,OPTIONS");
  expect((await handler({ httpMethod: "POST", resource: "/ReviewSystem" })).statusCode).toBe(404);
});

it("allows resource-specific preflight requests without invoking controller actions", async () => {
  const response = await handler({ httpMethod: "OPTIONS", resource: "/reviews/{id}/response" });
  expect(response.statusCode).toBe(200);
  expect(response.body).toBe("");
  expect(response.headers["Access-Control-Allow-Methods"]).toBe("POST,PATCH,DELETE,OPTIONS");
});
