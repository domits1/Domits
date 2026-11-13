import { Auth } from "aws-amplify";
import { WEBSITE_ENTITLEMENT_UNLIMITED_PAGES, getWebsiteEntitlements } from "../services/websitePlanService";
import { WEBSITE_SESSION_EXPIRED_MESSAGE } from "../services/websiteSession";

jest.mock("aws-amplify", () => ({ Auth: { currentSession: jest.fn(), userPool: { getCurrentUser: jest.fn() } } }));

const sessionWith = (accessToken) => ({ getAccessToken: () => ({ getJwtToken: () => accessToken }) });

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const ELITE_ENTITLEMENTS = ["website.basic", "website.unlimited_pages"];

describe("getWebsiteEntitlements", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
    Auth.currentSession.mockReset();
    Auth.currentSession.mockResolvedValue(sessionWith("access-token"));
  });

  it("reads the entitlements view of the rate plan with the host's token and no cache", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { plan: "elite", entitlements: ELITE_ENTITLEMENTS }));

    await expect(getWebsiteEntitlements()).resolves.toEqual(ELITE_ENTITLEMENTS);

    const [url, init] = fetch.mock.calls[0];
    expect(url).toMatch(/\/website\/rate-plan\?view=entitlements$/);
    expect(init.method).toBe("GET");
    expect(init.cache).toBe("no-store");
    expect(init.headers.Authorization).toBe("access-token");
    expect(init.body).toBeUndefined();
  });

  it("reads the list from the plain plan view a backend without the entitlements view returns", async () => {
    fetch.mockResolvedValue(
      jsonResponse(200, {
        id: "plan-1",
        plan: "essentials",
        stripeSubscriptionId: null,
        entitlements: ["website.basic"],
      })
    );

    await expect(getWebsiteEntitlements()).resolves.toEqual(["website.basic"]);
  });

  it("rejects when the request does not reach the server", async () => {
    fetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(getWebsiteEntitlements()).rejects.toThrow("Failed to fetch");
  });

  it("rejects without a request when the session cannot be read", async () => {
    Auth.currentSession.mockRejectedValue(new Error("No current user"));

    await expect(getWebsiteEntitlements()).rejects.toThrow(WEBSITE_SESSION_EXPIRED_MESSAGE);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects when the server does not answer with success", async () => {
    fetch.mockResolvedValue(jsonResponse(503, { entitlements: ELITE_ENTITLEMENTS }));

    await expect(getWebsiteEntitlements()).rejects.toThrow("503");
  });

  it.each([
    ["no body", null],
    ["no list", { plan: "elite" }],
    ["a list that is not an array", { entitlements: "website.unlimited_pages" }],
    ["an entry that is not text next to an Elite entry", { entitlements: [WEBSITE_ENTITLEMENT_UNLIMITED_PAGES, null] }],
    ["an object entry", { entitlements: ["website.basic", { name: WEBSITE_ENTITLEMENT_UNLIMITED_PAGES }] }],
  ])("rejects an answer with %s", async (_label, body) => {
    fetch.mockResolvedValue(jsonResponse(200, body));

    await expect(getWebsiteEntitlements()).rejects.toThrow("entitlement list");
  });

  it("rejects when the answer is not JSON", async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    });

    await expect(getWebsiteEntitlements()).rejects.toThrow("Unexpected token");
  });
});
