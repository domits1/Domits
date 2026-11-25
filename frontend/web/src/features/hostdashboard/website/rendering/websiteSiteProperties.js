import { getTodayDateKey } from "./booking/quoteSelection";
import { buildWebsiteTemplateModel } from "./buildWebsiteTemplateModel";
import { applyWebsiteDraftContentOverrides } from "./websiteDraftContentOverrides";
import { applyWebsiteDraftThemeOverrides } from "./websiteDraftThemeOverrides";
import { buildSiteHref } from "./websitePages";

export const SITE_PROPERTY_PATH_SEGMENT = "properties";
export const MAX_SITE_PROPERTY_SLUG_LENGTH = 60;
export const SITE_PROPERTY_PAGE_KINDS = Object.freeze({
  property: "property",
  photos: "photos",
  request: "request",
});

const SITE_CONTENT_OVERRIDE_KEYS = new Set(
  [
    "heroContentAlignment ctaLabel ctaNote residenceTitle residenceShowPanel residencePanelColor visibility sitePages",
    "calendarTitle calendarDescription calendarShowPanel calendarPanelColor amenitiesTitle amenitiesDescription",
    "galleryTitle galleryDescription galleryBrowseLabel galleryShowPanel galleryPanelColor amenitiesIconColor",
    "contactTitle contactLabel contactDescription contactAvatarMode contactAvatarImage contactAccentColor",
    "contactBackgroundColor",
  ].flatMap((keys) => keys.split(" "))
);

export const MAX_SITE_PROPERTY_STAY_NIGHTS = 365;
export const SITE_PROPERTY_STAY_QUERY_KEYS = Object.freeze(["checkIn", "checkOut", "guests"]);

const SITE_PROPERTY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STAY_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const STAY_GUESTS_PATTERN = /^[1-9]\d?$/;
const DAY_MS = 86_400_000;
const PAGE_KIND_BY_SEGMENT = new Map([
  [SITE_PROPERTY_PAGE_KINDS.photos, SITE_PROPERTY_PAGE_KINDS.photos],
  [SITE_PROPERTY_PAGE_KINDS.request, SITE_PROPERTY_PAGE_KINDS.request],
]);
const SITE_PROPERTY_NOT_FOUND = Object.freeze({ isFound: false, property: null, pageKind: "" });

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const isSitePropertySlug = (value) =>
  typeof value === "string" && value.length <= MAX_SITE_PROPERTY_SLUG_LENGTH && SITE_PROPERTY_SLUG_PATTERN.test(value);

const isUsableSiteProperty = (entry) => {
  const hasIdentity = isPlainObject(entry) && typeof entry.propertyId === "string" && entry.propertyId.trim() !== "";
  const hasContent = entry?.isMainProperty === true || isPlainObject(entry?.propertySnapshot?.property);
  return hasIdentity && isSitePropertySlug(entry.slug) && hasContent;
};

export const normalizeServedSiteProperties = (value) => {
  const slugs = new Set();
  const propertyIds = new Set();
  const entries = [];

  (Array.isArray(value) ? value : []).filter(isUsableSiteProperty).forEach((entry) => {
    const isMainProperty = entry.isMainProperty === true;
    const isSecondMainProperty = isMainProperty && entries.some((kept) => kept.isMainProperty);
    if (slugs.has(entry.slug) || propertyIds.has(entry.propertyId) || isSecondMainProperty) {
      return;
    }

    slugs.add(entry.slug);
    propertyIds.add(entry.propertyId);
    entries.push(
      isMainProperty
        ? { propertyId: entry.propertyId, slug: entry.slug, isMainProperty }
        : { propertyId: entry.propertyId, slug: entry.slug, isMainProperty, propertySnapshot: entry.propertySnapshot }
    );
  });

  return entries.length < 2 ? [] : entries;
};

const splitSitePropertyPath = (sitePath) => {
  if (typeof sitePath !== "string") {
    return null;
  }

  const segments = (sitePath.endsWith("/") ? sitePath.slice(0, -1) : sitePath).split("/");
  return segments.length > 1 && segments[0].toLowerCase() === SITE_PROPERTY_PATH_SEGMENT ? segments : null;
};

export const parseSitePropertyPath = (sitePath) => {
  const segments = splitSitePropertyPath(sitePath);
  if (!segments || segments.length > 3) {
    return null;
  }

  const slug = segments[1].toLowerCase();
  const pageKind =
    segments.length === 3 ? PAGE_KIND_BY_SEGMENT.get(segments[2].toLowerCase()) : SITE_PROPERTY_PAGE_KINDS.property;
  return isSitePropertySlug(slug) && pageKind ? { slug, pageKind } : null;
};

