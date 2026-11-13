import { ACCOMMODATION_IMAGE_BASE_URL } from "../../util/destination/accommodationImage.js";
import { isDestinationEligible, readDestinationSettings } from "../../util/destination/destinationSettings.js";
import { isDestinationSlug } from "../../util/destination/destinationSlug.js";
import { renderDestinationDocument } from "./destinationPageLayout.js";

export const DESTINATIONS_ROOT_PATH = "/destinations";
export const DESTINATION_PAGE_CACHE_CONTROL = "public, max-age=300";
const DEFAULT_SITE_ORIGIN = "https://www.domits.com";
const DESTINATIONS_ROOT_NAME = "Destinations";

const ESCAPES = Object.freeze({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" });

export const escapeHtml = (value) => String(value ?? "").replaceAll(/[&<>"']/g, (character) => ESCAPES[character]);

const escapeJsonForScript = (value) => JSON.stringify(value).replaceAll("<", String.raw`\u003c`);

const cleanText = (value) =>
  String(value ?? "")
    .replaceAll(/\s+/g, " ")
    .trim();

const toSiteOrigin = (siteOrigin) => {
  let origin = cleanText(siteOrigin);
  while (origin.endsWith("/")) {
    origin = origin.slice(0, -1);
  }
  return origin || DEFAULT_SITE_ORIGIN;
};

const isSameSitePath = (path) =>
  typeof path === "string" && path.startsWith("/") && path.slice(1).split("/").every(isDestinationSlug);

const renderDestinationLink = ({ name, path }) =>
  isSameSitePath(path) ? `<a href="${escapeHtml(path)}">${escapeHtml(name)}</a>` : escapeHtml(name);

const pluralListings = (count) => (count === 1 ? "1 holiday rental" : `${count} holiday rentals`);

const describe = (destination, listingCount, children) => {
  const placeWord = children.length === 1 ? "destination" : "destinations";
  const places = children.length > 0 ? ` across ${children.length} ${placeWord}` : "";
  return `Book ${pluralListings(listingCount)} in ${destination.name}${places} directly with the host on Domits.`;
};

const renderBreadcrumbs = (trail, origin) => {
  const items = trail.map((crumb, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: crumb.name,
    item: `${origin}${crumb.path}`,
  }));
  const links = trail
    .map((crumb, index) =>
      index === trail.length - 1
        ? `<li aria-current="page">${escapeHtml(crumb.name)}</li>`
        : `<li>${renderDestinationLink(crumb)}</li>`
    )
    .join("");
  return {
    nav: `<nav aria-label="Breadcrumb"><ol class="breadcrumbs">${links}</ol></nav>`,
    jsonLd: `<script type="application/ld+json">${escapeJsonForScript({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items,
    })}</script>`,
  };
};

const renderChildren = (children) => {
  if (children.length === 0) {
    return "";
  }
  const items = children
    .map(
      (child) =>
        `<li>${renderDestinationLink(child)} <span class="count">${pluralListings(child.activeListings)}</span></li>`
    )
    .join("");
  return `<section class="children"><h2>Destinations</h2><ul>${items}</ul></section>`;
};

const LISTING_TEXT_MAX_LENGTH = 120;
const LISTING_TITLE_FALLBACK = "Holiday rental";

const shorten = (value) => {
  const characters = Array.from(cleanText(value));
  if (characters.length <= LISTING_TEXT_MAX_LENGTH) {
    return characters.join("");
  }
  return `${characters
    .slice(0, LISTING_TEXT_MAX_LENGTH - 1)
    .join("")
    .trimEnd()}\u2026`;
};

const isAccommodationPhoto = (value) =>
  typeof value === "string" &&
  value.length > ACCOMMODATION_IMAGE_BASE_URL.length &&
  value.startsWith(ACCOMMODATION_IMAGE_BASE_URL);

const renderListing = (listing) => {
  const href = `/listingdetails?ID=${encodeURIComponent(listing.id)}`;
  const title = escapeHtml(shorten(listing.title) || LISTING_TITLE_FALLBACK);
  const place = escapeHtml(shorten([cleanText(listing.city), cleanText(listing.country)].filter(Boolean).join(", ")));
  const photo = isAccommodationPhoto(listing.imageUrl)
    ? `<img src="${escapeHtml(listing.imageUrl)}" alt="${title}" loading="lazy">`
    : '<span class="photo"></span>';
  const placeLine = place ? `<p class="place" dir="auto">${place}</p>` : "";
  const price =
    Number.isFinite(listing.nightlyRate) && listing.nightlyRate > 0
      ? `<p class="price">From &euro;${Math.trunc(listing.nightlyRate)} per night</p>`
      : "";
  return `<li class="listing"><a href="${href}">${photo}<h3 dir="auto">${title}</h3>${placeLine}${price}</a></li>`;
};

const renderListings = (listings) =>
  listings.length === 0
    ? ""
    : `<section class="listings"><h2>Stays</h2><ul>${listings.map(renderListing).join("")}</ul></section>`;

const NOT_INDEXED = '<meta name="robots" content="noindex, nofollow">';

const renderSocialHead = ({ title, description, canonical }) =>
  `<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:type" content="website">`;

export const buildDestinationNotFoundPage = () =>
  renderDestinationDocument({
    head: `<title>Destination not found | Domits</title>${NOT_INDEXED}`,
    main: `<main class="notice"><h1>No stays here yet</h1><p>There are no holiday rentals in this destination at the moment.</p><p><a href="${DESTINATIONS_ROOT_PATH}">All destinations</a></p></main>`,
  });

export const buildDestinationUnavailablePage = () =>
  renderDestinationDocument({
    head: `<title>Destinations unavailable | Domits</title>${NOT_INDEXED}`,
    main: '<main class="notice"><h1>Destinations are unavailable</h1><p>Please try again in a minute.</p></main>',
  });

const renderRootContinent = (continent) => {
  const heading = continent.hasPage ? renderDestinationLink(continent) : escapeHtml(continent.name);
  const countries = continent.countries
    .map(
      (country) =>
        `<li>${country.hasPage ? renderDestinationLink(country) : escapeHtml(country.name)} <span class="count">${pluralListings(country.activeListings)}</span></li>`
    )
    .join("");
  return `<section class="children"><h2>${heading}</h2>${countries ? `<ul>${countries}</ul>` : ""}</section>`;
};

export const buildDestinationRootPage = ({ continents = [], siteOrigin = DEFAULT_SITE_ORIGIN } = {}) => {
  if (continents.length === 0) {
    return null;
  }
  const canonical = `${toSiteOrigin(siteOrigin)}${DESTINATIONS_ROOT_PATH}`;
  const title = "Holiday rentals by destination | Domits";
  const description = "Find holiday rentals by destination and book directly with the host on Domits.";
  const html = renderDestinationDocument({
    head: renderSocialHead({ title, description, canonical }),
    main: `<main><h1>Destinations</h1><p class="intro">${escapeHtml(description)}</p>${continents.map(renderRootContinent).join("")}</main>`,
  });
  return {
    html,
    title,
    description,
    canonical,
    path: DESTINATIONS_ROOT_PATH,
    cacheControl: DESTINATION_PAGE_CACHE_CONTROL,
  };
};

export const buildDestinationPage = ({
  destination,
  parents = [],
  children = [],
  listings = [],
  activeListings,
  directListings,
  siteOrigin = DEFAULT_SITE_ORIGIN,
  settings = readDestinationSettings(),
} = {}) => {
  if (!destination?.path || !destination?.name || !destination?.type) {
    throw new Error("A destination with a type, a name and a path is required.");
  }
  const eligibleChildren = children.filter((child) =>
    isDestinationEligible({ activeListings: child.activeListings }, settings)
  );
  const listingCount = Number.isInteger(activeListings) ? activeListings : listings.length;
  const ownListings = Number.isInteger(directListings) ? directListings : listingCount;
  const eligibility = {
    activeListings: listingCount,
    directListings: ownListings,
    eligibleChildren: eligibleChildren.length,
  };
  if (!isDestinationEligible(eligibility, settings)) {
    throw new Error(`${destination.path} has no active listings and no destinations below it, so it has no page.`);
  }

  const origin = toSiteOrigin(siteOrigin);
  const trail = [{ name: DESTINATIONS_ROOT_NAME, path: DESTINATIONS_ROOT_PATH }, ...parents, destination];
  const breadcrumbs = renderBreadcrumbs(trail, origin);
  const title = `Holiday rentals in ${cleanText(destination.name)} | Domits`;
  const description = describe(destination, listingCount, eligibleChildren);
  const canonical = `${origin}${destination.path}`;

  const html = renderDestinationDocument({
    head: `${renderSocialHead({ title, description, canonical })}${breadcrumbs.jsonLd}`,
    main: `<main>${breadcrumbs.nav}<h1>Holiday rentals in ${escapeHtml(destination.name)}</h1><p class="intro">${escapeHtml(description)}</p>${renderChildren(eligibleChildren)}${renderListings(listings)}</main>`,
  });

  return { html, title, description, canonical, path: destination.path, cacheControl: DESTINATION_PAGE_CACHE_CONTROL };
};
