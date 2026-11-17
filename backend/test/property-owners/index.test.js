const mockController = {
  listOwners: jest.fn(),
  getOwner: jest.fn(),
  createOwner: jest.fn(),
  setShares: jest.fn(),
  updateOwner: jest.fn(),
  archiveOwner: jest.fn(),
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
  mockController.setShares.mockReset().mockResolvedValue({ statusCode: 200, body: "{}" });
  mockController.updateOwner.mockReset().mockResolvedValue({ statusCode: 200, body: "{}" });
  mockController.archiveOwner.mockReset().mockResolvedValue({ statusCode: 200, body: '{"status":"archived"}' });
});

const expectNoControllerCall = () => {
  expect(mockController.listOwners).not.toHaveBeenCalled();
  expect(mockController.getOwner).not.toHaveBeenCalled();
  expect(mockController.createOwner).not.toHaveBeenCalled();
  expect(mockController.setShares).not.toHaveBeenCalled();
  expect(mockController.updateOwner).not.toHaveBeenCalled();
  expect(mockController.archiveOwner).not.toHaveBeenCalled();
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

  test("routes PUT with action set-shares and no id to setShares with the event", async () => {
    const request = { ...event("PUT", { action: "set-shares" }), body: "{}" };

    const response = await handler(request);

    expect(response).toEqual({ statusCode: 200, body: "{}" });
    expect(mockController.setShares).toHaveBeenCalledWith(request);
    expect(mockController.createOwner).not.toHaveBeenCalled();
  });

  test.each([
    ["no action", null],
    ["no action but an id", { id: "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b" }],
    ["set-shares next to an id", { action: "set-shares", id: "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b" }],
    ["set-shares next to an empty id", { action: "set-shares", id: "" }],
    ["an empty action", { action: "" }],
    ["an unknown action", { action: "archive" }],
    ["an action in another case", { action: "SET-SHARES" }],
    ["an inherited property name as action", { action: "constructor" }],
    ["a null action", { action: null }],
  ])("returns 405 for PUT with %s without calling the controller", async (_label, query) => {
    const response = await handler(event("PUT", query));

    expect(response.statusCode).toBe(405);
    expectNoControllerCall();
  });

  test.each([
    ["a uuid", "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b"],
    ["an empty value", ""],
  ])("routes PATCH with an id that is %s and no action to updateOwner with the event", async (_label, id) => {
    const request = { ...event("PATCH", { id }), body: '{"first_name":"Anna"}' };

    const response = await handler(request);

    expect(response).toEqual({ statusCode: 200, body: "{}" });
    expect(mockController.updateOwner).toHaveBeenCalledWith(request);
    expect(mockController.getOwner).not.toHaveBeenCalled();
    expect(mockController.archiveOwner).not.toHaveBeenCalled();
  });

  test.each([
    ["a uuid", "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b"],
    ["an empty value", ""],
  ])("routes PATCH with action archive and an id that is %s to archiveOwner with the event", async (_label, id) => {
    const request = event("PATCH", { action: "archive", id });

    const response = await handler(request);

    expect(response).toEqual({ statusCode: 200, body: '{"status":"archived"}' });
    expect(mockController.archiveOwner).toHaveBeenCalledWith(request);
    expect(mockController.updateOwner).not.toHaveBeenCalled();
  });

  test.each([
    ["no query", null],
    ["unrelated query parameters but no id", { page: "1" }],
    ["action archive and no id", { action: "archive" }],
    ["an unknown action next to an id", { action: "restore", id: "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b" }],
    ["archive in another case next to an id", { action: "ARCHIVE", id: "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b" }],
    ["set-shares next to an id", { action: "set-shares", id: "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b" }],
    ["an empty action next to an id", { action: "", id: "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b" }],
    ["a null action next to an id", { action: null, id: "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b" }],
  ])("returns 405 for PATCH with %s without calling the controller", async (_label, query) => {
    const response = await handler(event("PATCH", query));

    expect(response.statusCode).toBe(405);
    expectNoControllerCall();
  });

  test.each(["GET", "POST"])("returns 405 for %s with action set-shares", async (method) => {
    const response = await handler(event(method, { action: "set-shares" }));

    expect(response.statusCode).toBe(405);
    expectNoControllerCall();
  });

  test.each(["PATCH", "DELETE", "HEAD", "constructor", "__proto__", undefined])(
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
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,OPTIONS",
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
