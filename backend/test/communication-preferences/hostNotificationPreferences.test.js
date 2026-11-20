const {
  CommunicationPreferencesService,
} = require("../../functions/communication-preferences/business/service/service.js");
const {
  HOST_NOTIFICATION_EVENT_KEYS,
  DEFAULT_HOST_NOTIFICATION_PREFERENCES,
} = require("../../functions/communication-preferences/business/hostNotificationMatrixConfig.js");

const createService = ({ record = null, legacyRecord = null, now = 1234 } = {}) => {
  const hostNotificationRepository = {
    findByUserId: jest.fn(async () => record),
    save: jest.fn(async (next) => next),
  };
  const repository = {
    findByUserIdAndPersona: jest.fn(async () => legacyRecord),
  };
  const service = new CommunicationPreferencesService({
    repository,
    hostNotificationRepository,
    now: () => now,
  });
  return { service, hostNotificationRepository, repository };
};

describe("Host event notification preferences", () => {
  test("returns enabled defaults for every host event when no row exists", async () => {
    const { service, hostNotificationRepository, repository } = createService();

    await expect(service.getHostNotificationPreferences("host-1")).resolves.toEqual(DEFAULT_HOST_NOTIFICATION_PREFERENCES);
    expect(HOST_NOTIFICATION_EVENT_KEYS).toHaveLength(87);
    expect(hostNotificationRepository.findByUserId).toHaveBeenCalledWith("host-1");
    expect(repository.findByUserIdAndPersona).toHaveBeenCalledWith("host-1", "HOST");
  });

  test("saves the complete event matrix for the authenticated host", async () => {
    const { service, hostNotificationRepository } = createService();
    const preferences = {
      ...DEFAULT_HOST_NOTIFICATION_PREFERENCES,
      manager_new_booking: { ...DEFAULT_HOST_NOTIFICATION_PREFERENCES.manager_new_booking, email: true, sms: true },
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

  test("retries a first-save DSQL conflict and preserves the winning row timestamp", async () => {
    let existing = null;
    const conflict = Object.assign(new Error("serialization failure"), { code: "40001" });
    const hostNotificationRepository = {
      findByUserId: jest.fn(async () => existing),
      save: jest.fn()
        .mockImplementationOnce(async (record) => {
          existing = { ...record, created_at: 90 };
          throw conflict;
        })
        .mockImplementation(async (record) => record),
    };
    const repository = { findByUserIdAndPersona: jest.fn(async () => null) };
    const now = jest.fn().mockReturnValueOnce(100).mockReturnValue(200);
    const service = new CommunicationPreferencesService({
      repository,
      hostNotificationRepository,
      now,
    });

    await expect(service.saveHostNotificationPreferences(
      "host-1",
      DEFAULT_HOST_NOTIFICATION_PREFERENCES
    )).resolves.toEqual(DEFAULT_HOST_NOTIFICATION_PREFERENCES);

    expect(hostNotificationRepository.findByUserId).toHaveBeenCalledTimes(2);
    expect(hostNotificationRepository.save).toHaveBeenCalledTimes(2);
    expect(hostNotificationRepository.save).toHaveBeenLastCalledWith(expect.objectContaining({
      user_id: "host-1",
      created_at: 90,
      updated_at: 200,
    }));
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

    expect(saved.manager_new_booking).toEqual({ inApp: false, email: true, sms: false });
    expect(saved.manager_booking_modification).toEqual({ inApp: false, email: true, sms: true });
    expect(saved.finance_chargeback).toEqual(DEFAULT_HOST_NOTIFICATION_PREFERENCES.finance_chargeback);
    expect(Object.keys(saved)).toHaveLength(HOST_NOTIFICATION_EVENT_KEYS.length);
  });


  test("maps saved legacy Host communication preferences when no matrix row exists", async () => {
    const legacyRecord = {
      reservation_sms: true,
      reservation_push: false,
      cancellation_sms: false,
      cancellation_push: true,
      messages_email: false,
      messages_sms: true,
      messages_push: false,
    };
    const { service, repository } = createService({ legacyRecord });

    const preferences = await service.getHostNotificationPreferences("host-1");

    expect(repository.findByUserIdAndPersona).toHaveBeenCalledWith("host-1", "HOST");
    expect(preferences.manager_new_booking).toEqual({ inApp: false, email: true, sms: true });
    expect(preferences.booking_created).toEqual({ inApp: false, email: true, sms: true });
    expect(preferences.booking_cancelled_by_guest).toEqual({ inApp: true, email: true, sms: false });
    expect(preferences.manager_new_guest_message).toEqual({ inApp: false, email: false, sms: true });
    expect(preferences.finance_chargeback).toEqual(DEFAULT_HOST_NOTIFICATION_PREFERENCES.finance_chargeback);
  });

  test("keeps required emails enabled when reading previously stored matrix values", async () => {
    const { service } = createService({ record: { preferences: JSON.stringify({
      manager_new_booking: { inApp: false, email: false, sms: true },
      finance_chargeback: { inApp: false, email: false, sms: true },
    }) } });

    const preferences = await service.getHostNotificationPreferences("host-1");

    expect(preferences.manager_new_booking).toEqual({ inApp: false, email: true, sms: true });
    expect(preferences.finance_chargeback).toEqual({ inApp: false, email: false, sms: true });
  });

  test("forces required reservation and cancellation email to remain enabled on save", async () => {
    const { service, hostNotificationRepository } = createService();
    const preferences = {
      ...DEFAULT_HOST_NOTIFICATION_PREFERENCES,
      manager_new_booking: { ...DEFAULT_HOST_NOTIFICATION_PREFERENCES.manager_new_booking, email: false },
    };

    const saved = await service.saveHostNotificationPreferences("host-1", preferences);

    expect(saved.manager_new_booking.email).toBe(true);
    expect(hostNotificationRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      preferences: expect.stringContaining('"manager_new_booking":{"inApp":true,"email":true,"sms":false}'),
    }));
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
