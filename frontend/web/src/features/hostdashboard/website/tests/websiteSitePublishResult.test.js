import { publishWebsiteSite } from "../services/websiteSiteService";
import {
  WebsiteConnectionError,
  WebsiteSessionExpiredError,
  fetchWithWebsiteSession,
} from "../services/websiteSession";

jest.mock("../services/websiteSession", () => ({
  ...jest.requireActual("../services/websiteSession"),
  fetchWithWebsiteSession: jest.fn(),
}));

const PROPERTY_ID = "property-1";
const DRAFT_SAVED_AT = 1_800_000_000_000;

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

const liveSiteSummary = (publishedAt) => ({
  site: { id: "site-1", status: "PUBLISHED", publishedAt },
  primaryDomain: { domain: "cliff-house.domits.com", status: "ACTIVE", isPrimary: true },
  domains: [{ domain: "cliff-house.domits.com", status: "ACTIVE", isPrimary: true }],
  isReachable: true,
});

const requestedUrls = () => fetchWithWebsiteSession.mock.calls.map(([url]) => url);
const siteReadCount = () => requestedUrls().filter((url) => url.includes("/website/site?property=")).length;

const LISTING_NOT_ACTIVE = "Your listing must be approved and live on Domits before you can publish its website.";
const SITE_PROPERTY_NOT_ACTIVE =
  "Every property on your website must be yours, approved and live on Domits before you can publish it.";
const PUBLISH_CONFLICT =
  "Saving this website clashed with another change that was being saved at the same time. Wait a moment and publish again.";
const SERVER_ERROR = "We could not complete this website request. Please try again.";

const answerPublishThenSiteReads = (publishAnswer, ...siteReads) => {
  fetchWithWebsiteSession.mockImplementation((url) => {
    if (url.endsWith("/website/site/publish")) {
      return publishAnswer instanceof Error ? Promise.reject(publishAnswer) : Promise.resolve(publishAnswer);
    }
    const siteRead = siteReads.length > 1 ? siteReads.shift() : siteReads[0];
    return siteRead instanceof Error ? Promise.reject(siteRead) : Promise.resolve(siteRead);
  });
};

const freshSite = () => jsonResponse(200, liveSiteSummary(DRAFT_SAVED_AT + 1200));
const staleSite = () => jsonResponse(200, liveSiteSummary(DRAFT_SAVED_AT - 3_600_000));

beforeEach(() => {
  fetchWithWebsiteSession.mockReset();
});

describe("publishWebsiteSite when the publish works", () => {
  it("returns the summary from the publish answer after one request", async () => {
    const published = liveSiteSummary(DRAFT_SAVED_AT + 500);
    fetchWithWebsiteSession.mockResolvedValueOnce(jsonResponse(200, published));

    await expect(publishWebsiteSite(PROPERTY_ID)).resolves.toEqual(published);

    expect(requestedUrls()).toHaveLength(1);
    expect(requestedUrls()[0]).toMatch(/\/website\/site\/publish$/);
    expect(fetchWithWebsiteSession.mock.calls[0][1]).toEqual({
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId: PROPERTY_ID }),
    });
  });
});

describe("publishWebsiteSite when the server refuses the publish", () => {
  it.each([
    [400, { code: "listing_not_active", message: LISTING_NOT_ACTIVE }, LISTING_NOT_ACTIVE],
    [400, { code: "site_property_not_active", message: SITE_PROPERTY_NOT_ACTIVE }, SITE_PROPERTY_NOT_ACTIVE],
    [
      403,
      { message: "You must be the owner of the property to access it." },
      "You must be the owner of the property to access it.",
    ],
    [404, { message: "Website draft not found." }, "Website draft not found."],
    [409, { code: "publish_conflict", message: PUBLISH_CONFLICT }, PUBLISH_CONFLICT],
    [429, { message: "Too Many Requests" }, "Too Many Requests"],
    [400, "", "We could not publish the direct booking website for this listing."],
  ])("shows a %s as failed with its message, even while the site is live", async (status, body, message) => {
    answerPublishThenSiteReads(jsonResponse(status, body), freshSite());

    await expect(publishWebsiteSite(PROPERTY_ID, { draftSavedAt: DRAFT_SAVED_AT })).rejects.toThrow(message);

    expect(siteReadCount()).toBe(0);
  });

  it.each([
    ["the session has expired", new WebsiteSessionExpiredError()],
    ["the login could not be checked", new WebsiteConnectionError()],
  ])("does not look for the live site when %s", async (_name, sessionError) => {
    answerPublishThenSiteReads(sessionError, freshSite());

    await expect(publishWebsiteSite(PROPERTY_ID, { draftSavedAt: DRAFT_SAVED_AT })).rejects.toBe(sessionError);

    expect(siteReadCount()).toBe(0);
  });
});

