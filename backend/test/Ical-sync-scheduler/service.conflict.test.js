const mockListSources = jest.fn();
const mockUpsertSource = jest.fn();
jest.mock("../../functions/Ical-sync-scheduler/data/repository.js", () => ({
  __esModule: true,
  Repository: jest.fn().mockImplementation(() => ({
    listSources: mockListSources,
    upsertSource: mockUpsertSource,
  })),
}));

const mockFetchExternalCalendar = jest.fn();
jest.mock("../../functions/.shared/icalTransport.js", () => ({
  __esModule: true,
  buildSourceUpsertPayload: jest.fn((args) => args),
  fetchExternalCalendar: (...args) => mockFetchExternalCalendar(...args),
}));

const { Service } = require("../../functions/Ical-sync-scheduler/business/service/service.js");

const MINUTES = 60 * 1000;
const buildSource = (overrides = {}) => ({
  propertyId: "property-1",
  sourceId: "airbnb",
  calendarUrl: "https://airbnb.example/a.ics",
  lastSyncAt: null,
  ...overrides,
});

describe("Ical-sync-scheduler Service automatic sync reliability", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockFetchExternalCalendar.mockResolvedValue({ events: [], meta: {} });
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  describe("scenario coverage for sync due rules", () => {
    it.each([
      {
        description: "a source with no lastSyncAt is due",
        lastSyncAt: null,
        expectedDue: true,
      },
      {
        description: "a source with an unparseable lastSyncAt is due (fails open)",
        lastSyncAt: "not-a-date",
        expectedDue: true,
      },
      {
        description: "a source last synced before the interval cutoff is due",
        lastSyncAt: new Date(Date.now() - 20 * MINUTES).toISOString(),
        expectedDue: true,
      },
      {
        description: "a source last synced after the interval cutoff is not due",
        lastSyncAt: new Date(Date.now() - 1 * MINUTES).toISOString(),
        expectedDue: false,
      },
    ])("$description", async ({ lastSyncAt, expectedDue }) => {
      mockListSources.mockResolvedValue([buildSource({ lastSyncAt })]);
      const service = new Service();

      const result = await service.runScheduledSync({ syncIntervalMinutes: 10 });

      expect(result.due).toBe(expectedDue ? 1 : 0);
      expect(mockFetchExternalCalendar).toHaveBeenCalledTimes(expectedDue ? 1 : 0);
      expect(mockUpsertSource).toHaveBeenCalledTimes(expectedDue ? 1 : 0);
    });
  });

  test("force sync bypasses the due-filter for sources not yet due", async () => {
    const notDueSource = buildSource({ lastSyncAt: new Date(Date.now() - 1 * MINUTES).toISOString() });
    mockListSources.mockResolvedValue([notDueSource]);
    const service = new Service();

    const result = await service.runScheduledSync({ syncIntervalMinutes: 10, force: true });

    expect(result.due).toBe(1);
    expect(mockFetchExternalCalendar).toHaveBeenCalledTimes(1);
    expect(mockUpsertSource).toHaveBeenCalledTimes(1);
  });

  test("one source's fetch failure does not block the rest of the batch", async () => {
    const healthySource = buildSource({ sourceId: "airbnb" });
    const brokenSource = buildSource({ sourceId: "booking", calendarUrl: "https://booking.example/b.ics" });
    mockListSources.mockResolvedValue([healthySource, brokenSource]);
    mockFetchExternalCalendar.mockImplementation(({ calendarUrl }) =>
      calendarUrl === "https://booking.example/b.ics"
        ? Promise.reject(new Error("network down"))
        : Promise.resolve({ events: [], meta: {} })
    );
    const service = new Service();

    const result = await service.runScheduledSync({ force: true });

    expect(result.ok).toBe(true);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
    expect(mockFetchExternalCalendar).toHaveBeenCalledTimes(2);
    expect(mockUpsertSource).toHaveBeenCalledTimes(1);
  });

  test("a source missing propertyId, sourceId or calendarUrl is skipped without fetching", async () => {
    const malformedSource = buildSource({ calendarUrl: "" });
    mockListSources.mockResolvedValue([malformedSource]);
    const service = new Service();

    const result = await service.runScheduledSync({ force: true });

    expect(mockFetchExternalCalendar).not.toHaveBeenCalled();
    expect(mockUpsertSource).not.toHaveBeenCalled();
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
  });
});
