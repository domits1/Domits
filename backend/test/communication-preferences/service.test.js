const {
  CommunicationPreferencesService,
  DEFAULT_COMMUNICATION_PREFERENCES,
  normalizePersona,
} = require("../../functions/communication-preferences/business/service/service.js");

const completePreferences = (overrides = {}) => ({
  reservation: {
    email: true,
    sms: false,
    push: true,
    ...(overrides.reservation || {}),
  },
  cancellation: {
    email: true,
    sms: true,
    push: true,
    ...(overrides.cancellation || {}),
  },
  messages: {
    email: true,
    sms: false,
    push: true,
    ...(overrides.messages || {}),
  },
});

const existingRecord = {
  user_id: "user-1",
  persona: "HOST",
  reservation_email: true,
  reservation_sms: true,
  reservation_push: false,
  cancellation_email: true,
  cancellation_sms: false,
  cancellation_push: true,
  messages_email: false,
  messages_sms: true,
  messages_push: false,
  created_at: 100,
  updated_at: 200,
};

const createRepository = ({ rows = [] } = {}) => {
  const records = new Map(rows.map((row) => [`${row.user_id}:${row.persona}`, { ...row }]));
  return {
    records,
    findByUserIdAndPersona: jest.fn(async (userId, persona) => records.get(`${userId}:${persona}`) || null),
    save: jest.fn(async (record) => {
      records.set(`${record.user_id}:${record.persona}`, { ...record });
      return records.get(`${record.user_id}:${record.persona}`);
    }),
  };
};

const createService = ({ rows = [], now = 12345 } = {}) => {
  const repository = createRepository({ rows });
  return {
    repository,
    service: new CommunicationPreferencesService({ repository, now: () => now }),
  };
};

