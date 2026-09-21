const { Controller } = require("../../functions/host-team/controller/controller.js");

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