export const isSitePropertyPath = (sitePath) => parseSitePropertyPath(sitePath) !== null;

export const resolveSitePropertyRoute = (sitePath, siteProperties) => {
  const hasSiteProperties = Array.isArray(siteProperties) && siteProperties.length > 0;
  if (!hasSiteProperties || !splitSitePropertyPath(sitePath)) {
    return null;
  }

  const path = parseSitePropertyPath(sitePath);
  const property = path ? siteProperties.find((entry) => entry.slug === path.slug) : undefined;
  return property ? { isFound: true, property, pageKind: path.pageKind } : SITE_PROPERTY_NOT_FOUND;
};

export const buildSitePropertyHref = (basePath, slug, pageKind = SITE_PROPERTY_PAGE_KINDS.property, search = "") => {
  if (!isSitePropertySlug(slug)) {
    return buildSiteHref(basePath, [], search);
  }

  const pageSegments = PAGE_KIND_BY_SEGMENT.has(pageKind) ? [pageKind] : [];
  return buildSiteHref(basePath, [SITE_PROPERTY_PATH_SEGMENT, slug, ...pageSegments], search);
};

export const buildSitePropertyModel = ({ siteModel, property, contentOverrides, themeOverrides, templateKey }) => {
  if (property.isMainProperty) {
    return siteModel;
  }

  const siteContentOverrides = Object.fromEntries(
    Object.entries(isPlainObject(contentOverrides) ? contentOverrides : {}).filter(([key]) =>
      SITE_CONTENT_OVERRIDE_KEYS.has(key)
    )
  );
  const propertyModel = applyWebsiteDraftContentOverrides(
    applyWebsiteDraftThemeOverrides(
      buildWebsiteTemplateModel({ propertyDetails: property.propertySnapshot, summaryProperty: null }),
      isPlainObject(themeOverrides) ? themeOverrides : {}
    ),
    { ...siteContentOverrides, siteTitle: siteModel.site.title },
    templateKey
  );

  return { ...propertyModel, host: siteModel.host };
};

export const resolveSitePropertyPageTitle = (propertyModel) => {
  const propertyTitle = String(propertyModel?.hero?.title || "").trim();
  return propertyTitle === String(propertyModel?.site?.title || "").trim() ? "" : propertyTitle;
};

const readStayDay = (value) => {
  const match = STAY_DATE_PATTERN.exec(value ?? "");
  const day = match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : Number.NaN;
  return Number.isFinite(day) && new Date(day).toISOString().startsWith(value) ? day : null;
};

const readSingleQueryValue = (params, key) => {
  const values = params.getAll(key);
  return values.length === 1 ? values[0] : null;
};

export const readSitePropertyStayQuery = (search, todayKey = getTodayDateKey()) => {
  const params = new URLSearchParams(typeof search === "string" ? search : "");
  const checkIn = readSingleQueryValue(params, "checkIn");
  const checkOut = readSingleQueryValue(params, "checkOut");
  const guests = readSingleQueryValue(params, "guests");
  const checkInDay = readStayDay(checkIn);
  const checkOutDay = readStayDay(checkOut);
  const nights = checkInDay === null || checkOutDay === null ? 0 : (checkOutDay - checkInDay) / DAY_MS;
  const hasDates = checkIn >= todayKey && nights > 0 && nights <= MAX_SITE_PROPERTY_STAY_NIGHTS;

  return {
    checkIn: hasDates ? checkIn : null,
    checkOut: hasDates ? checkOut : null,
    guests: STAY_GUESTS_PATTERN.test(guests ?? "") ? Number(guests) : null,
  };
};

export const limitSitePropertyStayGuests = (stay, capacity) =>
  Number.isInteger(capacity) && capacity > 0 && stay.guests > capacity ? { ...stay, guests: capacity } : stay;

export const buildSitePropertyStayQuery = (search, stay) => {
  const params = new URLSearchParams(typeof search === "string" ? search : "");
  SITE_PROPERTY_STAY_QUERY_KEYS.forEach((key) => params.delete(key));
  if (STAY_DATE_PATTERN.test(stay?.checkIn ?? "") && STAY_DATE_PATTERN.test(stay?.checkOut ?? "")) {
    params.set("checkIn", stay.checkIn);
    params.set("checkOut", stay.checkOut);
  }
  if (STAY_GUESTS_PATTERN.test(String(stay?.guests ?? ""))) {
    params.set("guests", String(stay.guests));
  }

  const query = params.toString();
  return query ? `?${query}` : "";
};
