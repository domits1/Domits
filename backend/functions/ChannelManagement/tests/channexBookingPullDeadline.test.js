import ChannexBookingRevisionImportService from "../../.shared/channelManagement/services/channexBookingRevisionImportService.js";

const START_MS = 1_000_000;
const REVISIONS = [{ revisionId: "revision-1" }, { revisionId: "revision-2" }, { revisionId: "revision-3" }];

const buildService = () => {
  const service = new ChannexBookingRevisionImportService({
    roomTypes: { listByAccountId: jest.fn(async () => []) },
    ratePlans: { listByAccountId: jest.fn(async () => []) },
    externalBookingImportRepository: { getDomitsPropertyContext: jest.fn(async () => ({})) },
    channexProviderClient: {
      listBookingRevisionFeed: jest.fn(async () => ({ success: true, revisions: REVISIONS, providerStatus: "ACTIVE" })),
    },
    finalizeChannexSyncResult: async (result) => result,
  });
  return service;
};

// Each processed revision takes 10 seconds of fake time.
const processTakingTenSeconds = (service) =>
  jest.spyOn(service, "processPulledChannexBookingRevision").mockImplementation(async ({ revision }) => {
    Date.now.mockReturnValue(Date.now() + 10_000);
    return { revisionId: revision.revisionId, acked: true, unacked: false };
  });

const collect = (service, deadlineMs) =>
  service.collectPulledChannexBookingImports({
    providerResult: { revisions: REVISIONS },
    integration: { id: "account-1" },
    normalizedDomitsPropertyId: "property-1",
    propertyMapping: { externalPropertyId: "channex-1" },
    secret: {},
    deadlineMs,
  });

const pull = (service, deadlineMs) =>
  service.pullLatestChannexBookingsForResolvedContext({
    normalizedUserId: "user-1",
    normalizedDomitsPropertyId: "property-1",
    integration: { id: "account-1" },
    propertyMapping: { externalPropertyId: "channex-1" },
    secret: {},
    ...(deadlineMs === undefined ? {} : { deadlineMs }),
  });

describe("Channex booking pull deadline", () => {
  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(START_MS);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // API Gateway gives up after 29 seconds, so a webhook pull must stop in time and leave the rest
  // unacknowledged in the feed for Channex's retry.
  test("stops before the next revision once the deadline has passed", async () => {
    const service = buildService();
    const process = processTakingTenSeconds(service);

    const items = await collect(service, START_MS + 15_000);

    expect(process).toHaveBeenCalledTimes(2);
    expect(items.map((item) => item.revisionId)).toEqual(["revision-1", "revision-2"]);
  });

  test("processes every revision when no deadline is given", async () => {
    const service = buildService();
    const process = processTakingTenSeconds(service);

    const items = await collect(service, undefined);

    expect(process).toHaveBeenCalledTimes(3);
    expect(items).toHaveLength(3);
  });

  test("reports a pull stopped at the deadline as not fully successful", async () => {
    const service = buildService();
    processTakingTenSeconds(service);

    const result = await pull(service, START_MS + 15_000);

    expect(result.response).toMatchObject({ stoppedAtDeadline: true, overallSuccess: false, fetchedCount: 3 });
  });

  test("reports stoppedAtDeadline false when the pull finished within the deadline", async () => {
    const service = buildService();
    processTakingTenSeconds(service);

    const result = await pull(service, START_MS + 60_000);

    expect(result.response).toMatchObject({ stoppedAtDeadline: false, overallSuccess: true });
  });

  // Polling and the manual pull pass no deadline; their response must stay exactly as before.
  test("leaves stoppedAtDeadline out of the response when no deadline is given", async () => {
    const service = buildService();
    processTakingTenSeconds(service);

    const result = await pull(service, undefined);

    expect(result.response).not.toHaveProperty("stoppedAtDeadline");
    expect(result.response.overallSuccess).toBe(true);
  });
});
