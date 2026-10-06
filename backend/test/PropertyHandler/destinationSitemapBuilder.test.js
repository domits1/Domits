import { describe, expect, it } from "@jest/globals";
import {
  buildDestinationSitemap,
  buildSitemapIndex,
  SITEMAP_URL_LIMIT,
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
  });

  it("renders an empty url set when no destination has a page, so the index stays valid", () => {
    expect(buildDestinationSitemap([])).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n'
    );
    expect(buildDestinationSitemap([{ path: "/destinations/asia" }])).not.toContain("lastmod");
  });

  it("refuses a path that is not clean, an invalid date, and more urls than one sitemap may hold", () => {
    expect(() => buildDestinationSitemap([{ path: "/destinations/Europe" }])).toThrow("is not a clean site path");
    expect(() => buildDestinationSitemap([{ path: "/destinations/europe/" }])).toThrow("is not a clean site path");
    expect(() => buildDestinationSitemap([{ path: "destinations/europe" }])).toThrow("is not a clean site path");
    expect(() => buildDestinationSitemap([{ path: "/destinations/europe?x=<1>" }])).toThrow("is not a clean site path");
    expect(() => buildDestinationSitemap([{ path: "/destinations/europe" }], { lastModified: "yesterday" })).toThrow(
      "valid last modification date"
    );
    const tooMany = Array.from({ length: SITEMAP_URL_LIMIT + 1 }, (_, index) => ({ path: `/destinations/d${index}` }));
    expect(() => buildDestinationSitemap(tooMany)).toThrow("at most 50000 urls");
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
  });
});
