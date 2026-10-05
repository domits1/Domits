import { readFileSync } from "node:fs";
import { join } from "node:path";

import { resolveMarketplaceCanonicalPath } from "../marketplaceCanonical";

const readPublicFile = (name) => readFileSync(join(__dirname, "..", "..", "..", "..", "public", name), "utf8");
const readSitesFile = (name) => readFileSync(join(__dirname, "..", "..", "..", "..", "public-sites", name), "utf8");
const readWorkflow = () =>
  readFileSync(join(__dirname, "..", "..", "..", "..", "..", "..", ".github", "workflows", "deploy-direct-booking-sites.yml"), "utf8");

const sitemapUrls = () => [...readPublicFile("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const robotsLines = () =>
  readPublicFile("robots.txt")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

describe("the marketplace sitemap", () => {
  it("lists only absolute production urls", () => {
    const urls = sitemapUrls();

    expect(urls.length).toBeGreaterThan(10);
    urls.forEach((url) => expect(url.startsWith("https://www.domits.com")).toBe(true));
  });

  it("lists every url only once", () => {
    const urls = sitemapUrls();

    expect(new Set(urls).size).toBe(urls.length);
  });

  it("lists only pages the canonical helper also considers indexable", () => {
    sitemapUrls().forEach((url) => {
      const pathname = url.replace("https://www.domits.com", "") || "/";
      expect(resolveMarketplaceCanonicalPath(pathname)).toBe(pathname);
    });
  });

  it("lists no dashboard, auth or transactional page", () => {
    const forbidden = [
      "/login",
      "/register",
      "/hostdashboard",
      "/guestdashboard",
      "/hostonboarding",
      "/admin",
      "/stripe",
      "/validatepayment",
      "/bookingoverview",
      "/website-preview",
      "/website-live",
    ];

    sitemapUrls().forEach((url) => {
      forbidden.forEach((path) => expect(url).not.toContain(path));
    });
  });

  it("lists no query string and no listing detail url", () => {
    sitemapUrls().forEach((url) => {
      expect(url).not.toContain("?");
      expect(url).not.toContain("/listingdetails");
    });
  });

  it("leaves out priority and changefreq, which Google ignores", () => {
    const sitemap = readPublicFile("sitemap.xml");

    expect(sitemap).not.toContain("<priority>");
    expect(sitemap).not.toContain("<changefreq>");
  });
});

describe("the marketplace robots.txt", () => {
  it("keeps the whole site crawlable, so acceptance can still show its noindex", () => {
    expect(robotsLines()).toContain("User-agent: *");
    expect(robotsLines()).toContain("Allow: /");
    expect(robotsLines()).not.toContain("Disallow: /");
  });

  it("keeps crawlers out of the dashboards, auth and payment flows", () => {
    const disallowed = robotsLines().filter((line) => line.startsWith("Disallow:"));

    ["/hostdashboard/", "/guestdashboard/", "/hostonboarding/", "/admin/", "/login", "/register", "/stripe/"].forEach(
      (path) => expect(disallowed).toContain(`Disallow: ${path}`)
    );
  });

  it("does not block a page whose exclusion relies on a noindex tag", () => {
    const disallowed = robotsLines().filter((line) => line.startsWith("Disallow:"));

    expect(disallowed).not.toContain("Disallow: /listingdetails");
  });

  it("keeps blocking the website views until they carry a noindex of their own", () => {
    const disallowed = robotsLines().filter((line) => line.startsWith("Disallow:"));

    expect(disallowed).toContain("Disallow: /website-live");
    expect(disallowed).toContain("Disallow: /website-preview/");
  });

  it("points at the production sitemap", () => {
    expect(robotsLines()).toContain("Sitemap: https://www.domits.com/sitemap.xml");
  });
});

describe("keeping the marketplace crawl files off the direct booking websites", () => {
  it("gives a host site its own robots.txt without a marketplace sitemap", () => {
    const sitesRobots = readSitesFile("robots.txt");

    expect(sitesRobots).toContain("User-agent: *");
    expect(sitesRobots).toContain("Allow: /");
    expect(sitesRobots).not.toContain("domits.com/sitemap.xml");
    expect(sitesRobots).not.toContain("Sitemap:");
  });

  it("stops the deploy workflow from copying the marketplace files into the sites bucket", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('--exclude "robots.txt"');
    expect(workflow).toContain('--exclude "sitemap.xml"');
    expect(workflow).toContain("frontend/web/public-sites/robots.txt");
    expect(workflow).toContain('aws s3 rm "s3://$SITES_BUCKET/sitemap.xml"');
  });
});
