import { publishWebsiteSite } from "../services/websiteSiteService";
import { fetchWithWebsiteSession } from "../services/websiteSession";

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
