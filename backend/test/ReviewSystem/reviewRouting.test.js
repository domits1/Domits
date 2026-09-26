import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { handler } from "../../functions/ReviewSystem/index.js";

const mockCreateController = () => ({
  options: jest.fn(() => ({ statusCode: 200, headers: {}, body: "" })),
  get: jest.fn(() => ({ statusCode: 200, headers: {}, body: JSON.stringify({ route: "list" }) })),
  getById: jest.fn(() => ({ statusCode: 200, headers: {}, body: JSON.stringify({ route: "detail" }) })),
  create: jest.fn(() => ({ statusCode: 201, headers: {}, body: JSON.stringify({ route: "create" }) })),
  update: jest.fn(() => ({ statusCode: 200, headers: {}, body: JSON.stringify({ route: "update" }) })),
});

let mockController;

jest.mock("../../functions/ReviewSystem/controller/reviewController.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => {
    mockController = mockCreateController();
    return mockController;
  }),
}));

describe("ReviewSystem routing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("routes POST /reviews to create", async () => {
    const response = await handler({ httpMethod: "POST", path: "/reviews" });

    expect(response.statusCode).toBe(201);
    expect(mockController.create).toHaveBeenCalledWith(expect.objectContaining({ path: "/reviews" }));
  });

  it("routes GET /reviews to list", async () => {
    const response = await handler({ httpMethod: "GET", path: "/reviews" });

    expect(response.statusCode).toBe(200);
    expect(mockController.get).toHaveBeenCalledWith(expect.objectContaining({ path: "/reviews" }));
  });

  it("routes GET /reviews/:id to getById with path parameter", async () => {
    const response = await handler({ httpMethod: "GET", path: "/reviews/review-1" });

    expect(response.statusCode).toBe(200);
    expect(mockController.getById).toHaveBeenCalledWith(
      expect.objectContaining({
        pathParameters: expect.objectContaining({ id: "review-1" }),
      })
    );
  });

  it("routes PATCH /reviews/:id to update with path parameter", async () => {
    const response = await handler({ httpMethod: "PATCH", path: "/reviews/review-1" });

    expect(response.statusCode).toBe(200);
    expect(mockController.update).toHaveBeenCalledWith(
      expect.objectContaining({
        pathParameters: expect.objectContaining({ id: "review-1" }),
      })
    );
  });

  it("returns CORS response for OPTIONS", async () => {
    const response = await handler({ httpMethod: "OPTIONS", path: "/reviews" });

    expect(response.statusCode).toBe(200);
    expect(mockController.options).toHaveBeenCalled();
  });

  it("returns 404 for unsupported review routes", async () => {
    const response = await handler({ httpMethod: "DELETE", path: "/reviews/review-1" });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({ message: "Route not found." });
  });
});