describe("CommunicationPreferencesService", () => {
  test("normalizes supported personas", () => {
    expect(normalizePersona("host")).toBe("HOST");
    expect(normalizePersona("GUEST")).toBe("GUEST");
  });

  test("rejects missing persona", () => {
    expect(() => normalizePersona()).toThrow("persona must be one of HOST or GUEST.");
  });

  test("rejects invalid persona", () => {
    expect(() => normalizePersona("admin")).toThrow("persona must be one of HOST or GUEST.");
  });

  test("GET returns defaults when no row exists for the user/persona", async () => {
    const { service, repository } = createService();

    await expect(service.getPreferences("user-1", "HOST")).resolves.toEqual(DEFAULT_COMMUNICATION_PREFERENCES);
    expect(repository.findByUserIdAndPersona).toHaveBeenCalledWith("user-1", "HOST");
    expect(repository.save).not.toHaveBeenCalled();
  });

  test("GET returns existing preferences scoped to persona", async () => {
    const { service, repository } = createService({ rows: [existingRecord] });

    await expect(service.getPreferences("user-1", "host")).resolves.toEqual({
      reservation: { email: true, sms: true, push: false },
      cancellation: { email: true, sms: false, push: true },
      messages: { email: false, sms: true, push: false },
    });
    expect(repository.findByUserIdAndPersona).toHaveBeenCalledWith("user-1", "HOST");
  });

  test("GET HOST does not return a GUEST row for the same user", async () => {
    const guestRecord = { ...existingRecord, persona: "GUEST", messages_sms: false };
    const { service } = createService({ rows: [guestRecord] });

    await expect(service.getPreferences("user-1", "HOST")).resolves.toEqual(DEFAULT_COMMUNICATION_PREFERENCES);
  });

  test("GET GUEST does not return a HOST row for the same user", async () => {
    const { service } = createService({ rows: [existingRecord] });

    await expect(service.getPreferences("user-1", "GUEST")).resolves.toEqual(DEFAULT_COMMUNICATION_PREFERENCES);
  });

  test("PUT persists valid complete HOST preferences for the authenticated user/persona", async () => {
    const { service, repository } = createService({ now: 777 });
    const payload = completePreferences({
      reservation: { sms: true, push: false },
      cancellation: { sms: false },
      messages: { email: false, sms: true, push: false },
    });

    await expect(service.savePreferences("user-1", "host", payload)).resolves.toEqual({
      reservation: { email: true, sms: true, push: false },
      cancellation: { email: true, sms: false, push: true },
      messages: { email: false, sms: true, push: false },
    });

    expect(repository.save).toHaveBeenCalledWith({
      user_id: "user-1",
      persona: "HOST",
      reservation_email: true,
      reservation_sms: true,
      reservation_push: false,
      cancellation_email: true,
      cancellation_sms: false,
      cancellation_push: true,
      messages_email: false,
      messages_sms: true,
      messages_push: false,
      created_at: 777,
      updated_at: 777,
    });
  });

  test("PUT HOST does not modify GUEST for the same user", async () => {
    const guestRecord = { ...existingRecord, persona: "GUEST", messages_sms: true, created_at: 10, updated_at: 20 };
    const { service, repository } = createService({ rows: [guestRecord], now: 999 });

    await service.savePreferences("user-1", "HOST", completePreferences({ messages: { sms: false } }));

    expect(repository.records.get("user-1:GUEST")).toEqual(guestRecord);
    expect(repository.records.get("user-1:HOST")).toEqual(expect.objectContaining({
      persona: "HOST",
      messages_sms: false,
      created_at: 999,
      updated_at: 999,
    }));
  });

  test("PUT GUEST does not modify HOST for the same user", async () => {
    const hostRecord = { ...existingRecord, persona: "HOST", messages_sms: true, created_at: 10, updated_at: 20 };
    const { service, repository } = createService({ rows: [hostRecord], now: 999 });

    await service.savePreferences("user-1", "GUEST", completePreferences({ messages: { sms: false } }));

    expect(repository.records.get("user-1:HOST")).toEqual(hostRecord);
    expect(repository.records.get("user-1:GUEST")).toEqual(expect.objectContaining({
      persona: "GUEST",
      messages_sms: false,
      created_at: 999,
      updated_at: 999,
    }));
  });

  test("PUT preserves created_at independently when updating an existing persona row", async () => {
    const { service, repository } = createService({ rows: [existingRecord], now: 999 });

    await service.savePreferences("user-1", "HOST", completePreferences());

    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "user-1",
      persona: "HOST",
      created_at: 100,
      updated_at: 999,
    }));
  });

  test("rejects unknown top-level fields", async () => {
    const { service, repository } = createService();

    await expect(service.savePreferences("user-1", "HOST", {
      ...completePreferences(),
      marketing: { email: true, sms: false, push: true },
    })).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    expect(repository.save).not.toHaveBeenCalled();
  });

  test("rejects unknown nested fields", async () => {
    const { service, repository } = createService();

    await expect(service.savePreferences("user-1", "HOST", completePreferences({
      messages: { whatsapp: true },
    }))).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    expect(repository.save).not.toHaveBeenCalled();
  });

  test("rejects non-boolean values", async () => {
    const { service, repository } = createService();

    await expect(service.savePreferences("user-1", "HOST", completePreferences({
      reservation: { sms: "false" },
    }))).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    expect(repository.save).not.toHaveBeenCalled();
  });

  test("rejects spoofed userId in the body", async () => {
    const { service, repository } = createService();

    await expect(service.savePreferences("user-1", "HOST", {
      userId: "other-user",
      ...completePreferences(),
    })).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    expect(repository.save).not.toHaveBeenCalled();
  });

  test("forces mandatory reservation email to true", async () => {
    const { service, repository } = createService();

    const response = await service.savePreferences("user-1", "HOST", completePreferences({
      reservation: { email: false },
    }));

    expect(response.reservation.email).toBe(true);
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      reservation_email: true,
    }));
  });

  test("forces mandatory cancellation email to true", async () => {
    const { service, repository } = createService();

    const response = await service.savePreferences("user-1", "HOST", completePreferences({
      cancellation: { email: false },
    }));

    expect(response.cancellation.email).toBe(true);
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      cancellation_email: true,
    }));
  });
});
