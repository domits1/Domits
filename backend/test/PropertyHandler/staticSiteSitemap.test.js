import { describe, it, expect } from "@jest/globals";
import {
  buildStaticSiteSitemap,
  resolveSitemapPageUrls,
} from "../../functions/PropertyHandler/util/staticSiteSitemap.js";

const MAIN = { domain: "www.cliffhouse.nl", status: "ACTIVE" };

describe("the sitemap of one host", () => {
  it("is a valid empty urlset when the host has no page to list, never an empty file", () => {
    expect(buildStaticSiteSitemap([])).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n'
    );
    expect(buildStaticSiteSitemap()).toBe(buildStaticSiteSitemap([]));
  });

  it("lists every page as an absolute url in its own loc element", () => {
    expect(buildStaticSiteSitemap(["https://www.cliffhouse.nl/"])).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        "  <url><loc>https://www.cliffhouse.nl/</loc></url>",
        "</urlset>",
        "",
      ].join("\n")
    );
  });

  it("escapes the five xml characters, so a url can never break out of its element", () => {
    expect(buildStaticSiteSitemap([`https://a.nl/?x=1&y=<2>"'`])).toContain(
      "<loc>https://a.nl/?x=1&amp;y=&lt;2&gt;&quot;&apos;</loc>"
    );
  });
});

describe("the pages a host lists", () => {
  it("is the root of the main address, on the main address itself, while it is active", () => {
    expect(resolveSitemapPageUrls({ hostname: MAIN.domain, mainAddress: MAIN })).toEqual([
      "https://www.cliffhouse.nl/",
    ]);
  });

  it("is nothing on any other host of the site, because its page names the main address as canonical", () => {
    expect(resolveSitemapPageUrls({ hostname: "cliff-house-site-1.direct.domits.com", mainAddress: MAIN })).toEqual([]);
  });

  it.each([
    ["a main address that is not active", { ...MAIN, status: "PENDING" }],
    ["no main address", null],
  ])("is nothing with %s, because the page is not indexable then", (_case, mainAddress) => {
    expect(resolveSitemapPageUrls({ hostname: MAIN.domain, mainAddress })).toEqual([]);
  });
});
