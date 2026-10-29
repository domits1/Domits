const mockController = {
  listOwners: jest.fn(),
  getOwner: jest.fn(),
  createOwner: jest.fn(),
};

jest.mock("../../functions/property-owners/controller/controller.js", () => ({
  Controller: jest.fn(() => mockController),
}));

const { handler } = require("../../functions/property-owners/index.js");

const GENERIC_ERROR_MESSAGE = "Something went wrong, please contact support.";

const event = (httpMethod, queryStringParameters = null) => ({
  httpMethod,
  headers: { Authorization: "token-1" },
  queryStringParameters,
});

beforeEach(() => {
  mockController.listOwners.mockReset().mockResolvedValue({ statusCode: 200, body: "[]" });
  mockController.getOwner.mockReset().mockResolvedValue({ statusCode: 200, body: "{}" });
  mockController.createOwner.mockReset().mockResolvedValue({ statusCode: 201, body: "{}" });
});

const expectNoControllerCall = () => {
  expect(mockController.listOwners).not.toHaveBeenCalled();
  expect(mockController.getOwner).not.toHaveBeenCalled();
  expect(mockController.createOwner).not.toHaveBeenCalled();
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("property-owners router", () => {
  test("routes GET without an id to listOwners with the event", async () => {
    const request = event("GET");

    const response = await handler(request);

    expect(response).toEqual({ statusCode: 200, body: "[]" });
    expect(mockController.listOwners).toHaveBeenCalledWith(request);
    expect(mockController.getOwner).not.toHaveBeenCalled();
  });

  test("routes GET with unrelated query parameters but no id to listOwners", async () => {
    await handler(event("GET", { page: "1" }));

    expect(mockController.listOwners).toHaveBeenCalledTimes(1);
    expect(mockController.getOwner).not.toHaveBeenCalled();
  });

  test.each([
    ["a uuid", "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b"],
    ["an empty value", ""],
  ])("routes GET with an id that is %s to getOwner with the event", async (_label, id) => {
    const request = event("GET", { id });

    const response = await handler(request);

    expect(response).toEqual({ statusCode: 200, body: "{}" });
    expect(mockController.getOwner).toHaveBeenCalledWith(request);
    expect(mockController.listOwners).not.toHaveBeenCalled();
  });

  test("routes POST without an id or action to createOwner with the event", async () => {
    const request = { ...event("POST"), body: '{"first_name":"Anna"}' };

    const response = await handler(request);

    expect(response).toEqual({ statusCode: 201, body: "{}" });
    expect(mockController.createOwner).toHaveBeenCalledWith(request);
    expect(mockController.listOwners).not.toHaveBeenCalled();
    expect(mockController.getOwner).not.toHaveBeenCalled();
  });

  test("routes POST with unrelated query parameters but no id or action to createOwner", async () => {
    await handler(event("POST", { page: "1" }));

    expect(mockController.createOwner).toHaveBeenCalledTimes(1);
  });

  test.each([
    ["an action", { action: "archive" }],
    ["an empty action", { action: "" }],
    ["a null action", { action: null }],
    ["an id", { id: "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b" }],
    ["an empty id", { id: "" }],
    ["an action next to an id", { action: "archive", id: "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b" }],
  ])("returns 405 for POST with %s without calling the controller", async (_label, query) => {
    const response = await handler(event("POST", query));

    expect(response.statusCode).toBe(405);
    expectNoControllerCall();
  });

  test.each(["PUT", "PATCH", "DELETE", "HEAD", "constructor", "__proto__", undefined])(
    "returns 405 for method %p without calling the controller",
    async (method) => {
      const response = await handler(event(method));

      expect(response.statusCode).toBe(405);
      expectNoControllerCall();
    }
  );

  test.each([
    ["an action", { action: "archive" }],
    ["an empty action", { action: "" }],
    ["a null action", { action: null }],
    ["an action next to an id", { action: "archive", id: "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b" }],
  ])("returns 405 for GET with %s without calling the controller", async (_label, query) => {
    const response = await handler(event("GET", query));

    expect(response.statusCode).toBe(405);
    expectNoControllerCall();
  });

  test("answers OPTIONS with the CORS headers without calling the controller", async () => {
    const response = await handler(event("OPTIONS", { action: "anything" }));

    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    });
    expect(mockController.listOwners).not.toHaveBeenCalled();
    expect(mockController.getOwner).not.toHaveBeenCalled();
  });

  test("returns a generic 500 and logs the error when the controller throws", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("secret");
    mockController.listOwners.mockRejectedValue(failure);

    const response = await handler(event("GET"));

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({ message: GENERIC_ERROR_MESSAGE });
    expect(response.body).not.toContain("secret");
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(consoleError).toHaveBeenCalledWith(failure);
  });
});
