const SITEMAP_NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9";
const XML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };

const escapeXml = (text) => String(text).replaceAll(/[&<>"']/g, (character) => XML_ESCAPES[character]);

export const buildStaticSiteSitemap = (pageUrls = []) =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="${SITEMAP_NAMESPACE}">`,
    ...pageUrls.map((pageUrl) => `  <url><loc>${escapeXml(pageUrl)}</loc></url>`),
    "</urlset>",
    "",
  ].join("\n");

export const resolveSitemapPageUrls = ({ hostname, mainAddress }) =>
  mainAddress?.status === "ACTIVE" && mainAddress.domain === hostname ? [`https://${hostname}/`] : [];
