import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { handler } from "../../functions/ReviewSystem/index.js";

const mockCreateController = () => ({
  options: jest.fn(() => ({ statusCode: 200, headers: {}, body: "" })),
  get: jest.fn(() => ({ statusCode: 200, headers: {}, body: JSON.stringify({ route: "list" }) })),
  getById: jest.fn(() => ({ statusCode: 200, headers: {}, body: JSON.stringify({ route: "detail" }) })),
  getDomitsPrivateFeedback: jest.fn(() => ({
    statusCode: 200,
    headers: {},
    body: JSON.stringify({ route: "domits-private-feedback" }),
  })),
  create: jest.fn(() => ({ statusCode: 201, headers: {}, body: JSON.stringify({ route: "create" }) })),
  update: jest.fn(() => ({ statusCode: 200, headers: {}, body: JSON.stringify({ route: "update" }) })),
  saveDraftResponse: jest.fn(() => ({ statusCode: 200, headers: {}, body: JSON.stringify({ route: "response-draft" }) })),
  publishResponse: jest.fn(() => ({ statusCode: 200, headers: {}, body: JSON.stringify({ route: "response-publish" }) })),
  editResponse: jest.fn(() => ({ statusCode: 200, headers: {}, body: JSON.stringify({ route: "response-edit" }) })),
  deleteResponse: jest.fn(() => ({ statusCode: 200, headers: {}, body: JSON.stringify({ route: "response-delete" }) })),
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

  it("routes GET /properties/:propertyId/reviews to list with path parameter", async () => {
    const response = await handler({ httpMethod: "GET", path: "/properties/property-1/reviews" });

    expect(response.statusCode).toBe(200);
    expect(mockController.get).toHaveBeenCalledWith(
      expect.objectContaining({
        pathParameters: expect.objectContaining({ propertyId: "property-1" }),
      })
    );
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

  it("routes GET /reviews/:id/domits-private-feedback to internal feedback", async () => {
    const response = await handler({ httpMethod: "GET", path: "/reviews/review-1/domits-private-feedback" });

    expect(response.statusCode).toBe(200);
    expect(mockController.getDomitsPrivateFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        pathParameters: expect.objectContaining({ id: "review-1" }),
      })
    );
    expect(mockController.getById).not.toHaveBeenCalled();
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

  it("routes POST /reviews/:id/response to save response draft", async () => {
    const response = await handler({ httpMethod: "POST", path: "/reviews/review-1/response" });

    expect(response.statusCode).toBe(200);
    expect(mockController.saveDraftResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        pathParameters: expect.objectContaining({ id: "review-1" }),
      })
    );
  });

  it("routes POST /reviews/:id/response/publish to publish response", async () => {
    const response = await handler({ httpMethod: "POST", path: "/reviews/review-1/response/publish" });

    expect(response.statusCode).toBe(200);
    expect(mockController.publishResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        pathParameters: expect.objectContaining({ id: "review-1" }),
      })
    );
  });

  it("routes PATCH /reviews/:id/response to edit response", async () => {
    const response = await handler({ httpMethod: "PATCH", path: "/reviews/review-1/response" });

    expect(response.statusCode).toBe(200);
    expect(mockController.editResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        pathParameters: expect.objectContaining({ id: "review-1" }),
      })
    );
  });

  it("routes DELETE /reviews/:id/response to delete response", async () => {
    const response = await handler({ httpMethod: "DELETE", path: "/reviews/review-1/response" });

    expect(response.statusCode).toBe(200);
    expect(mockController.deleteResponse).toHaveBeenCalledWith(
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
