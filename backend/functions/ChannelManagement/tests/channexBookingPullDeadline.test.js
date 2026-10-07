import {
  PULL_CONTEXT,
  START_MS,
  buildImportService,
  freezeNowAtStart,
  pullForProperty,
} from "./fixtures/channexBookingPullFixtures.js";

const REVISIONS = [{ revisionId: "revision-1" }, { revisionId: "revision-2" }, { revisionId: "revision-3" }];

const buildService = () =>
  buildImportService({
    listBookingRevisionFeed: jest.fn(async () => ({
      success: true,
      revisions: REVISIONS,
      meta: { page: 1, total: 3 },
      providerStatus: "ACTIVE",
    })),
  });

// Each processed revision takes 10 seconds of fake time.
const processTakingTenSeconds = (service) =>
  jest.spyOn(service, "processPulledChannexBookingRevision").mockImplementation(async ({ revision }) => {
    Date.now.mockReturnValue(Date.now() + 10_000);
    return { revisionId: revision.revisionId, acked: true, unacked: false };
  });

const collect = (service, deadlineMs) =>
  service.collectPulledChannexBookingImports({
    providerResult: { revisions: REVISIONS },
    integration: PULL_CONTEXT.integration,
    normalizedDomitsPropertyId: PULL_CONTEXT.normalizedDomitsPropertyId,
    propertyMapping: PULL_CONTEXT.propertyMapping,
    secret: PULL_CONTEXT.secret,
    deadlineMs,
  });

describe("Channex booking pull deadline", () => {
  freezeNowAtStart();

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

    const result = await pullForProperty(service, { deadlineMs: START_MS + 15_000 });

    expect(result.response).toMatchObject({ stoppedAtDeadline: true, overallSuccess: false, fetchedCount: 3 });
  });

  test("reports stoppedAtDeadline false when the pull finished within the deadline", async () => {
    const service = buildService();
    processTakingTenSeconds(service);

    const result = await pullForProperty(service, { deadlineMs: START_MS + 60_000 });

    expect(result.response).toMatchObject({ stoppedAtDeadline: false, overallSuccess: true });
  });

  // Polling and the manual pull pass no deadline; their response must stay exactly as before.
  test("leaves stoppedAtDeadline out of the response when no deadline is given", async () => {
    const service = buildService();
    processTakingTenSeconds(service);

    const result = await pullForProperty(service);

    expect(result.response).not.toHaveProperty("stoppedAtDeadline");
    expect(result.response).not.toHaveProperty("feedMeta");
    expect(result.response.overallSuccess).toBe(true);
  });

  // The webhook logs the feed's paging fields, so its log line shows how many revisions wait.
  test("passes the feed meta on when a deadline is given", async () => {
    const service = buildService();
    processTakingTenSeconds(service);

    const result = await pullForProperty(service, { deadlineMs: START_MS + 60_000 });

    expect(result.response.feedMeta).toEqual({ page: 1, total: 3 });
  });
});
