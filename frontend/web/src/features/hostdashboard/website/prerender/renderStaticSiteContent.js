import { MODEL_FALLBACK_TITLE, resolveStaticSiteImageUrl } from "./buildStaticSiteMetadata";

const MAX_CONTENT_IMAGES = 6;
const VOLATILE_STAT_IDS = new Set(["rate"]);
const MIRRORED_TEMPLATE_KEYS = new Set(["panorama-landing"]);

const cleanText = (value) => {
  const type = typeof value;
  if (type !== "string" && type !== "number" && type !== "boolean") {
    return "";
  }

  return String(value).replaceAll(/\s+/g, " ").trim();
};

const toArray = (value) => (Array.isArray(value) ? value : []);

export const canRenderStaticSiteContent = (templateKey) => MIRRORED_TEMPLATE_KEYS.has(cleanText(templateKey));

export const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const renderList = (items, renderItem) => items.map(renderItem).join("");

const isSectionVisible = (model, sectionKey) => model?.visibility?.[sectionKey] !== false;

const renderHero = (model, heading, imageAlt) => {
  const eyebrow = cleanText(model?.hero?.eyebrow);
  const description = cleanText(model?.hero?.description);
  const heroImageUrl = resolveStaticSiteImageUrl(model?.media?.heroImage);

  return [
    '<section class="static-site-hero">',
    eyebrow ? `<p class="static-site-eyebrow">${escapeHtml(eyebrow)}</p>` : "",
    `<h1>${escapeHtml(heading)}</h1>`,
    description ? `<p class="static-site-lead">${escapeHtml(description)}</p>` : "",
    heroImageUrl
      ? `<img src="${escapeHtml(heroImageUrl)}" alt="${escapeHtml(imageAlt)}" width="1920" height="1080" />`
      : "",
    "</section>",
  ].join("");
};

const renderAmenities = (model) => {
  const amenities = toArray(model?.amenities?.featured).map((amenity) => cleanText(amenity?.label)).filter(Boolean);
  if (amenities.length === 0) {
    return "";
  }

  return [
    `<section class="static-site-amenities"><h2>${escapeHtml(cleanText(model?.amenitiesSection?.title) || "Amenities")}</h2><ul>`,
    renderList(amenities, (amenity) => `<li>${escapeHtml(amenity)}</li>`),
    "</ul></section>",
  ].join("");
};

const renderGallery = (model, title) => {
  const imageUrls = [
    ...new Set(toArray(model?.media?.galleryImages).map((image) => resolveStaticSiteImageUrl(image)).filter(Boolean)),
  ].slice(0, MAX_CONTENT_IMAGES);
  if (imageUrls.length === 0) {
    return "";
  }

  return [
    `<section class="static-site-gallery"><h2>${escapeHtml(cleanText(model?.gallerySection?.title) || "Gallery")}</h2>`,
    renderList(
      imageUrls,
      (imageUrl, index) =>
        `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(`${title} — photo ${index + 1}`)}" loading="lazy" />`
    ),
    "</section>",
  ].join("");
};

const renderHost = (model) => {
  const hostName = cleanText(model?.host?.name);
  if (!hostName || hostName === "Host") {
    return "";
  }

  return `<section class="static-site-host"><h2>Your host</h2><p>${escapeHtml(hostName)}</p></section>`;
};

export const renderStaticSiteContent = (input) => {
  const { model, title, templateKey } = input ?? {};
  if (!canRenderStaticSiteContent(templateKey)) {
    throw new TypeError(`Cannot mirror template ${JSON.stringify(templateKey)} as static content.`);
  }

  const resolvedTitle = cleanText(title) || cleanText(model?.site?.title);
  if (!resolvedTitle) {
    throw new TypeError("Cannot render static site content without a title.");
  }

  const heroTitle = cleanText(model?.hero?.title);
  const heading = heroTitle && heroTitle !== MODEL_FALLBACK_TITLE ? heroTitle : resolvedTitle;

  return [
    '<main class="static-site-content">',
    renderHero(model, heading, resolvedTitle),
    isSectionVisible(model, "amenitiesPanel") ? renderAmenities(model) : "",
    isSectionVisible(model, "gallerySection") ? renderGallery(model, resolvedTitle) : "",
    isSectionVisible(model, "contactSection") ? renderHost(model) : "",
    "</main>",
  ]
    .filter(Boolean)
    .join("");
};
