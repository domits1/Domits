const mockListSources = jest.fn();
const mockUpsertSource = jest.fn();
jest.mock("../../functions/General-Bookings-CRUD-Bookings-develop/data/externalCalendarRepository.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
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

const ExternalCalendarService =
  require("../../functions/General-Bookings-CRUD-Bookings-develop/business/externalCalendarService.js").default;
const ConflictException =
  require("../../functions/General-Bookings-CRUD-Bookings-develop/util/exception/ConflictException.js").default;
const ServiceUnavailableException =
  require("../../functions/General-Bookings-CRUD-Bookings-develop/util/exception/ServiceUnavailableException.js").default;

const BASE_RANGE = {
  arrivalMs: Date.parse("2026-06-15T00:00:00.000Z"),
  departureMs: Date.parse("2026-06-17T00:00:00.000Z"),
};

const buildEvent = (dtstart, dtend) => ({ Dtstart: dtstart, Dtend: dtend });

describe("ExternalCalendarService cross-channel double-booking guard", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  describe("blocks dates across channels", () => {
    it.each([
      {
        description: "no external calendar sources are registered",
        sources: [],
        responsesByUrl: {},
        shouldReject: false,
        expectedFetchCalls: 0,
      },
      {
        description: "the only source's blocked dates don't overlap the requested range",
        sources: [{ sourceId: "airbnb", calendarUrl: "https://airbnb.example/a.ics" }],
        responsesByUrl: {
          "https://airbnb.example/a.ics": { events: [buildEvent("20260701", "20260703")], meta: {} },
        },
        shouldReject: false,
        expectedFetchCalls: 1,
      },
      {
        description: "a single source blocks a requested date",
        sources: [{ sourceId: "airbnb", calendarUrl: "https://airbnb.example/a.ics" }],
        responsesByUrl: {
          "https://airbnb.example/a.ics": { events: [buildEvent("20260615", "20260616")], meta: {} },
        },
        shouldReject: true,
        expectedFetchCalls: 1,
      },
      {
        description: "only the second of two sources blocks the requested range",
        sources: [
          { sourceId: "airbnb", calendarUrl: "https://airbnb.example/a.ics" },
          { sourceId: "booking", calendarUrl: "https://booking.example/b.ics" },
        ],
        responsesByUrl: {
          "https://airbnb.example/a.ics": { events: [buildEvent("20260701", "20260703")], meta: {} },
          "https://booking.example/b.ics": { events: [buildEvent("20260615", "20260616")], meta: {} },
        },
        shouldReject: true,
        expectedFetchCalls: 2,
      },
      {
        description: "sources missing a sourceId or calendarUrl are skipped without fetching",
        sources: [
          { sourceId: "", calendarUrl: "https://airbnb.example/a.ics" },
          { sourceId: "booking", calendarUrl: "" },
        ],
        responsesByUrl: {},
        shouldReject: false,
        expectedFetchCalls: 0,
      },
    ])("$description", async ({ sources, responsesByUrl, shouldReject, expectedFetchCalls }) => {
      mockListSources.mockResolvedValue(sources);
      mockFetchExternalCalendar.mockImplementation(({ calendarUrl }) => Promise.resolve(responsesByUrl[calendarUrl]));
      const service = new ExternalCalendarService();

      const assertion = service.ensureNoExternalConflict({ propertyId: "property-1", ...BASE_RANGE });

      if (shouldReject) {
        await expect(assertion).rejects.toThrow(ConflictException);
      } else {
        await expect(assertion).resolves.toBe(undefined);
      }
      expect(mockFetchExternalCalendar).toHaveBeenCalledTimes(expectedFetchCalls);
      expect(mockUpsertSource).toHaveBeenCalledTimes(expectedFetchCalls);
    });
  });

  describe("resilience when a source can't be refreshed", () => {
    test("throws ServiceUnavailableException and skips the upsert when the calendar fetch fails", async () => {
      const sources = [{ sourceId: "airbnb", calendarUrl: "https://airbnb.example/a.ics" }];
      mockListSources.mockResolvedValue(sources);
      mockFetchExternalCalendar.mockRejectedValue(new Error("network down"));
      const service = new ExternalCalendarService();

      await expect(service.ensureNoExternalConflict({ propertyId: "property-1", ...BASE_RANGE })).rejects.toThrow(
        ServiceUnavailableException
      );

      expect(mockUpsertSource).not.toHaveBeenCalled();
    });
  });
});
