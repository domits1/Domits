const {
  CommunicationPreferencesService,
} = require("../../functions/communication-preferences/business/service/service.js");
const {
  HOST_NOTIFICATION_EVENT_KEYS,
  DEFAULT_HOST_NOTIFICATION_PREFERENCES,
} = require("../../functions/communication-preferences/business/hostNotificationMatrixConfig.js");

const createService = ({ record = null, now = 1234 } = {}) => {
  const hostNotificationRepository = {
    findByUserId: jest.fn(async () => record),
    save: jest.fn(async (next) => next),
  };
  const service = new CommunicationPreferencesService({
    repository: {},
    hostNotificationRepository,
    now: () => now,
  });
  return { service, hostNotificationRepository };
};

describe("Host event notification preferences", () => {
  test("returns enabled defaults for every host event when no row exists", async () => {
    const { service, hostNotificationRepository } = createService();

    await expect(service.getHostNotificationPreferences("host-1")).resolves.toEqual(DEFAULT_HOST_NOTIFICATION_PREFERENCES);
    expect(HOST_NOTIFICATION_EVENT_KEYS).toHaveLength(87);
    expect(hostNotificationRepository.findByUserId).toHaveBeenCalledWith("host-1");
  });

  test("saves the complete event matrix for the authenticated host", async () => {
    const { service, hostNotificationRepository } = createService();
    const preferences = {
      ...DEFAULT_HOST_NOTIFICATION_PREFERENCES,
      manager_new_booking: { ...DEFAULT_HOST_NOTIFICATION_PREFERENCES.manager_new_booking, email: false, sms: true },
      finance_chargeback: { ...DEFAULT_HOST_NOTIFICATION_PREFERENCES.finance_chargeback, inApp: false },
    };

    await expect(service.saveHostNotificationPreferences("host-1", preferences)).resolves.toEqual(preferences);
    expect(hostNotificationRepository.save).toHaveBeenCalledWith({
      user_id: "host-1",
      preferences: JSON.stringify(preferences),
      created_at: 1234,
      updated_at: 1234,
    });
  });

  test("keeps the original created timestamp when updating preferences", async () => {
    const record = { user_id: "host-1", preferences: JSON.stringify(DEFAULT_HOST_NOTIFICATION_PREFERENCES), created_at: 50, updated_at: 60 };
    const { service, hostNotificationRepository } = createService({ record, now: 99 });

    await service.saveHostNotificationPreferences("host-1", DEFAULT_HOST_NOTIFICATION_PREFERENCES);

    expect(hostNotificationRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "host-1",
      created_at: 50,
      updated_at: 99,
    }));
  });

  test("fills preferences added by a later matrix version with their default", async () => {
    const { service } = createService({ record: { preferences: JSON.stringify({
      manager_new_booking: false,
      manager_booking_modification: { inApp: false, email: false, sms: true },
    }) } });

    const saved = await service.getHostNotificationPreferences("host-1");

    expect(saved.manager_new_booking).toEqual({ inApp: false, email: false, sms: false });
    expect(saved.manager_booking_modification).toEqual({ inApp: false, email: false, sms: true });
    expect(saved.finance_chargeback).toEqual(DEFAULT_HOST_NOTIFICATION_PREFERENCES.finance_chargeback);
    expect(Object.keys(saved)).toHaveLength(HOST_NOTIFICATION_EVENT_KEYS.length);
  });

  test("rejects unknown event keys", async () => {
    const { service, hostNotificationRepository } = createService();

    await expect(service.saveHostNotificationPreferences("host-1", {
      ...DEFAULT_HOST_NOTIFICATION_PREFERENCES,
      some_unlisted_event: true,
    })).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    expect(hostNotificationRepository.save).not.toHaveBeenCalled();
  });

  test("rejects incomplete and non-boolean preference matrices", async () => {
    const { service, hostNotificationRepository } = createService();
    const missing = { ...DEFAULT_HOST_NOTIFICATION_PREFERENCES };
    delete missing.manager_new_booking;

    await expect(service.saveHostNotificationPreferences("host-1", missing)).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    await expect(service.saveHostNotificationPreferences("host-1", {
      ...DEFAULT_HOST_NOTIFICATION_PREFERENCES,
      manager_new_booking: { ...DEFAULT_HOST_NOTIFICATION_PREFERENCES.manager_new_booking, email: "false" },
    })).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    expect(hostNotificationRepository.save).not.toHaveBeenCalled();
  });
});
