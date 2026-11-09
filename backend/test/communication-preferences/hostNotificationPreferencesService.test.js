const {
  HOST_NOTIFICATION_EVENT_KEYS,
  HostNotificationPreferencesService,
  hasHostNotificationEngineeringAccess,
} = require("../../functions/communication-preferences/business/service/hostNotificationPreferencesService.js");

const createPreferences = (value = true) => Object.fromEntries(
  Object.entries(HOST_NOTIFICATION_EVENT_KEYS)
    .filter(([section]) => section !== "engineering")
    .map(([section, events]) => [section, Object.fromEntries(events.map((event) => [event, value]))])
);

const createEngineeringPreferences = (value = true) =>
  Object.fromEntries(HOST_NOTIFICATION_EVENT_KEYS.engineering.map((event) => [event, value]));

const createRepository = (record = null) => {
  let stored = record;
  return {
    findByUserId: jest.fn(async () => stored),
    save: jest.fn(async (next) => {
      stored = { ...next };
      return stored;
    }),
    getStored: () => stored,
  };
};

describe("HostNotificationPreferencesService", () => {
  test("returns enabled defaults for every host section except admin-only engineering", async () => {
    const repository = createRepository();
    const service = new HostNotificationPreferencesService({ repository });

    const result = await service.getPreferences("host-1", { "custom:group": "Host" });

    expect(Object.keys(result)).toEqual(expect.arrayContaining([
      "bookings", "propertyManager", "propertyOwner", "finance", "distribution", "compliance",
    ]));
    expect(result.engineering).toBeUndefined();
    for (const section of Object.keys(result)) {
      expect(Object.values(result[section]).every((enabled) => enabled === true)).toBe(true);
    }
    expect(repository.findByUserId).toHaveBeenCalledWith("host-1");
    expect(repository.save).not.toHaveBeenCalled();
  });

  test("persists a complete host matrix for the authenticated user", async () => {
    const repository = createRepository();
    const service = new HostNotificationPreferencesService({ repository, now: () => 777 });
    const payload = createPreferences();
    payload.propertyManager.doubleBookingRisk = false;

    const result = await service.savePreferences("host-1", { "custom:group": "Host" }, payload);

    expect(result.propertyManager.doubleBookingRisk).toBe(false);
    expect(result.engineering).toBeUndefined();
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "host-1",
      created_at: 777,
      updated_at: 777,
      preferences_json: expect.any(String),
    }));
    expect(JSON.parse(repository.getStored().preferences_json).propertyManager.doubleBookingRisk).toBe(false);
  });

  test("preserves stored engineering preferences when a host saves their matrix", async () => {
    const existing = {
      user_id: "host-1",
      preferences_json: JSON.stringify({
        ...createPreferences(),
        engineering: createEngineeringPreferences(false),
      }),
      created_at: 100,
      updated_at: 200,
    };
    const repository = createRepository(existing);
    const service = new HostNotificationPreferencesService({ repository, now: () => 300 });

    await service.savePreferences("host-1", { "custom:group": "Host" }, createPreferences(false));

    expect(JSON.parse(repository.getStored().preferences_json).engineering).toEqual(createEngineeringPreferences(false));
    expect(repository.getStored().created_at).toBe(100);
    expect(repository.getStored().updated_at).toBe(300);
  });

  test("rejects an engineering preference write from a non-admin user", async () => {
    const repository = createRepository();
    const service = new HostNotificationPreferencesService({ repository });
    const payload = {
      ...createPreferences(),
      engineering: createEngineeringPreferences(false),
    };

    await expect(service.savePreferences("host-1", { "custom:group": "Host" }, payload))
      .rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN" });
    expect(repository.save).not.toHaveBeenCalled();
  });

  test("allows Admin and Engineer roles to read and save engineering preferences", async () => {
    expect(hasHostNotificationEngineeringAccess({ "custom:group": "Admin" })).toBe(true);
    expect(hasHostNotificationEngineeringAccess({ "custom:group": "Engineer" })).toBe(true);
    const repository = createRepository();
    const service = new HostNotificationPreferencesService({ repository });
    const payload = {
      ...createPreferences(),
      engineering: createEngineeringPreferences(false),
    };

    const result = await service.savePreferences("admin-1", { "custom:group": "Admin" }, payload);

    expect(result.engineering).toEqual(createEngineeringPreferences(false));
    expect(JSON.parse(repository.getStored().preferences_json).engineering).toEqual(createEngineeringPreferences(false));
  });

  test("accepts Admin/Engineer membership from Cognito groups", () => {
    expect(hasHostNotificationEngineeringAccess({ "cognito:groups": ["Hosts", "Engineer"] })).toBe(true);
  });

  test("rejects unknown categories, events and non-boolean values", async () => {
    const service = new HostNotificationPreferencesService({ repository: createRepository() });

    await expect(service.savePreferences("host-1", { "custom:group": "Host" }, {
      ...createPreferences(),
      extra: {},
    })).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });

    const unknownEvent = createPreferences();
    unknownEvent.finance.unknownEvent = true;
    await expect(service.savePreferences("host-1", { "custom:group": "Host" }, unknownEvent))
      .rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });

    const invalidValue = createPreferences();
    invalidValue.finance.guestPaymentReceived = "false";
    await expect(service.savePreferences("host-1", { "custom:group": "Host" }, invalidValue))
      .rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
  });

  test("rejects user identity fields from the request body", async () => {
    const service = new HostNotificationPreferencesService({ repository: createRepository() });

    await expect(service.savePreferences("host-1", { "custom:group": "Host" }, {
      ...createPreferences(),
      userId: "other-user",
    })).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
  });
});
