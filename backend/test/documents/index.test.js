const mockGetUploadUrl = jest.fn();

jest.mock("../../functions/documents/controller/controller.js", () => ({
  Controller: jest.fn().mockImplementation(() => ({ getUploadUrl: mockGetUploadUrl })),
}));

import { handler } from "../../functions/documents/index.js";

const CONTROLLER_ANSWER = Object.freeze({ statusCode: 200, headers: {}, body: "{}" });

const eventOf = (httpMethod, query) => ({ httpMethod, headers: { Authorization: "access-token-1" }, queryStringParameters: query });

beforeEach(() => {
  mockGetUploadUrl.mockReset();
  mockGetUploadUrl.mockResolvedValue(CONTROLLER_ANSWER);
});

afterEach(() => jest.restoreAllMocks());

describe("the documents router", () => {
  it("sends GET ?action=upload-url to the controller with the whole event", async () => {
    const event = eventOf("GET", { action: "upload-url", fileType: "application/pdf", fileSize: "4096" });

    await expect(handler(event)).resolves.toBe(CONTROLLER_ANSWER);
    expect(mockGetUploadUrl).toHaveBeenCalledWith(event);
  });

  it("answers the CORS preflight itself, for any query", async () => {
    const response = await handler(eventOf("OPTIONS", { action: "anything" }));

    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    });
    expect(mockGetUploadUrl).not.toHaveBeenCalled();
  });

  test.each([
    ["GET without an action", "GET", null],
    ["GET with an unknown action", "GET", { action: "view-url" }],
    ["GET with an inherited property as action", "GET", { action: "toString" }],
    ["POST upload-url", "POST", { action: "upload-url" }],
    ["PUT upload-url", "PUT", { action: "upload-url" }],
    ["PATCH upload-url", "PATCH", { action: "upload-url" }],
    ["DELETE upload-url", "DELETE", { action: "upload-url" }],
    ["an inherited property as method", "constructor", { action: "upload-url" }],
    ["no method", undefined, { action: "upload-url" }],
  ])("answers 405 to %s without calling the controller", async (_label, httpMethod, query) => {
    const response = await handler(eventOf(httpMethod, query));

    expect(response.statusCode).toBe(405);
    expect(JSON.parse(response.body)).toEqual({ message: "Method not allowed." });
    expect(response.headers).toMatchObject({ "Access-Control-Allow-Origin": "*" });
    expect(mockGetUploadUrl).not.toHaveBeenCalled();
  });

  it("logs an unexpected failure and answers only the generic message", async () => {
    const failure = new Error("connection reset by peer");
    mockGetUploadUrl.mockRejectedValue(failure);
    const log = jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await handler(eventOf("GET", { action: "upload-url" }));

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({ message: "Something went wrong, please contact support." });
    expect(log).toHaveBeenCalledWith(failure);
  });
});
