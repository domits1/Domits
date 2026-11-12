export const SITE_PAGES_OVERRIDE_KEY = "sitePages";
export const MAIN_SITE_PAGE_KEY = "main";
export const MAX_SITE_PAGE_NAV_LABEL_LENGTH = 40;

export const PANORAMA_PAGE_SECTION_ORDER = Object.freeze([
  "hero",
  "residence",
  "gallery",
  "amenities",
  "journeyStops",
  "availability",
  "contact",
]);

export const SITE_PAGE_DEFINITIONS = Object.freeze([
  Object.freeze({
    key: MAIN_SITE_PAGE_KEY,
    slug: "",
    defaultNavLabel: "Home",
    sections: Object.freeze(["hero", "journeyStops", "availability"]),
  }),
  Object.freeze({
    key: "gallery",
    slug: "gallery",
    defaultNavLabel: "Gallery",
    sections: Object.freeze(["gallery"]),
  }),
  Object.freeze({
    key: "accommodation",
    slug: "accommodation",
    defaultNavLabel: "Accommodation",
    sections: Object.freeze(["residence", "amenities"]),
  }),
  Object.freeze({
    key: "contact",
    slug: "contact-us",
    defaultNavLabel: "Contact us",
    sections: Object.freeze(["contact"]),
  }),
]);

export const RESERVED_SITE_PATH_SEGMENTS = Object.freeze([
  "about",
  "admin",
  "bookingconfirmationoverview",
  "bookingoverview",
  "bookingpayment",
  "bookingsend",
  "career",
  "channelmanager",
  "chat",
  "confirm-email",
  "contact",
  "data-safety",
  "disclaimers",
  "employeechat",
  "enlist",
  "guestdashboard",
  "helpdesk-guest",
  "helpdesk-host",
  "home",
  "hostdashboard",
  "hostonboarding",
  "how-it-works",
  "job",
  "landing",
  "listingdetails",
  "login",
  "performance",
  "policy",
  "register",
  "release",
  "review",
  "security",
  "sites",
  "static",
  "stripe",
  "sustainability",
  "team",
  "terms",
  "travelinnovation",
  "validatepayment",
  "verify",
  "website-live",
  "website-preview",
  "why-domits",
]);

const RESERVED_SITE_PATH_SEGMENT_SET = new Set(RESERVED_SITE_PATH_SEGMENTS);
const SITE_PAGE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UNSAFE_NAV_LABEL_PATTERN = /[<>\p{Cc}\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;
const WHITESPACE_RUN_PATTERN = /\s+/g;
const VISIBLE_CHARACTER_PATTERN = /[\p{L}\p{N}\p{P}\p{S}]/u;
const SAFE_BASE_PATH_SEGMENT_PATTERN = /^[\w.~%-]+$/;

const CONFIGURABLE_SITE_PAGES = SITE_PAGE_DEFINITIONS.filter((page) => page.key !== MAIN_SITE_PAGE_KEY);

const isObject = (value) => value !== null && typeof value === "object";

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const splitPathSegments = (path) => (typeof path === "string" ? path.split("/").filter(Boolean) : []);

export const isReservedSitePath = (segment) => RESERVED_SITE_PATH_SEGMENT_SET.has(String(segment || "").toLowerCase());

export const normalizeSitePageNavLabel = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  const label = value.replace(WHITESPACE_RUN_PATTERN, " ").trim();
  const isTooLong = Array.from(label).length > MAX_SITE_PAGE_NAV_LABEL_LENGTH;
  const isUsable = !isTooLong && VISIBLE_CHARACTER_PATTERN.test(label) && !UNSAFE_NAV_LABEL_PATTERN.test(label);

  return isUsable ? label : "";
};

export const normalizeSitePages = (value) => {
  const source = isObject(value) ? value : {};

  return Object.fromEntries(
    CONFIGURABLE_SITE_PAGES.map((page) => {
      const entry = hasOwn(source, page.key) && isObject(source[page.key]) ? source[page.key] : {};

      return [
        page.key,
        {
          enabled: entry.enabled === true,
          navLabel: normalizeSitePageNavLabel(entry.navLabel) || page.defaultNavLabel,
        },
      ];
    })
  );
};

const listEnabledSitePages = (sitePages) => {
  const normalizedSitePages = normalizeSitePages(sitePages);
  return CONFIGURABLE_SITE_PAGES.filter((page) => normalizedSitePages[page.key].enabled);
};

export const hasActiveSitePages = (sitePages) => listEnabledSitePages(sitePages).length > 0;

