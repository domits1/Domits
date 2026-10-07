import { isDestinationEligible, readDestinationSettings } from "../../util/destination/destinationSettings.js";

export const DESTINATIONS_ROOT_PATH = "/destinations";
export const DESTINATION_PAGE_CACHE_CONTROL = "public, max-age=60";
const DEFAULT_SITE_ORIGIN = "https://www.domits.com";
const DESTINATIONS_ROOT_NAME = "Destinations";

const ESCAPES = Object.freeze({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" });

export const escapeHtml = (value) => String(value ?? "").replaceAll(/[&<>"']/g, (character) => ESCAPES[character]);

const escapeJsonForScript = (value) => JSON.stringify(value).replaceAll("<", String.raw`\u003c`);

const cleanText = (value) =>
  String(value ?? "")
    .replaceAll(/\s+/g, " ")
    .trim();

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
        : `<li><a href="${escapeHtml(crumb.path)}">${escapeHtml(crumb.name)}</a></li>`
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
        `<li><a href="${escapeHtml(child.path)}">${escapeHtml(child.name)}</a> <span class="count">${pluralListings(child.activeListings)}</span></li>`
    )
    .join("");
  return `<section class="children"><h2>Destinations</h2><ul>${items}</ul></section>`;
};

const renderListing = (listing) => {
  const href = `/listingdetails?ID=${encodeURIComponent(listing.id)}`;
  const image = listing.imageUrl
    ? `<img src="${escapeHtml(listing.imageUrl)}" alt="${escapeHtml(listing.title)}" loading="lazy">`
    : "";
  const price =
    Number.isFinite(listing.nightlyRate) && listing.nightlyRate > 0
      ? `<p class="price">From &euro;${Math.trunc(listing.nightlyRate)} per night</p>`
      : "";
  return `<li class="listing"><a href="${href}">${image}<h3>${escapeHtml(listing.title)}</h3></a><p class="place">${escapeHtml(listing.city)}, ${escapeHtml(listing.country)}</p>${price}</li>`;
};

const renderListings = (listings) =>
  listings.length === 0
    ? ""
    : `<section class="listings"><h2>Stays</h2><ul>${listings.map(renderListing).join("")}</ul></section>`;

const STYLE =
  "body{margin:0;font-family:system-ui,sans-serif;color:#1f2933;background:#fff}main{max-width:72rem;margin:0 auto;padding:clamp(1rem,4vw,3rem)}.breadcrumbs{display:flex;flex-wrap:wrap;gap:.5rem;list-style:none;padding:0;margin:0 0 1.5rem}.breadcrumbs li+li::before{content:'/';margin-right:.5rem;color:#9aa5b1}ul{list-style:none;padding:0}.children ul,.listings ul{display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(16rem,1fr))}.listing img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:.75rem}.listing a{color:inherit;text-decoration:none}.count,.place{color:#52606d}";

export const buildDestinationNotFoundPage = ({ siteOrigin = DEFAULT_SITE_ORIGIN } = {}) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Destination not found | Domits</title><meta name="robots" content="noindex, nofollow"><style>${STYLE}</style></head><body><main><h1>No stays here yet</h1><p>There are no holiday rentals in this destination at the moment.</p><p><a href="${escapeHtml(siteOrigin)}${DESTINATIONS_ROOT_PATH}">All destinations</a></p></main></body></html>\n`;

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

  let origin = cleanText(siteOrigin);
  while (origin.endsWith("/")) {
    origin = origin.slice(0, -1);
  }
  origin ||= DEFAULT_SITE_ORIGIN;
  const trail = [{ name: DESTINATIONS_ROOT_NAME, path: DESTINATIONS_ROOT_PATH }, ...parents, destination];
  const breadcrumbs = renderBreadcrumbs(trail, origin);
  const title = `Holiday rentals in ${cleanText(destination.name)} | Domits`;
  const description = describe(destination, listingCount, eligibleChildren);
  const canonical = `${origin}${destination.path}`;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:type" content="website">${breadcrumbs.jsonLd}<style>${STYLE}</style></head><body><main>${breadcrumbs.nav}<h1>Holiday rentals in ${escapeHtml(destination.name)}</h1><p class="intro">${escapeHtml(description)}</p>${renderChildren(eligibleChildren)}${renderListings(listings)}</main></body></html>\n`;

  return { html, title, description, canonical, path: destination.path, cacheControl: DESTINATION_PAGE_CACHE_CONTROL };
};
