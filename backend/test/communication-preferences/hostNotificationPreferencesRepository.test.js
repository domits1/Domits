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
const { Host_Notification_Preferences } = require("../../ORM/models/Host_Notification_Preferences.js");
const {
  HostNotificationPreferencesRepository,
} = require("../../functions/communication-preferences/data/hostNotificationPreferencesRepository.js");

describe("HostNotificationPreferencesRepository", () => {
  let repository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new HostNotificationPreferencesRepository();
  });

  test("finds preferences only for the authenticated user id", async () => {
    const record = {
      user_id: "host-1",
      preferences_json: "{}",
      created_at: 100,
      updated_at: 200,
    };
    mockTypeOrmRepository.findOne.mockResolvedValue(record);

    await expect(repository.findByUserId("host-1")).resolves.toBe(record);

    expect(Database.getInstance).toHaveBeenCalledTimes(1);
    expect(mockDataSource.getRepository).toHaveBeenCalledWith(Host_Notification_Preferences);
    expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({
      where: { user_id: "host-1" },
    });
  });

  test("returns null when the user has no saved preferences", async () => {
    mockTypeOrmRepository.findOne.mockResolvedValue(null);

    await expect(repository.findByUserId("host-2")).resolves.toBeNull();
    expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({
      where: { user_id: "host-2" },
    });
  });

  test("saves the user-scoped matrix record through the registered entity", async () => {
    const record = {
      user_id: "host-1",
      preferences_json: JSON.stringify({ bookings: { bookingCreated: false } }),
      created_at: 100,
      updated_at: 300,
    };
    mockTypeOrmRepository.save.mockResolvedValue(record);

    await expect(repository.save(record)).resolves.toBe(record);

    expect(Database.getInstance).toHaveBeenCalledTimes(1);
    expect(mockDataSource.getRepository).toHaveBeenCalledWith(Host_Notification_Preferences);
    expect(mockTypeOrmRepository.save).toHaveBeenCalledWith(record);
  });
});