export const listSitePageMenuItems = (sitePages) => {
  const normalizedSitePages = normalizeSitePages(sitePages);
  const mainPage = SITE_PAGE_DEFINITIONS.find((page) => page.key === MAIN_SITE_PAGE_KEY);

  return [
    { key: mainPage.key, navLabel: mainPage.defaultNavLabel },
    ...listEnabledSitePages(sitePages).map((page) => ({
      key: page.key,
      navLabel: normalizedSitePages[page.key].navLabel,
    })),
  ];
};

export const resolveSitePageFromPath = (pathname, sitePages) => {
  const segments = splitPathSegments(pathname);
  if (segments.length !== 1) {
    return MAIN_SITE_PAGE_KEY;
  }

  const slug = segments[0].toLowerCase();
  const page = listEnabledSitePages(sitePages).find((candidate) => candidate.slug === slug);
  return page ? page.key : MAIN_SITE_PAGE_KEY;
};

export const buildSitePageHref = (basePath, pageKey) => {
  const page = CONFIGURABLE_SITE_PAGES.find((candidate) => candidate.key === pageKey);
  const baseSegments = splitPathSegments(basePath);
  const isSafeBasePath = baseSegments.every((segment) => SAFE_BASE_PATH_SEGMENT_PATTERN.test(segment));
  const segments = isSafeBasePath ? baseSegments : [];
  return `/${(page ? [...segments, page.slug] : segments).join("/")}`;
};

export const resolvePanoramaPageSections = (sitePages, pageKey) => {
  const enabledPages = listEnabledSitePages(sitePages);
  const activePage = enabledPages.find((page) => page.key === pageKey);
  if (activePage) {
    return [...activePage.sections];
  }

  const movedSections = enabledPages.flatMap((page) => page.sections);
  return PANORAMA_PAGE_SECTION_ORDER.filter((section) => !movedSections.includes(section));
};

const findPageIdentityProblems = (pages) => {
  const problems = [];
  const mainPages = pages.filter((page) => page.key === MAIN_SITE_PAGE_KEY);
  const keys = pages.map((page) => page.key);
  const slugs = pages.filter((page) => page.key !== MAIN_SITE_PAGE_KEY).map((page) => page.slug);

  if (mainPages.length !== 1) {
    problems.push("there must be exactly one main page");
  } else if (mainPages[0].slug !== "") {
    problems.push("the main page must have an empty slug");
  }

  keys
    .filter((key, index) => typeof key !== "string" || key === "" || keys.indexOf(key) !== index)
    .forEach((key) => problems.push(`page key ${JSON.stringify(key)} is missing or used twice`));

  slugs.forEach((slug, index) => {
    if (typeof slug !== "string" || !SITE_PAGE_SLUG_PATTERN.test(slug)) {
      problems.push(`slug ${JSON.stringify(slug)} is not a single lowercase path segment`);
    } else if (isReservedSitePath(slug)) {
      problems.push(`slug "${slug}" is a Domits path on a site host`);
    } else if (slugs.indexOf(slug) !== index) {
      problems.push(`slug "${slug}" is used twice`);
    }
  });

  return problems;
};

const findPageContentProblems = (pages) => {
  const problems = [];
  const sectionOwners = new Map();

  pages.forEach((page) => {
    const defaultNavLabel = page.defaultNavLabel;
    const isUsableDefaultNavLabel =
      Boolean(defaultNavLabel) && normalizeSitePageNavLabel(defaultNavLabel) === defaultNavLabel;
    if (!isUsableDefaultNavLabel) {
      problems.push(`page ${JSON.stringify(page.key)} has an unusable default label`);
    }

    (Array.isArray(page.sections) ? page.sections : []).forEach((section) => {
      if (!PANORAMA_PAGE_SECTION_ORDER.includes(section)) {
        problems.push(`section ${JSON.stringify(section)} is not a template section`);
      }
      sectionOwners.set(section, (sectionOwners.get(section) || 0) + 1);
    });
  });

  PANORAMA_PAGE_SECTION_ORDER.filter((section) => sectionOwners.get(section) !== 1).forEach((section) =>
    problems.push(`section "${section}" must belong to exactly one page`)
  );

  return problems;
};

export const findSitePageTableProblems = (pages) => {
  if (!Array.isArray(pages) || pages.length === 0) {
    return ["the page table must list at least the main page"];
  }

  return [...findPageIdentityProblems(pages), ...findPageContentProblems(pages)];
};
