import { describe, expect, it } from "@jest/globals";
import {
  buildDestinationSitemap,
  buildSitemapIndex,
  SITEMAP_ENTRY_LIMIT,
} from "../../functions/PropertyHandler/business/service/destinationSitemapBuilder.js";

const DESTINATIONS = [
  { path: "/destinations/europe/spain/marbella" },
  { path: "/destinations/europe" },
  { path: "/destinations/europe/spain" },
  { path: "/destinations/europe/spain/marbella" },
];

describe("the destination sitemap", () => {
  it("lists every eligible destination once, sorted, with the origin and the last modification day", () => {
    const xml = buildDestinationSitemap(DESTINATIONS, {
      siteOrigin: "https://www.domits.com/",
      lastModified: "2026-10-07T22:15:00Z",
    });

    expect(xml).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        "<url><loc>https://www.domits.com/destinations/europe</loc><lastmod>2026-10-07</lastmod></url>",
        "<url><loc>https://www.domits.com/destinations/europe/spain</loc><lastmod>2026-10-07</lastmod></url>",
        "<url><loc>https://www.domits.com/destinations/europe/spain/marbella</loc><lastmod>2026-10-07</lastmod></url>",
        "</urlset>",
        "",
      ].join("\n")
    );
    expect(buildDestinationSitemap([{ path: "/destinations/asia" }])).not.toContain("lastmod");
  });

  it("answers null when no destination has a page, so the publisher leaves the sitemap out of the index", () => {
    expect(buildDestinationSitemap([])).toBeNull();
    expect(buildDestinationSitemap(undefined)).toBeNull();
  });

  it("refuses a path that is not clean", () => {
    for (const path of [
      "/destinations/Europe",
      "/destinations/europe/",
      "destinations/europe",
      "/destinations/europe?x=<1>",
      "/.",
      "/destinations/../asia",
      "/destinations//europe",
      "/destinations/./europe",
      "",
    ]) {
      expect(() => buildDestinationSitemap([{ path }])).toThrow("is not a clean site path");
    }
  });

  it("refuses an origin that is not a bare http origin", () => {
    for (const siteOrigin of [
      "domits.com",
      "https://www.domits.com?x=1",
      "https://www.domits.com/destinations",
      "ftp://domits.com",
      "https://www.domits.com/#top",
    ]) {
      expect(() => buildDestinationSitemap(DESTINATIONS, { siteOrigin })).toThrow("is not a site origin");
    }
  });

  it("refuses a date that does not exist, keeps a zoned timestamp on its UTC day, and takes a Date", () => {
    const build = (lastModified) => buildDestinationSitemap([{ path: "/destinations/europe" }], { lastModified });
    expect(() => build("yesterday")).toThrow("valid last modification date");
    expect(() => build("2026-02-30")).toThrow("valid last modification date");
    expect(build("2026-10-07T23:30:00+02:00")).toContain("<lastmod>2026-10-07</lastmod>");
    expect(build("2026-10-08T00:30:00+02:00")).toContain("<lastmod>2026-10-07</lastmod>");
    expect(build(new Date("2026-10-07T01:02:03Z"))).toContain("<lastmod>2026-10-07</lastmod>");
  });

  it("refuses more entries than one sitemap may hold, and more bytes", () => {
    const tooMany = Array.from({ length: SITEMAP_ENTRY_LIMIT + 1 }, (_, index) => ({
      path: `/destinations/d${index}`,
    }));
    expect(() => buildDestinationSitemap(tooMany)).toThrow("at most 50000 entries");
    const long = Array.from({ length: 30000 }, (_, index) => ({ path: `/destinations/${"a".repeat(1900)}${index}` }));
    expect(() => buildDestinationSitemap(long)).toThrow("at most 52428800 bytes");
  });

  it("builds the index that points at the pages sitemap and the destinations sitemap", () => {
    const xml = buildSitemapIndex(
      [
        { path: "/sitemap-pages.xml" },
        { path: "/sitemap-destinations.xml", lastModified: new Date("2026-10-07T01:02:03Z") },
      ],
      { siteOrigin: "https://acceptance.domits.com" }
    );

    expect(xml).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        "<sitemap><loc>https://acceptance.domits.com/sitemap-pages.xml</loc></sitemap>",
        "<sitemap><loc>https://acceptance.domits.com/sitemap-destinations.xml</loc><lastmod>2026-10-07</lastmod></sitemap>",
        "</sitemapindex>",
        "",
      ].join("\n")
    );
    expect(() => buildSitemapIndex([])).toThrow("at least one sitemap");
    expect(() => buildSitemapIndex([{ path: "/sitemap-pages.xml" }], { siteOrigin: "domits.com" })).toThrow(
      "is not a site origin"
    );
  });
});
