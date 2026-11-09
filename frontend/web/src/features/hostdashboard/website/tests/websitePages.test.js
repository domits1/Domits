import fs from "fs";
import path from "path";
import {
  MAIN_SITE_PAGE_KEY,
  PANORAMA_PAGE_SECTION_ORDER,
  RESERVED_SITE_PATH_SEGMENTS,
  SITE_PAGE_DEFINITIONS,
  buildSitePageHref,
  findSitePageTableProblems,
  hasActiveSitePages,
  isReservedSitePath,
  normalizeSitePageNavLabel,
  normalizeSitePages,
  resolvePanoramaPageSections,
  resolveSitePageFromPath,
} from "../rendering/websitePages";

const CONFIGURABLE_PAGE_KEYS = ["gallery", "accommodation", "contact"];

const DEFAULT_SITE_PAGES = {
  gallery: { enabled: false, navLabel: "Gallery" },
  accommodation: { enabled: false, navLabel: "Accommodation" },
  contact: { enabled: false, navLabel: "Contact us" },
};

const ALL_ENABLED = {
  gallery: { enabled: true },
  accommodation: { enabled: true },
  contact: { enabled: true },
};

const readAppSource = () => fs.readFileSync(path.resolve(__dirname, "../../../../App.js"), "utf8");

const readAppRouteSegments = () => {
  const appSource = readAppSource();
  const routePaths = [...appSource.matchAll(/path="(\/[^"]*)"/g)].map((match) => match[1]);
  return [...new Set(routePaths.map((routePath) => routePath.split("/")[1].toLowerCase()))].filter(
    (segment) => segment !== "" && segment !== "*"
  );
};

const buildEnabledCombinations = () =>
  CONFIGURABLE_PAGE_KEYS.reduce(
    (combinations, key) =>
      combinations.flatMap((combination) => [
        { ...combination, [key]: { enabled: false } },
        { ...combination, [key]: { enabled: true } },
      ]),
    [{}]
  );

const withPage = (overrides) =>
  SITE_PAGE_DEFINITIONS.map((page) => (page.key === "gallery" ? { ...page, ...overrides } : page));

