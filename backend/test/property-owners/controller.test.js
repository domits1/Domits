jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const { Controller } = require("../../functions/property-owners/controller/controller.js");
const { BadRequestException } = require("../../functions/property-owners/util/exception/badRequestException.js");
const { NotFoundException } = require("../../functions/property-owners/util/exception/notFoundException.js");
const { UnauthorizedException } = require("../../functions/property-owners/util/exception/unauthorizedException.js");

const OWNER_ID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const GENERIC_ERROR_MESSAGE = "Something went wrong, please contact support.";

const OPERATIONS = [
  ["listOwners", (id) => ({ headers: { Authorization: "token-1" }, queryStringParameters: id ? { id } : null })],
  ["getOwner", () => ({ headers: { Authorization: "token-1" }, queryStringParameters: { id: OWNER_ID } })],
];

const createController = ({ role = "Host", getUser } = {}) => {
  const service = {
    listOwners: jest.fn(async () => [{ id: OWNER_ID, properties: [] }]),
    getOwner: jest.fn(async () => ({ id: OWNER_ID, properties: [] })),
  };
  const authManager = {
    getUser: getUser ?? jest.fn(async () => ({ userId: "host-1", email: "host@example.com", role })),
  };
  return { service, authManager, controller: new Controller({ service, authManager }) };
};

const bodyOf = (response) => JSON.parse(response.body);

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Controller role gate", () => {
  describe.each(OPERATIONS)("%s", (operation, buildEvent) => {
    test.each(["Property Operations Manager", "Traveler", null])(
      "rejects a caller whose group is %p with 403 and never calls the service",
      async (role) => {
        const { controller, service } = createController({ role });

        const response = await controller[operation](buildEvent());

        expect(response.statusCode).toBe(403);
        expect(bodyOf(response).message).toMatch(/Host or Admin/);
        expect(service[operation]).not.toHaveBeenCalled();
      }
    );

    test("rejects a failing getUser with 401 and never calls the service", async () => {
      const getUser = jest.fn(async () => {
        throw new UnauthorizedException("Invalid or expired authorization token.");
      });
      const { controller, service } = createController({ getUser });

      const response = await controller[operation](buildEvent());

      expect(response.statusCode).toBe(401);
      expect(bodyOf(response)).toEqual({ message: "Invalid or expired authorization token." });
      expect(service[operation]).not.toHaveBeenCalled();
    });

    test("passes the Authorization header to getUser", async () => {
      const { controller, authManager } = createController();

      await controller[operation](buildEvent());

      expect(authManager.getUser).toHaveBeenCalledWith("token-1");
    });

    test("falls back to a lowercase authorization header", async () => {
      const { controller, authManager } = createController();
      const request = { ...buildEvent(), headers: { authorization: "token-lowercase" } };

      await controller[operation](request);

      expect(authManager.getUser).toHaveBeenCalledWith("token-lowercase");
    });

    test("passes a missing header on to getUser, which rejects it", async () => {
      const { controller, authManager } = createController();

      await controller[operation]({ ...buildEvent(), headers: undefined });

      expect(authManager.getUser).toHaveBeenCalledWith(undefined);
    });
  });
});

describe("Controller.listOwners", () => {
  test.each(["Host", "Admin"])("lets a %s list their own owners", async (role) => {
    const { controller, service } = createController({ role });

    const response = await controller.listOwners(OPERATIONS[0][1]());

    expect(response.statusCode).toBe(200);
    expect(bodyOf(response)).toEqual([{ id: OWNER_ID, properties: [] }]);
    expect(service.listOwners).toHaveBeenCalledWith("host-1");
  });

  test("returns the CORS response headers", async () => {
    const { controller } = createController();

    const response = await controller.listOwners(OPERATIONS[0][1]());

    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
  });
});

describe("Controller.getOwner", () => {
  test.each(["Host", "Admin"])("lets a %s read an owner by the raw id query value", async (role) => {
    const { controller, service } = createController({ role });

    const response = await controller.getOwner(OPERATIONS[1][1]());

    expect(response.statusCode).toBe(200);
    expect(bodyOf(response)).toEqual({ id: OWNER_ID, properties: [] });
    expect(service.getOwner).toHaveBeenCalledWith("host-1", OWNER_ID);
  });

  test("passes an empty id through so the service can reject it", async () => {
    const { controller, service } = createController();

    await controller.getOwner({ headers: { Authorization: "token-1" }, queryStringParameters: { id: "" } });

    expect(service.getOwner).toHaveBeenCalledWith("host-1", "");
  });
});

describe("Controller error handling", () => {
  test.each([
    [400, new BadRequestException("A valid owner id is required.")],
    [404, new NotFoundException("Owner not found.")],
  ])("keeps the message of a %i error", async (statusCode, error) => {
    const { controller, service } = createController();
    service.getOwner.mockRejectedValue(error);
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await controller.getOwner(OPERATIONS[1][1]());

    expect(response.statusCode).toBe(statusCode);
    expect(bodyOf(response)).toEqual({ message: error.message });
    expect(consoleError).not.toHaveBeenCalled();
  });

  test.each([
    ["a plain Error", Object.assign(new Error("relation property_owner does not exist"), {})],
    ["a 500 error", Object.assign(new Error("connection password=secret"), { statusCode: 500 })],
    ["a 503 error", Object.assign(new Error("upstream secret"), { statusCode: 503 })],
    ["a non-numeric status", Object.assign(new Error("odd secret"), { statusCode: "400" })],
  ])("hides %s behind the generic 500 message and logs it", async (_label, error) => {
    const { controller, service } = createController();
    service.listOwners.mockRejectedValue(error);
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await controller.listOwners(OPERATIONS[0][1]());

    expect(response.statusCode).toBe(500);
    expect(bodyOf(response)).toEqual({ message: GENERIC_ERROR_MESSAGE });
    expect(response.body).not.toContain(error.message);
    expect(consoleError).toHaveBeenCalledWith(error);
  });
});
