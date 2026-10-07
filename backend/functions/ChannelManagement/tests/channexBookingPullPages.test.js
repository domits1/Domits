import ChannexBookingRevisionImportService from "../../.shared/channelManagement/services/channexBookingRevisionImportService.js";

const PAGE_SIZE = 100;
const START_MS = 1_000_000;
const revisions = (count) => Array.from({ length: count }, (_, index) => ({ revisionId: `r-${index + 1}` }));

// A fake Channex feed: oldest first, pages of 100, and an acknowledged revision leaves the feed.
const buildFeed = ({ waiting, failingIds = new Set(), failingPages = new Set() }) => {
  let remaining = [...waiting];
  const requestedPages = [];
  const listBookingRevisionFeed = jest.fn(async (_secret, { page } = {}) => {
    requestedPages.push(page ?? null);
    if (failingPages.has(page)) {
      return { success: false, revisions: [], httpStatus: 503, providerStatus: "BOOKING_FEED_FAILED" };
    }
    const first = ((page ?? 1) - 1) * PAGE_SIZE;
    return {
      success: true,
      revisions: remaining.slice(first, first + PAGE_SIZE),
      meta: { page: page ?? 1, limit: PAGE_SIZE, total: remaining.length },
      providerStatus: "ACTIVE",
    };
  });
  const acknowledge = (revisionId) => {
    remaining = remaining.filter((revision) => revision.revisionId !== revisionId);
  };
  return { listBookingRevisionFeed, acknowledge, requestedPages, failingIds };
};

const buildService = (feed) => {
  const service = new ChannexBookingRevisionImportService({
    roomTypes: { listByAccountId: jest.fn(async () => []) },
    ratePlans: { listByAccountId: jest.fn(async () => []) },
    externalBookingImportRepository: { getDomitsPropertyContext: jest.fn(async () => ({})) },
    channexProviderClient: { listBookingRevisionFeed: feed.listBookingRevisionFeed },
    finalizeChannexSyncResult: async (result) => result,
  });
  const processed = [];
  jest.spyOn(service, "processPulledChannexBookingRevision").mockImplementation(async ({ revision }) => {
    processed.push(revision.revisionId);
    if (feed.failingIds.has(revision.revisionId)) {
      return { revisionId: revision.revisionId, acked: false, unacked: true, result: "skipped-unacked" };
    }
    feed.acknowledge(revision.revisionId);
    return { revisionId: revision.revisionId, acked: true, unacked: false };
  });
  return { service, processed };
};

const pull = (service, deadlineMs) =>
  service.pullLatestChannexBookingsForResolvedContext({
    normalizedUserId: "user-1",
    normalizedDomitsPropertyId: "property-1",
    integration: { id: "account-1" },
    propertyMapping: { externalPropertyId: "channex-1" },
    secret: {},
    ...(deadlineMs === undefined ? {} : { deadlineMs }),
  });

describe("Channex booking pull across feed pages (webhook)", () => {
  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(START_MS);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Unacknowledged revisions stay at the front of the feed. If a whole page keeps failing (a missing room
  // mapping, for example), re-reading page 1 would never reach the bookings behind it.
  test("reaches revisions behind a full page that keeps failing, oldest first", async () => {
    const waiting = revisions(101);
    const feed = buildFeed({ waiting, failingIds: new Set(waiting.slice(0, 100).map((r) => r.revisionId)) });
    const { service, processed } = buildService(feed);

    const result = await pull(service, START_MS + 20_000);

    expect(processed).toEqual(waiting.map((r) => r.revisionId));
    expect(feed.requestedPages).toEqual([1, 2, 2]);
    expect(result.response).toMatchObject({
      fetchedCount: 101,
      ackedCount: 1,
      unackedCount: 100,
      stoppedAtDeadline: false,
      morePages: false,
    });
  });

  test("stops when a page brings no new revisions, so it cannot loop", async () => {
    const waiting = revisions(3);
    const feed = buildFeed({ waiting, failingIds: new Set(waiting.map((r) => r.revisionId)) });
    const { service, processed } = buildService(feed);

    const result = await pull(service, START_MS + 20_000);

    expect(processed).toEqual(["r-1", "r-2", "r-3"]);
    expect(feed.listBookingRevisionFeed).toHaveBeenCalledTimes(2);
    expect(result.response).toMatchObject({ fetchedCount: 3, morePages: false });
  });

  test("processes every revision once when all of them are acknowledged", async () => {
    const feed = buildFeed({ waiting: revisions(2) });
    const { service, processed } = buildService(feed);

    const result = await pull(service, START_MS + 20_000);

    expect(processed).toEqual(["r-1", "r-2"]);
    expect(result.response).toMatchObject({ fetchedCount: 2, ackedCount: 2, overallSuccess: true, morePages: false });
  });

  // The acknowledged revisions are gone, so Channex's retry continues where this pull stopped.
  test("reports more pages when a later page cannot be read", async () => {
    const waiting = revisions(101);
    const feed = buildFeed({
      waiting,
      failingIds: new Set(waiting.slice(0, 100).map((r) => r.revisionId)),
      failingPages: new Set([2]),
    });
    const { service } = buildService(feed);

    const result = await pull(service, START_MS + 20_000);

    expect(result.statusCode).toBe(200);
    expect(result.response).toMatchObject({ fetchedCount: 100, morePages: true, overallSuccess: false });
  });

  test("still answers with the feed failure when the first page cannot be read", async () => {
    const feed = buildFeed({ waiting: revisions(1), failingPages: new Set([1]) });
    const { service } = buildService(feed);

    const result = await pull(service, START_MS + 20_000);

    expect(result.statusCode).toBe(502);
    expect(result.response).toMatchObject({ httpStatus: 503 });
  });

  // Polling and the manual pull pass no deadline and keep reading a single page, as before.
  test("reads one page without asking for a page number when no deadline is given", async () => {
    const waiting = revisions(3);
    const feed = buildFeed({ waiting, failingIds: new Set(waiting.map((r) => r.revisionId)) });
    const { service } = buildService(feed);

    await pull(service, undefined);

    expect(feed.requestedPages).toEqual([null]);
  });
});
