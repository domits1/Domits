const { CommunicationPreferencesController } = require("../../functions/communication-preferences/controller/controller.js");
const { DEFAULT_HOST_NOTIFICATION_PREFERENCES } = require("../../functions/communication-preferences/business/hostNotificationMatrixConfig.js");

const event = (patch = {}) => ({
  requestContext: { authorizer: { claims: { sub: "host-1", "custom:group": "Host" } } },
  queryStringParameters: { persona: "host", view: "host-events" },
  pathParameters: null,
  ...patch,
});

describe("CommunicationPreferencesController host event matrix", () => {
  const createController = () => {
    const service = {
      getHostNotificationPreferences: jest.fn(async () => DEFAULT_HOST_NOTIFICATION_PREFERENCES),
      saveHostNotificationPreferences: jest.fn(async (_userId, payload) => payload),
    };
    return { controller: new CommunicationPreferencesController({ service }), service };
  };

  test("GET reads event preferences for the authenticated host", async () => {
    const { controller, service } = createController();

    await expect(controller.getPreferences(event())).resolves.toEqual({
      statusCode: 200,
      response: DEFAULT_HOST_NOTIFICATION_PREFERENCES,
    });
    expect(service.getHostNotificationPreferences).toHaveBeenCalledWith("host-1");
  });

  test("PUT saves the event matrix for the authenticated host", async () => {
    const { controller, service } = createController();
    const payload = { ...DEFAULT_HOST_NOTIFICATION_PREFERENCES, manager_new_booking: false };

    await expect(controller.updatePreferences(event({ body: JSON.stringify(payload) }))).resolves.toEqual({
      statusCode: 200,
      response: payload,
    });
    expect(service.saveHostNotificationPreferences).toHaveBeenCalledWith("host-1", payload);
  });

  test("rejects the host event matrix when the guest persona is requested", async () => {
    const { controller, service } = createController();

    await expect(controller.getPreferences(event({
      queryStringParameters: { persona: "guest", view: "host-events" },
    }))).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    expect(service.getHostNotificationPreferences).not.toHaveBeenCalled();
  });
});
