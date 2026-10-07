import {
  START_MS,
  buildFeed,
  buildImportService,
  freezeNowAtStart,
  pullForProperty,
  revisions,
  spyOnRevisionProcessing,
} from "./fixtures/channexBookingPullFixtures.js";

const WEBHOOK_DEADLINE = { deadlineMs: START_MS + 20_000 };

const buildService = (feed) => {
  const service = buildImportService({ listBookingRevisionFeed: feed.listBookingRevisionFeed });
  const processed = spyOnRevisionProcessing(service, feed);
  return { service, processed };
};

describe("Channex booking pull across feed pages (webhook)", () => {
  freezeNowAtStart();

  // Unacknowledged revisions stay at the front of the feed. If a whole page keeps failing (a missing room
  // mapping, for example), re-reading page 1 would never reach the bookings behind it.
  test("reaches revisions behind a full page that keeps failing, oldest first", async () => {
    const waiting = revisions(101);
    const feed = buildFeed({ waiting, failingIds: new Set(waiting.slice(0, 100).map((r) => r.revisionId)) });
    const { service, processed } = buildService(feed);

    const result = await pullForProperty(service, WEBHOOK_DEADLINE);

    expect(processed).toEqual(waiting.map((r) => r.revisionId));
    expect(feed.requestedPages).toEqual([1, 2, 2]);
    expect(result.response).toMatchObject({
      fetchedCount: 101,
      ackedCount: 1,
      unackedCount: 100,
      stoppedAtDeadline: false,
      laterPageFailure: null,
    });
  });

  test("stops when a page brings no new revisions, so it cannot loop", async () => {
    const waiting = revisions(3);
    const feed = buildFeed({ waiting, failingIds: new Set(waiting.map((r) => r.revisionId)) });
    const { service, processed } = buildService(feed);

    const result = await pullForProperty(service, WEBHOOK_DEADLINE);

    expect(processed).toEqual(["r-1", "r-2", "r-3"]);
    expect(feed.listBookingRevisionFeed).toHaveBeenCalledTimes(2);
    expect(result.response).toMatchObject({ fetchedCount: 3, laterPageFailure: null });
  });

  test("processes every revision once when all of them are acknowledged", async () => {
    const feed = buildFeed({ waiting: revisions(2) });
    const { service, processed } = buildService(feed);

    const result = await pullForProperty(service, WEBHOOK_DEADLINE);

    expect(processed).toEqual(["r-1", "r-2"]);
    expect(result.response).toMatchObject({ fetchedCount: 2, ackedCount: 2, overallSuccess: true, laterPageFailure: null });
  });

  // The webhook classifies a later page's failure like a first page's (a 401 is still the account's key),
  // while the counts of what this pull already did are kept.
  test("reports a later page's failure with its status and keeps the counts", async () => {
    const waiting = revisions(101);
    const feed = buildFeed({
      waiting,
      failingIds: new Set(waiting.slice(0, 100).map((r) => r.revisionId)),
      failingPages: new Map([[2, 401]]),
    });
    const { service } = buildService(feed);

    const result = await pullForProperty(service, WEBHOOK_DEADLINE);

    expect(result.statusCode).toBe(200);
    expect(result.response).toMatchObject({
      fetchedCount: 100,
      unackedCount: 100,
      overallSuccess: false,
      laterPageFailure: { httpStatus: 401, providerStatus: "UNAUTHORIZED" },
    });
  });

  test("still answers with the feed failure when the first page cannot be read", async () => {
    const feed = buildFeed({ waiting: revisions(1), failingPages: new Map([[1, 503]]) });
    const { service } = buildService(feed);

    const result = await pullForProperty(service, WEBHOOK_DEADLINE);

    expect(result.statusCode).toBe(502);
    expect(result.response).toMatchObject({ httpStatus: 503 });
  });

  // Evidence from a webhook pull must not read like someone pressed the manual pull button.
  test("labels a webhook pull as such in the notes and the response", async () => {
    const feed = buildFeed({ waiting: revisions(1) });
    const { service } = buildService(feed);

    const result = await pullForProperty(service, { ...WEBHOOK_DEADLINE, trigger: "WEBHOOK" });

    expect(result.response.trigger).toBe("WEBHOOK");
    expect(result.response.notes[0]).toMatch(/^Channex booking webhook\./);
  });

  // Polling and the manual pull pass no deadline and keep reading a single page, as before.
  test("reads one page without asking for a page number when no deadline is given", async () => {
    const waiting = revisions(3);
    const feed = buildFeed({ waiting, failingIds: new Set(waiting.map((r) => r.revisionId)) });
    const { service } = buildService(feed);

    await pullForProperty(service);

    expect(feed.requestedPages).toEqual([null]);
  });
});