describe("site page table", () => {
  it("has no problems", () => {
    expect(findSitePageTableProblems(SITE_PAGE_DEFINITIONS)).toEqual([]);
  });

  it("offers Main, Gallery, Accommodation and Contact Us on fixed slugs", () => {
    expect(SITE_PAGE_DEFINITIONS.map(({ key, slug }) => [key, slug])).toEqual([
      ["main", ""],
      ["gallery", "gallery"],
      ["accommodation", "accommodation"],
      ["contact", "contact-us"],
    ]);
  });

  it("keeps availability and booking on Main", () => {
    expect(SITE_PAGE_DEFINITIONS.find((page) => page.key === MAIN_SITE_PAGE_KEY).sections).toEqual([
      "hero",
      "journeyStops",
      "availability",
    ]);
  });

  it.each([
    ["no table", undefined, "the page table must list at least the main page"],
    ["an empty table", [], "the page table must list at least the main page"],
    [
      "a missing main page",
      SITE_PAGE_DEFINITIONS.filter((page) => page.key !== MAIN_SITE_PAGE_KEY),
      "there must be exactly one main page",
    ],
    [
      "a second main page",
      [...SITE_PAGE_DEFINITIONS, { ...SITE_PAGE_DEFINITIONS[0], sections: [] }],
      "there must be exactly one main page",
    ],
    [
      "a main page with a slug",
      SITE_PAGE_DEFINITIONS.map((page) => (page.key === MAIN_SITE_PAGE_KEY ? { ...page, slug: "home-page" } : page)),
      "the main page must have an empty slug",
    ],
    [
      "a duplicate page key",
      [...SITE_PAGE_DEFINITIONS, { key: "gallery", slug: "photos", defaultNavLabel: "Photos", sections: [] }],
      'page key "gallery" is missing or used twice',
    ],
    [
      "a page without a key",
      [...SITE_PAGE_DEFINITIONS, { slug: "photos", defaultNavLabel: "Photos", sections: [] }],
      "page key undefined is missing or used twice",
    ],
    [
      "a page with an empty key",
      [...SITE_PAGE_DEFINITIONS, { key: "", slug: "photos", defaultNavLabel: "Photos", sections: [] }],
      'page key "" is missing or used twice',
    ],
    [
      "a duplicate slug",
      [...SITE_PAGE_DEFINITIONS, { key: "photos", slug: "gallery", defaultNavLabel: "Photos", sections: [] }],
      'slug "gallery" is used twice',
    ],
    ["the Domits contact path", withPage({ slug: "contact" }), 'slug "contact" is a Domits path on a site host'],
    ["the Domits about path", withPage({ slug: "about" }), 'slug "about" is a Domits path on a site host'],
    ["the Domits policy path", withPage({ slug: "policy" }), 'slug "policy" is a Domits path on a site host'],
    ["the Domits terms path", withPage({ slug: "terms" }), 'slug "terms" is a Domits path on a site host'],
    ["the build asset path", withPage({ slug: "static" }), 'slug "static" is a Domits path on a site host'],
    ["an uppercase slug", withPage({ slug: "Gallery" }), 'slug "Gallery" is not a single lowercase path segment'],
    [
      "a nested slug",
      withPage({ slug: "gallery/photos" }),
      'slug "gallery/photos" is not a single lowercase path segment',
    ],
    ["markup in a slug", withPage({ slug: "<b>" }), 'slug "<b>" is not a single lowercase path segment'],
    ["an empty slug on a sub page", withPage({ slug: "" }), 'slug "" is not a single lowercase path segment'],
    ["a slug that is not text", withPage({ slug: 7 }), "slug 7 is not a single lowercase path segment"],
    ["an unknown section", withPage({ sections: ["gallery", "spa"] }), 'section "spa" is not a template section'],
    [
      "a section on two pages",
      withPage({ sections: ["gallery", "contact"] }),
      'section "contact" must belong to exactly one page',
    ],
    ["a section on no page", withPage({ sections: [] }), 'section "gallery" must belong to exactly one page'],
    [
      "sections that are not a list",
      withPage({ sections: "gallery" }),
      'section "gallery" must belong to exactly one page',
    ],
    [
      "an over-long default label",
      withPage({ defaultNavLabel: "x".repeat(41) }),
      'page "gallery" has an unusable default label',
    ],
    [
      "markup in a default label",
      withPage({ defaultNavLabel: "<i>Gallery</i>" }),
      'page "gallery" has an unusable default label',
    ],
    ["an empty default label", withPage({ defaultNavLabel: "" }), 'page "gallery" has an unusable default label'],
  ])("reports %s", (_name, pages, problem) => {
    expect(findSitePageTableProblems(pages)).toContain(problem);
  });
});

