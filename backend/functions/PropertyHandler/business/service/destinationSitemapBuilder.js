import { escapeHtml } from "./destinationPageBuilder.js";

export const SITEMAP_NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9";
export const DESTINATION_SITEMAP_PATH = "/sitemap-destinations.xml";
export const PAGES_SITEMAP_PATH = "/sitemap-pages.xml";
export const SITEMAP_ENTRY_LIMIT = 50000;
export const SITEMAP_BYTE_LIMIT = 52428800;
const DEFAULT_SITE_ORIGIN = "https://www.domits.com";
const SEGMENT = /^[a-z0-9]+(?:[-.][a-z0-9]+)*$/;

const requireOrigin = (siteOrigin) => {
  const text = String(siteOrigin ?? DEFAULT_SITE_ORIGIN).trim();
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new Error(`${text || "an empty origin"} is not a site origin.`);
  }
  if (!["http:", "https:"].includes(url.protocol) || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${text} is not a site origin.`);
  }
  return url.origin;
};

const DATE_TEXT = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))?$/;

const toIsoDate = (value) => {
  const text = value instanceof Date ? value.toISOString() : value;
  const match = typeof text === "string" ? DATE_TEXT.exec(text) : null;
  const day = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
  const instant = match ? new Date(text) : null;
  if (!match || Number.isNaN(instant.getTime()) || day.toISOString().slice(0, 10) !== text.slice(0, 10)) {
    throw new Error(`${String(text)} is not a valid last modification date.`);
  }
  return instant.toISOString().slice(0, 10);
};

const renderLastModified = (lastModified) =>
  lastModified === undefined || lastModified === null ? "" : `<lastmod>${toIsoDate(lastModified)}</lastmod>`;

const requirePath = (path) => {
  const text = String(path ?? "");
  const segments = text.split("/");
  if (segments.length < 2 || segments[0] !== "" || !segments.slice(1).every((segment) => SEGMENT.test(segment))) {
    throw new Error(`${text || "an empty path"} is not a clean site path.`);
  }
  return text;
};

const requireSize = (xml, entries) => {
  if (entries > SITEMAP_ENTRY_LIMIT) {
    throw new Error(`A sitemap holds at most ${SITEMAP_ENTRY_LIMIT} entries, ${entries} were given.`);
  }
  if (Buffer.byteLength(xml, "utf8") > SITEMAP_BYTE_LIMIT) {
    throw new Error(`A sitemap holds at most ${SITEMAP_BYTE_LIMIT} bytes.`);
  }
  return xml;
};

const renderDocument = (element, entries) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<${element} xmlns="${SITEMAP_NAMESPACE}">\n${entries.join("\n")}\n</${element}>\n`;

export const buildDestinationSitemap = (destinations, { siteOrigin, lastModified } = {}) => {
  const origin = requireOrigin(siteOrigin);
  const paths = [...new Set((Array.isArray(destinations) ? destinations : []).map((destination) => destination.path))];
  if (paths.length === 0) {
    return null;
  }
  const lastmod = renderLastModified(lastModified);
  const urls = paths
    .sort()
    .map((path) => `<url><loc>${escapeHtml(`${origin}${requirePath(path)}`)}</loc>${lastmod}</url>`);
  return requireSize(renderDocument("urlset", urls), urls.length);
};

export const buildSitemapIndex = (sitemaps, { siteOrigin } = {}) => {
  const origin = requireOrigin(siteOrigin);
  if (!Array.isArray(sitemaps) || sitemaps.length === 0) {
    throw new Error("A sitemap index needs at least one sitemap.");
  }
  const entries = sitemaps.map(
    ({ path, lastModified }) =>
      `<sitemap><loc>${escapeHtml(`${origin}${requirePath(path)}`)}</loc>${renderLastModified(lastModified)}</sitemap>`
  );
  return requireSize(renderDocument("sitemapindex", entries), entries.length);
};
