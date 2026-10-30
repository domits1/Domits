jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const { Controller } = require("../../functions/property-owners/controller/controller.js");
const { BadRequestException } = require("../../functions/property-owners/util/exception/badRequestException.js");
const { NotFoundException } = require("../../functions/property-owners/util/exception/notFoundException.js");
const { UnauthorizedException } = require("../../functions/property-owners/util/exception/unauthorizedException.js");
const { ConflictException } = require("../../functions/property-owners/util/exception/conflictException.js");

const OWNER_ID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const GENERIC_ERROR_MESSAGE = "Something went wrong, please contact support.";

const VALID_BODY = Object.freeze({
  first_name: "Anna",
  last_name: "de Vries",
  email: "anna@example.com",
  owner_type: "individual",
});

const SHARES_BODY = Object.freeze({
  property_id: "property-1",
  effective_from: Date.UTC(2026, 9, 22),
  shares: [{ owner_id: OWNER_ID, ownership_basis_points: 10000 }],
});

const SHARES_RESPONSE = Object.freeze({
  property_id: "property-1",
  property_title: "Villa Sensual",
  as_of: Date.UTC(2026, 9, 22),
  current: [],
  upcoming: [],
});

const OPERATIONS = [
  ["listOwners", (id) => ({ headers: { Authorization: "token-1" }, queryStringParameters: id ? { id } : null })],
  ["getOwner", () => ({ headers: { Authorization: "token-1" }, queryStringParameters: { id: OWNER_ID } })],
  ["createOwner", () => ({ headers: { Authorization: "token-1" }, body: JSON.stringify(VALID_BODY) })],
  [
    "setShares",
    () => ({
      headers: { Authorization: "token-1" },
      queryStringParameters: { action: "set-shares" },
      body: JSON.stringify(SHARES_BODY),
    }),
  ],
  [
    "updateOwner",
    () => ({
      headers: { Authorization: "token-1" },
      queryStringParameters: { id: OWNER_ID },
      body: JSON.stringify({ first_name: "Bea" }),
    }),
  ],
  [
    "archiveOwner",
    () => ({
      headers: { Authorization: "token-1" },
      queryStringParameters: { action: "archive", id: OWNER_ID },
    }),
  ],
];

const createEvent = (body) => ({ headers: { Authorization: "token-1" }, queryStringParameters: null, body });

