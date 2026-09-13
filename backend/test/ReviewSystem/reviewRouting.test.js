import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const createController = () => ({
  options: jest.fn(() => ({ statusCode: 200, headers: {}, body: "" })),
  get: jest.fn(() => ({ statusCode: 200, headers: {}, body: JSON.stringify({ route: "list" }) })),
  getById: jest.fn(() => ({ statusCode: 200, headers: {}, body: JSON.stringify({ route: "detail" }) })),
  create: jest.fn(() => ({ statusCode: 201, headers: {}, body: JSON.stringify({ route: "create" }) })),
  update: jest.fn(() => ({ statusCode: 200, headers: {}, body: JSON.stringify({ route: "update" }) })),
});

let controller;

jest.unstable_mockModule("../../functions/ReviewSystem/controller/reviewController.js", () => ({
  default: jest.fn().mockImplementation(() => {
    controller = createController();
    return controller;
  }),
}));

const { handler } = await import("../../functions/ReviewSystem/index.js");

describe("ReviewSystem routing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("routes POST /reviews to create", async () => {
    const response = await handler({ httpMethod: "POST", path: "/reviews" });

    expect(response.statusCode).toBe(201);
    expect(controller.create).toHaveBeenCalledWith(expect.objectContaining({ path: "/reviews" }));
  });

  it("routes GET /reviews to list", async () => {
    const response = await handler({ httpMethod: "GET", path: "/reviews" });

    expect(response.statusCode).toBe(200);
    expect(controller.get).toHaveBeenCalledWith(expect.objectContaining({ path: "/reviews" }));
  });

  it("routes GET /reviews/:id to getById with path parameter", async () => {
    const response = await handler({ httpMethod: "GET", path: "/reviews/review-1" });

    expect(response.statusCode).toBe(200);
    expect(controller.getById).toHaveBeenCalledWith(
      expect.objectContaining({
        pathParameters: expect.objectContaining({ id: "review-1" }),
      })
    );
  });

  it("routes PATCH /reviews/:id to update with path parameter", async () => {
    const response = await handler({ httpMethod: "PATCH", path: "/reviews/review-1" });

    expect(response.statusCode).toBe(200);
    expect(controller.update).toHaveBeenCalledWith(
      expect.objectContaining({
        pathParameters: expect.objectContaining({ id: "review-1" }),
      })
    );
  });

  it("returns CORS response for OPTIONS", async () => {
    const response = await handler({ httpMethod: "OPTIONS", path: "/reviews" });

    expect(response.statusCode).toBe(200);
    expect(controller.options).toHaveBeenCalled();
  });

  it("returns 404 for unsupported review routes", async () => {
    const response = await handler({ httpMethod: "DELETE", path: "/reviews/review-1" });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({ message: "Route not found." });
  });
});
