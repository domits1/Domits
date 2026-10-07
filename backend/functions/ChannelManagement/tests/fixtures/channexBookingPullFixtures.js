import ChannexBookingRevisionImportService from "../../../.shared/channelManagement/services/channexBookingRevisionImportService.js";

// Shared setup for the Channex booking pull tests: one property to pull for, the import service with
// stubbed repositories, a fake Channex feed, and a clock frozen at START_MS.
export const START_MS = 1_000_000;
export const FEED_PAGE_SIZE = 100;

export const PULL_CONTEXT = {
  normalizedUserId: "user-1",
  normalizedDomitsPropertyId: "property-1",
  integration: { id: "account-1" },
  propertyMapping: { externalPropertyId: "channex-1" },
  secret: {},
};

export const revisions = (count) => Array.from({ length: count }, (_, index) => ({ revisionId: `r-${index + 1}` }));

// Remembers acknowledgement states between pulls, like the stored revision rows.
export const buildRevisionStore = () => {
  const rows = new Map();
  return {
    rows,
    listByRevisionIds: jest.fn(async (_integrationAccountId, revisionIds) =>
      revisionIds.filter((revisionId) => rows.has(revisionId)).map((revisionId) => ({ revisionId, ...rows.get(revisionId) }))
    ),
    setAcknowledgementState: jest.fn(async (_integrationAccountId, revisionIds, acknowledgementState) => {
      revisionIds.forEach((revisionId) => rows.set(revisionId, { acknowledgementState, updatedAt: Date.now() }));
    }),
  };
};

export const buildImportService = (channexProviderClient, { channexBookingRevisions = buildRevisionStore() } = {}) =>
  new ChannexBookingRevisionImportService({
    roomTypes: { listByAccountId: jest.fn(async () => []) },
    ratePlans: { listByAccountId: jest.fn(async () => []) },
    externalBookingImportRepository: { getDomitsPropertyContext: jest.fn(async () => ({})) },
    channexBookingRevisions,
    channexProviderClient,
    finalizeChannexSyncResult: async (result) => result,
  });

// A fake Channex feed: oldest first, pages of 100, and an acknowledged revision leaves the feed.
export const buildFeed = ({ waiting, failingIds = new Set(), failingPages = new Set() }) => {
  let remaining = [...waiting];
  const requestedPages = [];
  const listBookingRevisionFeed = jest.fn(async (_secret, { page } = {}) => {
    requestedPages.push(page ?? null);
    if (failingPages.has(page)) {
      return { success: false, revisions: [], httpStatus: 503, providerStatus: "BOOKING_FEED_FAILED" };
    }
    const first = ((page ?? 1) - 1) * FEED_PAGE_SIZE;
    return {
      success: true,
      revisions: remaining.slice(first, first + FEED_PAGE_SIZE),
      meta: { page: page ?? 1, limit: FEED_PAGE_SIZE, total: remaining.length },
      providerStatus: "ACTIVE",
    };
  });
  const acknowledge = (revisionId) => {
    remaining = remaining.filter((revision) => revision.revisionId !== revisionId);
  };
  return { listBookingRevisionFeed, acknowledge, requestedPages, failingIds };
};

// Fakes the per-revision import: failing ids fail permanently, temporarily failing ids fail with a DSQL
// conflict, and everything else is acknowledged. Each revision can cost some fake time.
export const spyOnRevisionProcessing = (service, feed, { msPerRevision = 0, temporarilyFailingIds = new Set() } = {}) => {
  const processed = [];
  jest.spyOn(service, "processPulledChannexBookingRevision").mockImplementation(async ({ revision }) => {
    processed.push(revision.revisionId);
    Date.now.mockReturnValue(Date.now() + msPerRevision);
    if (temporarilyFailingIds.has(revision.revisionId)) {
      return { revisionId: revision.revisionId, acked: false, unacked: true, errors: [{ code: "40001" }] };
    }
    if (feed.failingIds.has(revision.revisionId)) {
      return { revisionId: revision.revisionId, acked: false, unacked: true, result: "skipped-unacked" };
    }
    feed.acknowledge(revision.revisionId);
    return { revisionId: revision.revisionId, acked: true, unacked: false };
  });
  return processed;
};

export const pullForProperty = (service, overrides = {}) =>
  service.pullLatestChannexBookingsForResolvedContext({ ...PULL_CONTEXT, ...overrides });

// Call inside a describe block.
export const freezeNowAtStart = () => {
  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(START_MS);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
};