const createController = ({ role = "Host", getUser } = {}) => {
  const service = {
    listOwners: jest.fn(async () => [{ id: OWNER_ID, properties: [] }]),
    getOwner: jest.fn(async () => ({ id: OWNER_ID, properties: [] })),
    createOwner: jest.fn(async (_hostId, body) => ({ id: OWNER_ID, ...body, properties: [] })),
    setShares: jest.fn(async () => SHARES_RESPONSE),
    updateOwner: jest.fn(async (_hostId, _id, body) => ({ id: OWNER_ID, ...body, properties: [] })),
    archiveOwner: jest.fn(async () => ({ id: OWNER_ID, status: "archived", properties: [] })),
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

describe("Controller.createOwner", () => {
  test.each(["Property Operations Manager", "Traveler", null])(
    "rejects a caller whose group is %p with 403 before the body is parsed",
    async (role) => {
      const { controller, service } = createController({ role });

      const response = await controller.createOwner(createEvent("{not json"));

      expect(response.statusCode).toBe(403);
      expect(service.createOwner).not.toHaveBeenCalled();
    }
  );

  test("rejects a failing getUser with 401 before the body is parsed", async () => {
    const getUser = jest.fn(async () => {
      throw new UnauthorizedException("Invalid or expired authorization token.");
    });
    const { controller, service } = createController({ getUser });

    const response = await controller.createOwner(createEvent("{not json"));

    expect(response.statusCode).toBe(401);
    expect(bodyOf(response)).toEqual({ message: "Invalid or expired authorization token." });
    expect(service.createOwner).not.toHaveBeenCalled();
  });

  test.each(["Host", "Admin"])("lets a %s create an owner for their own host and answers 201", async (role) => {
    const { controller, service } = createController({ role });

    const response = await controller.createOwner(createEvent(JSON.stringify(VALID_BODY)));

    expect(response.statusCode).toBe(201);
    expect(bodyOf(response)).toEqual({ id: OWNER_ID, ...VALID_BODY, properties: [] });
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(service.createOwner).toHaveBeenCalledWith("host-1", VALID_BODY);
  });

  test.each([
    ["a missing body", undefined],
    ["a null body", null],
    ["an empty body", ""],
    ["malformed JSON", "{not json"],
    ["truncated JSON", '{"first_name":'],
  ])("rejects %s with 400 without calling the service", async (_label, body) => {
    const { controller, service } = createController();

    const response = await controller.createOwner(createEvent(body));

    expect(response.statusCode).toBe(400);
    expect(bodyOf(response)).toEqual({ message: "Request body must be valid JSON." });
    expect(service.createOwner).not.toHaveBeenCalled();
  });

  test.each([
    ["null", "null", null],
    ["an array", "[]", []],
    ["a string", '"owner"', "owner"],
    ["a number", "42", 42],
  ])("passes a parsed %s on to the service, whose validator rejects it", async (_label, body, parsed) => {
    const { controller, service } = createController();

    await controller.createOwner(createEvent(body));

    expect(service.createOwner).toHaveBeenCalledWith("host-1", parsed);
  });

  test("keeps the message of a 400 from the service", async () => {
    const { controller, service } = createController();
    service.createOwner.mockRejectedValue(new BadRequestException("Request body must be a JSON object."));

    const response = await controller.createOwner(createEvent("[]"));

    expect(response.statusCode).toBe(400);
    expect(bodyOf(response)).toEqual({ message: "Request body must be a JSON object." });
  });
});

describe("Controller.setShares", () => {
  const sharesEvent = (body) => ({
    headers: { Authorization: "token-1" },
    queryStringParameters: { action: "set-shares" },
    body,
  });

  test.each(["Property Operations Manager", "Traveler", null])(
    "rejects a caller whose group is %p with 403 before the body is parsed",
    async (role) => {
      const { controller, service } = createController({ role });

      const response = await controller.setShares(sharesEvent("{not json"));

      expect(response.statusCode).toBe(403);
      expect(service.setShares).not.toHaveBeenCalled();
    }
  );

  test("rejects a failing getUser with 401 before the body is parsed", async () => {
    const getUser = jest.fn(async () => {
      throw new UnauthorizedException("Invalid or expired authorization token.");
    });
    const { controller, service } = createController({ getUser });

    const response = await controller.setShares(sharesEvent("{not json"));

    expect(response.statusCode).toBe(401);
    expect(service.setShares).not.toHaveBeenCalled();
  });

  test.each(["Host", "Admin"])("lets a %s set the shares of their property and answers 200", async (role) => {
    const { controller, service } = createController({ role });

    const response = await controller.setShares(sharesEvent(JSON.stringify(SHARES_BODY)));

    expect(response.statusCode).toBe(200);
    expect(bodyOf(response)).toEqual(SHARES_RESPONSE);
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(service.setShares).toHaveBeenCalledWith("host-1", SHARES_BODY);
  });

  test.each([
    ["a missing body", undefined],
    ["an empty body", ""],
    ["malformed JSON", "{not json"],
  ])("rejects %s with 400 without calling the service", async (_label, body) => {
    const { controller, service } = createController();

    const response = await controller.setShares(sharesEvent(body));

    expect(response.statusCode).toBe(400);
    expect(bodyOf(response)).toEqual({ message: "Request body must be valid JSON." });
    expect(service.setShares).not.toHaveBeenCalled();
  });

  test.each([
    [404, new NotFoundException("Property not found.")],
    [409, new ConflictException("Archived owners cannot receive ownership shares.")],
  ])("keeps the message of a %i from the service", async (statusCode, error) => {
    const { controller, service } = createController();
    service.setShares.mockRejectedValue(error);

    const response = await controller.setShares(sharesEvent(JSON.stringify(SHARES_BODY)));

    expect(response.statusCode).toBe(statusCode);
    expect(bodyOf(response)).toEqual({ message: error.message });
  });
});

describe("Controller.updateOwner", () => {
  const PATCH_BODY = Object.freeze({ first_name: "Bea", status: "active" });

  const updateEvent = (body, id = OWNER_ID) => ({
    headers: { Authorization: "token-1" },
    queryStringParameters: { id },
    body,
  });

  test.each(["Property Operations Manager", "Traveler", null])(
    "rejects a caller whose group is %p with 403 before the body is parsed",
    async (role) => {
      const { controller, service } = createController({ role });

      const response = await controller.updateOwner(updateEvent("{not json"));

      expect(response.statusCode).toBe(403);
      expect(service.updateOwner).not.toHaveBeenCalled();
    }
  );

  test("rejects a failing getUser with 401 before the body is parsed", async () => {
    const getUser = jest.fn(async () => {
      throw new UnauthorizedException("Invalid or expired authorization token.");
    });
    const { controller, service } = createController({ getUser });

    const response = await controller.updateOwner(updateEvent("{not json"));

    expect(response.statusCode).toBe(401);
    expect(bodyOf(response)).toEqual({ message: "Invalid or expired authorization token." });
    expect(service.updateOwner).not.toHaveBeenCalled();
  });

  test.each(["Host", "Admin"])("lets a %s update their owner by the raw id and answers 200", async (role) => {
    const { controller, service } = createController({ role });

    const response = await controller.updateOwner(updateEvent(JSON.stringify(PATCH_BODY)));

    expect(response.statusCode).toBe(200);
    expect(bodyOf(response)).toEqual({ id: OWNER_ID, ...PATCH_BODY, properties: [] });
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(service.updateOwner).toHaveBeenCalledWith("host-1", OWNER_ID, PATCH_BODY);
  });

  test("passes an empty id through so the service can reject it", async () => {
    const { controller, service } = createController();

    await controller.updateOwner(updateEvent(JSON.stringify(PATCH_BODY), ""));

    expect(service.updateOwner).toHaveBeenCalledWith("host-1", "", PATCH_BODY);
  });

  test.each([
    ["a missing body", undefined],
    ["an empty body", ""],
    ["malformed JSON", "{not json"],
  ])("rejects %s with 400 without calling the service", async (_label, body) => {
    const { controller, service } = createController();

    const response = await controller.updateOwner(updateEvent(body));

    expect(response.statusCode).toBe(400);
    expect(bodyOf(response)).toEqual({ message: "Request body must be valid JSON." });
    expect(service.updateOwner).not.toHaveBeenCalled();
  });

  test("keeps the message of a 404 from the service", async () => {
    const { controller, service } = createController();
    service.updateOwner.mockRejectedValue(new NotFoundException("Owner not found."));

    const response = await controller.updateOwner(updateEvent(JSON.stringify(PATCH_BODY)));

    expect(response.statusCode).toBe(404);
    expect(bodyOf(response)).toEqual({ message: "Owner not found." });
  });
});

describe("Controller.archiveOwner", () => {
  const ARCHIVED = Object.freeze({ id: OWNER_ID, status: "archived", properties: [] });

  const archiveEvent = (body, id = OWNER_ID) => ({
    headers: { Authorization: "token-1" },
    queryStringParameters: { action: "archive", id },
    body,
  });

  test.each(["Property Operations Manager", "Traveler", null])(
    "rejects a caller whose group is %p with 403 and never calls the service",
    async (role) => {
      const { controller, service } = createController({ role });

      const response = await controller.archiveOwner(archiveEvent("{not json"));

      expect(response.statusCode).toBe(403);
      expect(service.archiveOwner).not.toHaveBeenCalled();
    }
  );

  test("rejects a failing getUser with 401 and never calls the service", async () => {
    const getUser = jest.fn(async () => {
      throw new UnauthorizedException("Invalid or expired authorization token.");
    });
    const { controller, service } = createController({ getUser });

    const response = await controller.archiveOwner(archiveEvent("{not json"));

    expect(response.statusCode).toBe(401);
    expect(bodyOf(response)).toEqual({ message: "Invalid or expired authorization token." });
    expect(service.archiveOwner).not.toHaveBeenCalled();
  });

  test.each(["Host", "Admin"])("lets a %s archive their owner by the raw id and answers 200", async (role) => {
    const { controller, service } = createController({ role });

    const response = await controller.archiveOwner(archiveEvent(undefined));

    expect(response.statusCode).toBe(200);
    expect(bodyOf(response)).toEqual(ARCHIVED);
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(service.archiveOwner).toHaveBeenCalledWith("host-1", OWNER_ID);
  });

  test.each([
    ["a missing body", undefined],
    ["an empty body", ""],
    ["malformed JSON", "{not json"],
    ["a JSON body", '{"status":"active"}'],
  ])("ignores %s and still answers 200", async (_label, body) => {
    const { controller, service } = createController();

    const response = await controller.archiveOwner(archiveEvent(body));

    expect(response.statusCode).toBe(200);
    expect(service.archiveOwner).toHaveBeenCalledWith("host-1", OWNER_ID);
  });

  test("passes an empty id through so the service can reject it", async () => {
    const { controller, service } = createController();

    await controller.archiveOwner(archiveEvent(undefined, ""));

    expect(service.archiveOwner).toHaveBeenCalledWith("host-1", "");
  });

  test("keeps the message of a 409 from the service", async () => {
    const message = "This owner still holds ownership shares. Set new shares for these properties first.";
    const { controller, service } = createController();
    service.archiveOwner.mockRejectedValue(new ConflictException(message));

    const response = await controller.archiveOwner(archiveEvent(undefined));

    expect(response.statusCode).toBe(409);
    expect(bodyOf(response)).toEqual({ message });
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
