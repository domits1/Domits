import {
  buildPublishedWebsiteHref,
  buildPublishedWebsitePath,
  resolvePublishedWebsiteDomain,
  resolvePublishedWebsiteLiveDomain,
} from "../websitePublicSiteLinks";

const SITE_ID = "site-1a2b3c4d-9999";
const FALLBACK = {
  domain: "cliff-house-1a2b3c4d.direct.domits.com",
  domainType: "FALLBACK",
  status: "ACTIVE",
  isPrimary: true,
};
const CUSTOM = { domain: "www.theirvilla.com", domainType: "CUSTOM", status: "ACTIVE", isPrimary: false };

describe("resolvePublishedWebsiteLiveDomain", () => {
  it("prefers the primary active domain whatever its type", () => {
    const customPrimary = { ...CUSTOM, isPrimary: true };
    const fallbackSecondary = { ...FALLBACK, isPrimary: false };
    expect(resolvePublishedWebsiteLiveDomain([fallbackSecondary, customPrimary])).toBe(customPrimary);
    expect(resolvePublishedWebsiteLiveDomain([CUSTOM, FALLBACK])).toBe(FALLBACK);
  });

  it("falls back to any active domain when the primary is not live yet", () => {
    const pendingPrimary = { ...CUSTOM, isPrimary: true, status: "PENDING" };
    const activeSecondary = { ...FALLBACK, isPrimary: false };
    expect(resolvePublishedWebsiteLiveDomain([pendingPrimary, activeSecondary])).toBe(activeSecondary);
  });

  it("returns null when nothing is active or the list is missing", () => {
    expect(resolvePublishedWebsiteLiveDomain([{ ...FALLBACK, status: "PENDING" }])).toBeNull();
    expect(resolvePublishedWebsiteLiveDomain([])).toBeNull();
    expect(resolvePublishedWebsiteLiveDomain(undefined)).toBeNull();
    expect(resolvePublishedWebsiteLiveDomain([{ status: "ACTIVE", isPrimary: true, domain: "" }])).toBeNull();
  });
});

describe("buildPublishedWebsiteHref", () => {
  it("links to the primary active custom domain over an active fallback", () => {
    const customPrimary = { ...CUSTOM, isPrimary: true };
    const href = buildPublishedWebsiteHref(FALLBACK.domain, SITE_ID, FALLBACK.status, "Cliff House", [
      { ...FALLBACK, isPrimary: false },
      customPrimary,
    ]);
    expect(href).toBe("https://www.theirvilla.com");
  });

  it("links to the active fallback while a custom domain is still pending", () => {
    const href = buildPublishedWebsiteHref("", SITE_ID, "", "Cliff House", [
      { ...CUSTOM, isPrimary: true, status: "PENDING" },
      { ...FALLBACK, isPrimary: false },
    ]);
    expect(href).toBe(`https://${FALLBACK.domain}`);
  });

  it("keeps the legacy single-domain behaviour when no list is given", () => {
    expect(buildPublishedWebsiteHref(FALLBACK.domain, SITE_ID, "ACTIVE")).toBe(`https://${FALLBACK.domain}`);
    expect(buildPublishedWebsiteHref(FALLBACK.domain, SITE_ID, "PENDING")).toBe(
      `/website-live/${encodeURIComponent(FALLBACK.domain)}?siteId=${encodeURIComponent(SITE_ID)}`
    );
  });

  it("uses the debug path when nothing is active, synthesising the fallback domain", () => {
    const href = buildPublishedWebsiteHref("", SITE_ID, "", "Cliff House", [{ ...CUSTOM, status: "PENDING" }]);
    expect(href).toBe(`/website-live/cliff-house-site1a2b.direct.domits.com?siteId=${encodeURIComponent(SITE_ID)}`);
  });

  it("returns an empty string without a domain or site", () => {
    expect(buildPublishedWebsiteHref("", "", "", "", [])).toBe("");
  });
});

describe("fallback domain synthesis", () => {
  it("derives the fallback domain from the site name and id", () => {
    expect(resolvePublishedWebsiteDomain("", "Cliff House", SITE_ID)).toBe("cliff-house-site1a2b.direct.domits.com");
    expect(resolvePublishedWebsiteDomain("Custom.Example.com", "Cliff House", SITE_ID)).toBe("custom.example.com");
  });

  it("builds the debug path with the synthesised domain and the site id", () => {
    expect(buildPublishedWebsitePath("", SITE_ID)).toBe(
      `/website-live/site-site1a2b.direct.domits.com?siteId=${encodeURIComponent(SITE_ID)}`
    );
  });
});
