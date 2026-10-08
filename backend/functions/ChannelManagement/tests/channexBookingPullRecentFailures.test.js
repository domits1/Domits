import {
  START_MS,
  buildFeed,
  buildImportService,
  buildRevisionStore,
  freezeNowAtStart,
  pullForProperty,
  revisions,
  spyOnRevisionProcessing,
} from "./fixtures/channexBookingPullFixtures.js";

const WEBHOOK_BUDGET_MS = 20_000;
const MINUTE_MS = 60_000;

// One webhook delivery: a fresh budget from "now", the way the webhook service sets it.
const deliverWebhook = (service) =>
  pullForProperty(service, { trigger: "WEBHOOK", deadlineMs: Date.now() + WEBHOOK_BUDGET_MS });

const waitMinutes = (minutes) => Date.now.mockReturnValue(Date.now() + minutes * MINUTE_MS);

const buildScenario = ({ waiting, failingIds, temporarilyFailingIds, msPerRevision = 300 }) => {
  const feed = buildFeed({ waiting, failingIds });
  const store = buildRevisionStore();
  const service = buildImportService(
    { listBookingRevisionFeed: feed.listBookingRevisionFeed },
    { channexBookingRevisions: store }
  );
  const processed = spyOnRevisionProcessing(service, feed, { msPerRevision, temporarilyFailingIds });
  return { service, processed, store };
};

// Each webhook only gets 20 seconds. If every delivery re-tried the same failing revisions from the start
// of the feed, a booking behind enough of them would never be reached. Revisions that just failed
// permanently are therefore skipped for 10 minutes, across deliveries.
describe("Channex booking webhook skips recently failed revisions", () => {
  freezeNowAtStart();

  test("reaches a booking behind more failing revisions than one delivery can process", async () => {
    const waiting = revisions(151);
    const failingIds = new Set(waiting.slice(0, 150).map((r) => r.revisionId));
    const { service, processed } = buildScenario({ waiting, failingIds });

    const outcomes = [];
    for (let delivery = 0; delivery < 3; delivery += 1) {
      outcomes.push((await deliverWebhook(service)).response);
      waitMinutes(1);
    }

    expect(outcomes[0].stoppedAtDeadline).toBe(true);
    expect(processed).toContain("r-151");
    expect(outcomes.at(-1)).toMatchObject({ ackedCount: 1, stoppedAtDeadline: false });
    // Within 10 minutes no failing revision is tried twice.
    expect(new Set(processed).size).toBe(processed.length);
  });

  test("tries a permanently failing revision again after 10 minutes", async () => {
    const waiting = revisions(1);
    const { service, processed } = buildScenario({ waiting, failingIds: new Set(["r-1"]), msPerRevision: 0 });

    await deliverWebhook(service);
    waitMinutes(5);
    await deliverWebhook(service);
    waitMinutes(6);
    await deliverWebhook(service);

    expect(processed).toEqual(["r-1", "r-1"]);
  });

  // A temporary failure (a DSQL conflict here) must be retried on Channex's next delivery, a minute later.
  test("does not skip a revision that failed temporarily", async () => {
    const waiting = revisions(1);
    const { service, processed, store } = buildScenario({
      waiting,
      failingIds: new Set(),
      temporarilyFailingIds: new Set(["r-1"]),
      msPerRevision: 0,
    });

    await deliverWebhook(service);
    waitMinutes(1);
    await deliverWebhook(service);

    expect(processed).toEqual(["r-1", "r-1"]);
    expect(store.rows.get("r-1")).toMatchObject({ acknowledgementState: "RECEIVED" });
  });

  test("records a permanent failure so the next delivery can skip it", async () => {
    const waiting = revisions(1);
    const { service, store } = buildScenario({ waiting, failingIds: new Set(["r-1"]), msPerRevision: 0 });

    const result = await deliverWebhook(service);

    expect(store.rows.get("r-1")).toEqual({ acknowledgementState: "IMPORT_FAILED", updatedAt: START_MS });
    expect(result.response).toMatchObject({ unackedCount: 1, ackedCount: 0 });
  });

  // Skipped revisions stay in the Channex feed, so they still count as unacknowledged.
  test("counts a skipped revision as unacknowledged", async () => {
    const waiting = revisions(1);
    const { service, processed } = buildScenario({ waiting, failingIds: new Set(["r-1"]), msPerRevision: 0 });

    await deliverWebhook(service);
    waitMinutes(1);
    const result = await deliverWebhook(service);

    expect(processed).toEqual(["r-1"]);
    expect(result.response).toMatchObject({ unackedCount: 1, skippedCount: 1 });
  });
});