describe("publishWebsiteSite when the outcome of the publish is unknown", () => {
  it.each([500, 502, 503, 504])(
    "returns the live site after a %s when it was published after the draft was saved",
    async (status) => {
      answerPublishThenSiteReads(jsonResponse(status, { message: SERVER_ERROR }), freshSite());

      await expect(publishWebsiteSite(PROPERTY_ID, { draftSavedAt: DRAFT_SAVED_AT })).resolves.toEqual(
        liveSiteSummary(DRAFT_SAVED_AT + 1200)
      );

      expect(siteReadCount()).toBe(1);
    }
  );

  it("returns the live site after a dropped connection when it was published after the draft was saved", async () => {
    answerPublishThenSiteReads(new TypeError("Failed to fetch"), freshSite());

    await expect(publishWebsiteSite(PROPERTY_ID, { draftSavedAt: DRAFT_SAVED_AT })).resolves.toEqual(
      liveSiteSummary(DRAFT_SAVED_AT + 1200)
    );
  });

  it("counts a site published at the moment the draft was saved", async () => {
    answerPublishThenSiteReads(
      jsonResponse(500, { message: SERVER_ERROR }),
      jsonResponse(200, liveSiteSummary(DRAFT_SAVED_AT))
    );

    await expect(publishWebsiteSite(PROPERTY_ID, { draftSavedAt: DRAFT_SAVED_AT })).resolves.toEqual(
      liveSiteSummary(DRAFT_SAVED_AT)
    );
  });

  it("keeps looking when the first read still shows the site from before", async () => {
    answerPublishThenSiteReads(jsonResponse(504, { message: "Endpoint request timed out" }), staleSite(), freshSite());
    const startedAt = Date.now();

    await expect(publishWebsiteSite(PROPERTY_ID, { draftSavedAt: DRAFT_SAVED_AT })).resolves.toEqual(
      liveSiteSummary(DRAFT_SAVED_AT + 1200)
    );

    expect(siteReadCount()).toBe(2);
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(240);
  });

  it("does not count a site published before the draft was saved", async () => {
    answerPublishThenSiteReads(jsonResponse(500, { message: SERVER_ERROR }), staleSite());
    const startedAt = Date.now();

    await expect(publishWebsiteSite(PROPERTY_ID, { draftSavedAt: DRAFT_SAVED_AT })).rejects.toThrow(SERVER_ERROR);

    expect(siteReadCount()).toBe(3);
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(950);
  });

  it("returns the live site when the answer of a publish that worked cannot be read", async () => {
    const unreadableAnswer = { ok: true, status: 200, json: () => Promise.reject(new TypeError("network error")) };
    answerPublishThenSiteReads(unreadableAnswer, freshSite());

    await expect(publishWebsiteSite(PROPERTY_ID, { draftSavedAt: DRAFT_SAVED_AT })).resolves.toEqual(
      liveSiteSummary(DRAFT_SAVED_AT + 1200)
    );
  });

  it("shows the read error when the answer cannot be read and the site is still the one from before", async () => {
    const readError = new TypeError("network error");
    answerPublishThenSiteReads({ ok: true, status: 200, json: () => Promise.reject(readError) }, staleSite());

    await expect(publishWebsiteSite(PROPERTY_ID, { draftSavedAt: DRAFT_SAVED_AT })).rejects.toBe(readError);
  });

  it("shows a dropped connection as failed when the site is still the one from before", async () => {
    const droppedConnection = new TypeError("Failed to fetch");
    answerPublishThenSiteReads(droppedConnection, staleSite());

    await expect(publishWebsiteSite(PROPERTY_ID, { draftSavedAt: DRAFT_SAVED_AT })).rejects.toBe(droppedConnection);
  });

  it("does not count a site that is not published", async () => {
    answerPublishThenSiteReads(
      jsonResponse(500, { message: SERVER_ERROR }),
      jsonResponse(200, {
        ...liveSiteSummary(DRAFT_SAVED_AT + 1200),
        site: { id: "site-1", status: "SUSPENDED", publishedAt: DRAFT_SAVED_AT + 1200 },
      })
    );

    await expect(publishWebsiteSite(PROPERTY_ID, { draftSavedAt: DRAFT_SAVED_AT })).rejects.toThrow(SERVER_ERROR);
  });

  it("shows the publish error when the live site cannot be read", async () => {
    answerPublishThenSiteReads(
      jsonResponse(500, { message: SERVER_ERROR }),
      jsonResponse(500, { message: "We could not load the direct booking website status for this listing." })
    );

    await expect(publishWebsiteSite(PROPERTY_ID, { draftSavedAt: DRAFT_SAVED_AT })).rejects.toThrow(SERVER_ERROR);

    expect(siteReadCount()).toBe(3);
  });

  it.each([
    ["no draft save time", undefined],
    ["an empty draft save time", null],
    ["a draft save time of zero", 0],
    ["a negative draft save time", -1],
  ])("does not look for the live site with %s", async (_name, draftSavedAt) => {
    answerPublishThenSiteReads(jsonResponse(500, { message: SERVER_ERROR }), freshSite());

    await expect(publishWebsiteSite(PROPERTY_ID, { draftSavedAt })).rejects.toThrow(SERVER_ERROR);

    expect(siteReadCount()).toBe(0);
  });
});
