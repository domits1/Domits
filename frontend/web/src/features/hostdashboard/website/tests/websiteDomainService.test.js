import {
  WEBSITE_DOMAIN_CLIENT_ERROR_CODES,
  connectWebsiteDomain,
  fetchWebsiteDomains,
  removeWebsiteDomain,
  verifyWebsiteDomain,
} from "../services/websiteDomainService";

import { getAccessToken } from "../../../../services/getAccessToken";

jest.mock("../../../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(() => "access-token"),
}));

const DOMAIN_VIEW = {
  domain: "www.example.com",
  domainType: "CUSTOM",
  status: "PENDING",
  isPrimary: false,
  dnsRecord: { type: "CNAME", name: "www.example.com", value: "d3lo.cloudfront.net" },
};

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
});

describe("websiteDomainService", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
    getAccessToken.mockReturnValue("access-token");
  });

  it("lists domains with siteId in the query and the host's token", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { siteId: "site-1", domains: [DOMAIN_VIEW] }));

    await expect(fetchWebsiteDomains("site-1")).resolves.toEqual([DOMAIN_VIEW]);

    const [url, init] = fetch.mock.calls[0];
    expect(url).toMatch(/\/website\/domains\?siteId=site-1$/);
    expect(init.method).toBe("GET");
    expect(init.headers.Authorization).toBe("access-token");
    expect(init.cache).toBe("no-store");
  });

  it("connects a domain with a JSON body and returns the created view", async () => {
    fetch.mockResolvedValue(jsonResponse(201, { domain: DOMAIN_VIEW }));

    await expect(connectWebsiteDomain({ siteId: "site-1", domain: "www.example.com" })).resolves.toEqual(DOMAIN_VIEW);

    const [url, init] = fetch.mock.calls[0];
    expect(url).toMatch(/\/website\/domains$/);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ siteId: "site-1", domain: "www.example.com" });
  });

  it("verifies through the verify route", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { domain: { ...DOMAIN_VIEW, status: "VERIFIED" } }));

    await expect(verifyWebsiteDomain("site-1")).resolves.toMatchObject({ status: "VERIFIED" });
    expect(fetch.mock.calls[0][0]).toMatch(/\/website\/domains\/verify$/);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ siteId: "site-1" });
  });

  it("turns the error envelope into a WebsiteDomainError with the server code", async () => {
    fetch.mockResolvedValue(
      jsonResponse(409, { error: { code: "domain_limit_reached", message: "One domain only.", requestId: "req-9" } })
    );

    await expect(connectWebsiteDomain({ siteId: "site-1", domain: "www.other.com" })).rejects.toMatchObject({
      name: "WebsiteDomainError",
      code: "domain_limit_reached",
      message: "One domain only.",
      status: 409,
      requestId: "req-9",
    });
  });

  it("treats a success without a domain in the body as an unexpected response", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { ok: true }));

    await expect(connectWebsiteDomain({ siteId: "site-1", domain: "www.example.com" })).rejects.toMatchObject({
      code: WEBSITE_DOMAIN_CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE,
      status: 200,
    });
    fetch.mockResolvedValue(jsonResponse(200, { ok: true }));
    await expect(verifyWebsiteDomain("site-1")).rejects.toMatchObject({
      code: WEBSITE_DOMAIN_CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE,
    });
  });

  it("removes through DELETE with siteId in the query and reports the removing domain", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { domain: { ...DOMAIN_VIEW, status: "REMOVING" } }));

    await expect(removeWebsiteDomain({ siteId: "site-1", domain: "www.example.com" })).resolves.toMatchObject({
      status: "REMOVING",
    });

    const [url, options] = fetch.mock.calls[0];
    expect(url).toMatch(/\/website\/domains\?siteId=site-1&domain=www\.example\.com$/);
    expect(options.method).toBe("DELETE");
    expect(options.body).toBeNull();
  });

  it("treats an explicit null domain from remove or verify as the domain being gone", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { domain: null }));

    await expect(removeWebsiteDomain({ siteId: "site-1", domain: "www.example.com" })).resolves.toBeNull();
    await expect(verifyWebsiteDomain("site-1")).resolves.toBeNull();
  });

  it("reports a failed body read as a network error", async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => {
        throw new TypeError("body stream aborted");
      },
    });

    await expect(fetchWebsiteDomains("site-1")).rejects.toMatchObject({
      code: WEBSITE_DOMAIN_CLIENT_ERROR_CODES.NETWORK_ERROR,
    });
  });

  it("reports a missing session as unauthorized without calling the server", async () => {
    getAccessToken.mockReturnValueOnce(null);

    await expect(fetchWebsiteDomains("site-1")).rejects.toMatchObject({
      name: "WebsiteDomainError",
      code: WEBSITE_DOMAIN_CLIENT_ERROR_CODES.UNAUTHORIZED,
      status: 401,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports a non-JSON failure as an unexpected response and a fetch failure as a network error", async () => {
    fetch.mockResolvedValueOnce(jsonResponse(502, "<html>Bad gateway</html>"));
    await expect(fetchWebsiteDomains("site-1")).rejects.toMatchObject({
      code: WEBSITE_DOMAIN_CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE,
      status: 502,
    });

    fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(verifyWebsiteDomain("site-1")).rejects.toMatchObject({
      name: "WebsiteDomainError",
      code: WEBSITE_DOMAIN_CLIENT_ERROR_CODES.NETWORK_ERROR,
    });
  });
});
