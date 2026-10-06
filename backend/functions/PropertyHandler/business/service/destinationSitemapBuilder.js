import { escapeHtml } from "./destinationPageBuilder.js";

export const SITEMAP_NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9";
export const DESTINATION_SITEMAP_PATH = "/sitemap-destinations.xml";
export const PAGES_SITEMAP_PATH = "/sitemap-pages.xml";
export const SITEMAP_URL_LIMIT = 50000;
const DEFAULT_SITE_ORIGIN = "https://www.domits.com";

const cleanOrigin = (siteOrigin) =>
  String(siteOrigin ?? "")
    .trim()
    .replace(/\/+$/, "") || DEFAULT_SITE_ORIGIN;

const toIsoDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("A valid last modification date is required.");
  }
  return date.toISOString().slice(0, 10);
};

const requirePath = (path) => {
  const text = String(path ?? "");
  if (!/^\/[a-z0-9\-/.]*$/.test(text) || (text.endsWith("/") && text !== "/")) {
    throw new Error(`${text || "an empty path"} is not a clean site path.`);
  }
  return text;
};

const renderUrl = (origin, path, lastModified) => {
  const lastmod = lastModified ? `<lastmod>${toIsoDate(lastModified)}</lastmod>` : "";
  return `<url><loc>${escapeHtml(`${origin}${requirePath(path)}`)}</loc>${lastmod}</url>`;
};

export const buildDestinationSitemap = (destinations, { siteOrigin, lastModified } = {}) => {
  const origin = cleanOrigin(siteOrigin);
  const paths = [
    ...new Set((Array.isArray(destinations) ? destinations : []).map((destination) => destination.path)),
  ].sort();
  if (paths.length > SITEMAP_URL_LIMIT) {
    throw new Error(`A sitemap holds at most ${SITEMAP_URL_LIMIT} urls, ${paths.length} were given.`);
  }
  const urls = paths.map((path) => renderUrl(origin, path, lastModified)).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="${SITEMAP_NAMESPACE}">\n${urls}${urls ? "\n" : ""}</urlset>\n`;
};

export const buildSitemapIndex = (sitemaps, { siteOrigin } = {}) => {
  const origin = cleanOrigin(siteOrigin);
  if (!Array.isArray(sitemaps) || sitemaps.length === 0) {
    throw new Error("A sitemap index needs at least one sitemap.");
  }
  const entries = sitemaps
    .map(({ path, lastModified }) => {
      const lastmod = lastModified ? `<lastmod>${toIsoDate(lastModified)}</lastmod>` : "";
      return `<sitemap><loc>${escapeHtml(`${origin}${requirePath(path)}`)}</loc>${lastmod}</sitemap>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="${SITEMAP_NAMESPACE}">\n${entries}\n</sitemapindex>\n`;
};