describe("reserved site paths", () => {
  it("lists every top-level route the app serves before a site page", () => {
    const routeSegments = readAppRouteSegments();

    expect(readAppSource()).not.toMatch(/path=\{/);

    expect(routeSegments.length).toBeGreaterThan(30);
    expect(routeSegments.filter((segment) => !RESERVED_SITE_PATH_SEGMENTS.includes(segment))).toEqual([]);
  });

  it.each(["contact", "about", "policy", "terms", "Terms", "CONTACT", "hostdashboard", "website-live", "sites"])(
    "reserves %s",
    (segment) => {
      expect(isReservedSitePath(segment)).toBe(true);
    }
  );

  it("keeps every page slug free", () => {
    expect(SITE_PAGE_DEFINITIONS.filter((page) => page.slug && isReservedSitePath(page.slug))).toEqual([]);
  });
});

describe("normalizeSitePageNavLabel", () => {
  it.each([
    ["trims and collapses whitespace", "  The \n  villa\t", "The villa"],
    ["keeps exactly the maximum length", "x".repeat(40), "x".repeat(40)],
    ["counts an emoji as one character", "\u{1F3E1}".repeat(40), "\u{1F3E1}".repeat(40)],
    ["keeps an ampersand and quotes", 'Wine & "Dine"', 'Wine & "Dine"'],
    ["drops a label over the maximum", "x".repeat(41), ""],
    ["drops an opening tag", "<script>alert(1)</script>", ""],
    ["drops a closing angle bracket", "Gallery >", ""],
    ["drops a control character", "Gal\u0007lery", ""],
    ["drops a text direction override", "Gallery\u202E", ""],
    ["drops whitespace only", "   ", ""],
    ["drops a number", 42, ""],
    ["drops an object", { label: "Gallery" }, ""],
    ["drops a missing value", undefined, ""],
  ])("%s", (_name, value, expected) => {
    expect(normalizeSitePageNavLabel(value)).toBe(expected);
  });
});

describe("normalizeSitePages", () => {
  it.each([undefined, null, "gallery", 7, true, [], [{ enabled: true }]])(
    "gives every page switched off for %p",
    (value) => {
      expect(normalizeSitePages(value)).toEqual(DEFAULT_SITE_PAGES);
    }
  );

  it("keeps a switched-on page and the label the host chose", () => {
    expect(
      normalizeSitePages({
        gallery: { enabled: true, navLabel: "Photos" },
        accommodation: { enabled: true, navLabel: "The villa" },
        contact: { enabled: false },
      })
    ).toEqual({
      gallery: { enabled: true, navLabel: "Photos" },
      accommodation: { enabled: true, navLabel: "The villa" },
      contact: { enabled: false, navLabel: "Contact us" },
    });
  });

  it("drops unknown pages and the main page", () => {
    const sitePages = JSON.parse(
      '{"main":{"enabled":false},"experiences":{"enabled":true},"__proto__":{"enabled":true},"constructor":{"enabled":true}}'
    );

    expect(normalizeSitePages(sitePages)).toEqual(DEFAULT_SITE_PAGES);
    expect(Object.keys(normalizeSitePages(sitePages))).toEqual(CONFIGURABLE_PAGE_KEYS);
  });

  it("reads only the settings stored on the value itself", () => {
    expect(normalizeSitePages(Object.create({ gallery: { enabled: true } }))).toEqual(DEFAULT_SITE_PAGES);
  });

  it.each(["true", 1, {}, null])("switches a page on only for true, not for %p", (enabled) => {
    expect(normalizeSitePages({ gallery: { enabled } }).gallery.enabled).toBe(false);
  });

  it.each([true, "on", ["enabled"], null])("treats a page entry %p as switched off", (entry) => {
    expect(normalizeSitePages({ gallery: entry }).gallery).toEqual({ enabled: false, navLabel: "Gallery" });
  });

  it("falls back to the default label for an unusable label", () => {
    expect(normalizeSitePages({ contact: { enabled: true, navLabel: "<b>Contact</b>" } }).contact).toEqual({
      enabled: true,
      navLabel: "Contact us",
    });
  });

  it("gives the same result when normalized twice", () => {
    const once = normalizeSitePages({ gallery: { enabled: true, navLabel: "  Photo   book " }, spa: {} });

    expect(normalizeSitePages(once)).toEqual(once);
  });

  it("does not change the stored value", () => {
    const sitePages = { gallery: { enabled: true, navLabel: "  Photos  " }, spa: { enabled: true } };
    const snapshot = JSON.stringify(sitePages);

    normalizeSitePages(sitePages);

    expect(JSON.stringify(sitePages)).toBe(snapshot);
  });
});

describe("hasActiveSitePages", () => {
  it.each([
    ["no page settings", undefined],
    ["every page switched off", { gallery: { enabled: false } }],
    ["only main", { main: { enabled: true } }],
    ["only unknown pages", { spa: { enabled: true } }],
  ])("is false for %s", (_name, sitePages) => {
    expect(hasActiveSitePages(sitePages)).toBe(false);
  });

  it("is true once one page is switched on", () => {
    expect(hasActiveSitePages({ contact: { enabled: true } })).toBe(true);
  });
});

describe("resolveSitePageFromPath", () => {
  it.each([
    ["/gallery", "gallery"],
    ["/gallery/", "gallery"],
    ["gallery", "gallery"],
    ["/GALLERY", "gallery"],
    ["/accommodation", "accommodation"],
    ["/contact-us", "contact"],
  ])("opens %s as the %s page when it is switched on", (pathname, pageKey) => {
    expect(resolveSitePageFromPath(pathname, ALL_ENABLED)).toBe(pageKey);
  });

  it.each([
    ["/"],
    [""],
    ["/contact"],
    ["/gallery/photos"],
    ["/experiences"],
    ["/constructor"],
    ["/__proto__"],
    ["/toString"],
    [undefined],
    [42],
  ])("opens %p as main", (pathname) => {
    expect(resolveSitePageFromPath(pathname, ALL_ENABLED)).toBe(MAIN_SITE_PAGE_KEY);
  });

  it("opens a switched-off page as main", () => {
    expect(resolveSitePageFromPath("/gallery", { gallery: { enabled: false }, contact: { enabled: true } })).toBe(
      MAIN_SITE_PAGE_KEY
    );
  });

  it("opens every page as main for a site without page settings", () => {
    SITE_PAGE_DEFINITIONS.forEach((page) => {
      expect(resolveSitePageFromPath(`/${page.slug}`, undefined)).toBe(MAIN_SITE_PAGE_KEY);
    });
  });
});

describe("buildSitePageHref", () => {
  it.each([
    ["", "main", "/"],
    ["", "gallery", "/gallery"],
    ["/", "contact", "/contact-us"],
    ["/website-live/example.com", "accommodation", "/website-live/example.com/accommodation"],
    ["/website-live/example.com/", "main", "/website-live/example.com"],
    ["//example.org", "gallery", "/example.org/gallery"],
    ["", "experiences", "/"],
    ["", "constructor", "/"],
    [undefined, "gallery", "/gallery"],
  ])("builds the link from %p for %s as %s", (basePath, pageKey, href) => {
    expect(buildSitePageHref(basePath, pageKey)).toBe(href);
  });

  it("builds a link that opens the same page again", () => {
    SITE_PAGE_DEFINITIONS.forEach((page) => {
      expect(resolveSitePageFromPath(buildSitePageHref("", page.key), ALL_ENABLED)).toBe(page.key);
    });
  });
});

describe("resolvePanoramaPageSections", () => {
  it("keeps every section on main for a site without page settings", () => {
    expect(resolvePanoramaPageSections(undefined, MAIN_SITE_PAGE_KEY)).toEqual(PANORAMA_PAGE_SECTION_ORDER);
  });

  it("keeps every section on main while every page is switched off", () => {
    expect(resolvePanoramaPageSections({ gallery: { enabled: false } }, MAIN_SITE_PAGE_KEY)).toEqual(
      PANORAMA_PAGE_SECTION_ORDER
    );
  });

  it("moves a section to its page only when that page is switched on", () => {
    const sitePages = { gallery: { enabled: true } };

    expect(resolvePanoramaPageSections(sitePages, MAIN_SITE_PAGE_KEY)).toEqual([
      "hero",
      "residence",
      "amenities",
      "journeyStops",
      "availability",
      "contact",
    ]);
    expect(resolvePanoramaPageSections(sitePages, "gallery")).toEqual(["gallery"]);
  });

  it("gives each page its own sections when every page is switched on", () => {
    expect(resolvePanoramaPageSections(ALL_ENABLED, MAIN_SITE_PAGE_KEY)).toEqual([
      "hero",
      "journeyStops",
      "availability",
    ]);
    expect(resolvePanoramaPageSections(ALL_ENABLED, "gallery")).toEqual(["gallery"]);
    expect(resolvePanoramaPageSections(ALL_ENABLED, "accommodation")).toEqual(["residence", "amenities"]);
    expect(resolvePanoramaPageSections(ALL_ENABLED, "contact")).toEqual(["contact"]);
  });

  it.each([["accommodation"], ["experiences"], ["constructor"], [undefined]])(
    "shows main for the %p page when it is not switched on",
    (pageKey) => {
      const sitePages = { gallery: { enabled: true } };

      expect(resolvePanoramaPageSections(sitePages, pageKey)).toEqual(
        resolvePanoramaPageSections(sitePages, MAIN_SITE_PAGE_KEY)
      );
    }
  );

  it("shows every section exactly once across the pages, with availability on main", () => {
    const combinations = buildEnabledCombinations();

    expect(combinations).toHaveLength(8);
    combinations.forEach((sitePages) => {
      const servedPageKeys = [
        MAIN_SITE_PAGE_KEY,
        ...CONFIGURABLE_PAGE_KEYS.filter((pageKey) => sitePages[pageKey].enabled),
      ];
      const servedSections = servedPageKeys.flatMap((pageKey) => resolvePanoramaPageSections(sitePages, pageKey));

      expect([...servedSections].sort()).toEqual([...PANORAMA_PAGE_SECTION_ORDER].sort());
      expect(resolvePanoramaPageSections(sitePages, MAIN_SITE_PAGE_KEY)).toContain("availability");
    });
  });
});
