const { Controller } = require("../../functions/host-team/controller/controller.js");
const { NotFoundException } = require("../../functions/host-team/util/exception/notFoundException.js");

const putEvent = (role, { id = "member-1" } = {}) => ({
  headers: { Authorization: "token-1" },
  queryStringParameters: { id },
  body: JSON.stringify({ role }),
});

const createController = ({ callerRole = "Host" } = {}) => {
  const service = {
    updateMemberRole: jest.fn(async () => ({ id: "member-1", role: "Sales Manager" })),
  };
  const authManager = {
    getUser: jest.fn(async () => ({ userId: "host-1", email: "host@example.com", role: callerRole })),
  };
  return {
    service,
    authManager,
    controller: new Controller({ service, authManager }),
  };
};

describe("Controller.updateMemberRole", () => {
  test.each(["Host", "Admin"])("allows a %s caller and forwards to the service", async (callerRole) => {
    const { controller, service } = createController({ callerRole });

    const response = await controller.updateMemberRole(putEvent("Sales Manager"));

    expect(response.statusCode).toBe(200);
    expect(service.updateMemberRole).toHaveBeenCalledWith("host-1", "member-1", "Sales Manager");
  });

  test.each(["Property Operations Manager", "General Manager", "Traveler", null])(
    "rejects a caller whose own group is %s, even with a valid role value",
    async (callerRole) => {
      const { controller, service } = createController({ callerRole });

      const response = await controller.updateMemberRole(putEvent("Sales Manager"));

      expect(response.statusCode).toBe(403);
      expect(service.updateMemberRole).not.toHaveBeenCalled();
    }
  );
});

describe("Controller.getTeamMemberInternal", () => {
  const SECRET = "test-internal-secret";

  const buildEvent = (overrides = {}) => ({
    headers: { "x-internal-secret": SECRET },
    queryStringParameters: { id: "member-1" },
    ...overrides,
  });

  const createInternalController = ({ member = { id: "member-1", member_email: "member@example.com" } } = {}) => {
    const service = { getTeamMemberById: jest.fn(async () => member) };
    return { service, controller: new Controller({ service }) };
  };

  const originalSecret = process.env.INTERNAL_TASK_SECRET;
  beforeEach(() => {
    process.env.INTERNAL_TASK_SECRET = SECRET;
  });
  afterAll(() => {
    process.env.INTERNAL_TASK_SECRET = originalSecret;
  });

  test("returns the member's email when the secret is valid", async () => {
    const { controller, service } = createInternalController();

    const response = await controller.getTeamMemberInternal(buildEvent());

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ email: "member@example.com" });
    expect(service.getTeamMemberById).toHaveBeenCalledWith("member-1");
  });

  test("rejects when the secret header is missing", async () => {
    const { controller, service } = createInternalController();

    const response = await controller.getTeamMemberInternal(buildEvent({ headers: {} }));

    expect(response.statusCode).toBe(401);
    expect(service.getTeamMemberById).not.toHaveBeenCalled();
  });

  test("rejects when the secret header is wrong", async () => {
    const { controller, service } = createInternalController();

    const response = await controller.getTeamMemberInternal(buildEvent({ headers: { "x-internal-secret": "wrong" } }));

    expect(response.statusCode).toBe(401);
    expect(service.getTeamMemberById).not.toHaveBeenCalled();
  });

  test("returns 400 when id is missing", async () => {
    const { controller, service } = createInternalController();

    const response = await controller.getTeamMemberInternal(buildEvent({ queryStringParameters: {} }));

    expect(response.statusCode).toBe(400);
    expect(service.getTeamMemberById).not.toHaveBeenCalled();
  });

  test("returns 404 when the member does not exist", async () => {
    const service = {
      getTeamMemberById: jest.fn(async () => { throw new NotFoundException("Team member not found."); }),
    };
    const controller = new Controller({ service });

    const response = await controller.getTeamMemberInternal(buildEvent());

    expect(response.statusCode).toBe(404);
  });
});
