const mockTypeOrmRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
};

const mockDataSource = {
  getRepository: jest.fn(() => mockTypeOrmRepository),
};

jest.mock("database", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(async () => mockDataSource),
  },
}));

const Database = require("database").default;
const { Communication_Preferences } = require("../../ORM/models/Communication_Preferences.js");
const { CommunicationPreferencesRepository } = require("../../functions/communication-preferences/data/repository.js");

const fullRecord = {
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

describe("CommunicationPreferencesRepository", () => {
  let repository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new CommunicationPreferencesRepository();
  });

  test("findByUserIdAndPersona queries the exact composite identity", async () => {
    mockTypeOrmRepository.findOne.mockResolvedValue(fullRecord);

    await expect(repository.findByUserIdAndPersona("user-1", "HOST")).resolves.toBe(fullRecord);

    expect(Database.getInstance).toHaveBeenCalledTimes(1);
    expect(mockDataSource.getRepository).toHaveBeenCalledWith(Communication_Preferences);
    expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({ where: { user_id: "user-1", persona: "HOST" } });
  });

  test("findByUserIdAndPersona returns null for a missing composite row", async () => {
    mockTypeOrmRepository.findOne.mockResolvedValue(null);

    await expect(repository.findByUserIdAndPersona("missing-user", "GUEST")).resolves.toBeNull();

    expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({ where: { user_id: "missing-user", persona: "GUEST" } });
  });

  test("save inserts a complete communication preferences record", async () => {
    mockTypeOrmRepository.save.mockResolvedValue(fullRecord);

    await expect(repository.save(fullRecord)).resolves.toBe(fullRecord);

    expect(Database.getInstance).toHaveBeenCalledTimes(1);
    expect(mockDataSource.getRepository).toHaveBeenCalledWith(Communication_Preferences);
    expect(mockTypeOrmRepository.save).toHaveBeenCalledWith(fullRecord);
  });

  test("save passes the exact user_id, persona, and all preference columns to TypeORM", async () => {
    mockTypeOrmRepository.save.mockResolvedValue(fullRecord);

    await repository.save(fullRecord);

    expect(mockTypeOrmRepository.save).toHaveBeenCalledWith({
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
    });
  });

  test("subsequent save updates/upserts the same user/persona without creating a duplicate row", async () => {
    const rows = new Map();
    mockTypeOrmRepository.save.mockImplementation(async (record) => {
      const key = `${record.user_id}:${record.persona}`;
      rows.set(key, { ...(rows.get(key) || {}), ...record });
      return rows.get(key);
    });

    await repository.save({ ...fullRecord, created_at: 100, updated_at: 200 });
    await repository.save({ ...fullRecord, created_at: 100, updated_at: 300, messages_sms: false });

    expect(rows.size).toBe(1);
    expect(rows.get("user-1:HOST")).toEqual(expect.objectContaining({
      user_id: "user-1",
      persona: "HOST",
      created_at: 100,
      updated_at: 300,
      messages_sms: false,
    }));
    expect(mockTypeOrmRepository.save).toHaveBeenCalledTimes(2);
  });

  test("HOST and GUEST rows for the same user remain independent", async () => {
    const rows = new Map();
    mockTypeOrmRepository.save.mockImplementation(async (record) => {
      rows.set(`${record.user_id}:${record.persona}`, { ...record });
      return record;
    });

    await repository.save({ ...fullRecord, persona: "HOST", messages_sms: false, created_at: 100, updated_at: 200 });
    await repository.save({ ...fullRecord, persona: "GUEST", messages_sms: true, created_at: 300, updated_at: 400 });

    expect(rows.size).toBe(2);
    expect(rows.get("user-1:HOST")).toEqual(expect.objectContaining({ persona: "HOST", messages_sms: false }));
    expect(rows.get("user-1:GUEST")).toEqual(expect.objectContaining({ persona: "GUEST", messages_sms: true }));
  });

  test("update records preserve created_at and change updated_at when provided by the service", async () => {
    const updateRecord = {
      ...fullRecord,
      created_at: 100,
      updated_at: 999,
      reservation_sms: false,
      messages_email: true,
    };
    mockTypeOrmRepository.save.mockResolvedValue(updateRecord);

    await repository.save(updateRecord);

    expect(mockTypeOrmRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "user-1",
      persona: "HOST",
      created_at: 100,
      updated_at: 999,
      reservation_sms: false,
      messages_email: true,
    }));
  });
});
