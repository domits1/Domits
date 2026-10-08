import { buildStaticSiteMetadata, resolveHtmlLanguageTag } from "./buildStaticSiteMetadata";
import { canRenderStaticSiteContent, escapeHtml, renderStaticSiteContent } from "./renderStaticSiteContent";

const ROOT_PLACEHOLDER_PATTERN = /<div id="root">\s*<\/div>/;
const TITLE_PATTERN = /<title>[\s\S]*?<\/title>\s*/i;
const TAG_BODY = '(?:[^>"\']|"[^"]*"|\'[^\']*\')*';
const META_PATTERN = new RegExp(`<meta\\b${TAG_BODY}>\\s*`, "gi");
const LINK_PATTERN = new RegExp(`<link\\b${TAG_BODY}>\\s*`, "gi");
const OWNED_META_NAME_PATTERN = /\b(?:name|property)\s*=\s*["']?(description|robots|og:[\w:-]+|twitter:[\w:-]+)["']?/i;
const ROBOTS_META_PATTERN = /\bname\s*=\s*["']?robots\b/i;
const CANONICAL_REL_PATTERN = /\brel\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s>]+))/i;

const isCanonicalLink = (tag) => {
  const match = CANONICAL_REL_PATTERN.exec(tag);
  const relValue = match ? match[1] ?? match[2] ?? match[3] ?? "" : "";
  return relValue.toLowerCase().split(/\s+/).includes("canonical");
};

const asText = (value) => (typeof value === "string" || typeof value === "number" ? String(value).trim() : "");

const hasRenderableModel = (model) => {
  if (!model || typeof model !== "object" || Array.isArray(model)) {
    return false;
  }

  return Boolean(asText(model.site?.title) || asText(model.hero?.title));
};
const HTML_LANG_PATTERN = /(<html\b[^>]*\blang=")[^"]*(")/i;
const NOSCRIPT_PATTERN = /<noscript>([\s\S]*?)<\/noscript>\s*/gi;
const APP_SHELL_NOSCRIPT_NOTICE = "You need to enable JavaScript to run this app.";

export const resolveStaticSiteTemplateKey = (renderPayload) =>
  String(renderPayload?.site?.templateKey || renderPayload?.resolution?.templateKey || "").trim();

export const canBuildStaticSiteDocument = (renderPayload) =>
  canRenderStaticSiteContent(resolveStaticSiteTemplateKey(renderPayload));

const renderMetaTag = (attributeName, attributeValue, content) =>
  `<meta ${attributeName}="${escapeHtml(attributeValue)}" content="${escapeHtml(content)}" />`;

const serializeJsonLd = (jsonLd) =>
  JSON.stringify(jsonLd)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");

export const renderStaticSiteHead = (metadata) =>
  [
    `<title>${escapeHtml(metadata.title)}</title>`,
    metadata.description ? renderMetaTag("name", "description", metadata.description) : "",
    metadata.canonicalUrl ? `<link rel="canonical" href="${escapeHtml(metadata.canonicalUrl)}" />` : "",
    renderMetaTag("name", "robots", metadata.robots),
    ...Object.entries(metadata.openGraph).map(([property, content]) => renderMetaTag("property", property, content)),
    ...Object.entries(metadata.twitter).map(([name, content]) => renderMetaTag("name", name, content)),
    metadata.jsonLd
      ? `<script type="application/ld+json">${serializeJsonLd(metadata.jsonLd)}</script>`
      : "",
  ]
    .filter(Boolean)
    .join("");

export const buildStaticSiteDocument = (input) => {
  const { template, renderPayload, model } = input ?? {};
  if (typeof template !== "string" || !ROOT_PLACEHOLDER_PATTERN.test(template)) {
    throw new TypeError('Cannot prerender without an app shell containing an empty <div id="root"></div>.');
  }

  if (!hasRenderableModel(model)) {
    throw new TypeError("Cannot prerender without a model that carries a heading.");
  }

  const metadata = buildStaticSiteMetadata({ renderPayload, model });
  const content = renderStaticSiteContent({
    model,
    title: metadata.title,
    templateKey: resolveStaticSiteTemplateKey(renderPayload),
  });

  if ([...template.matchAll(META_PATTERN)].some((match) => ROBOTS_META_PATTERN.test(match[0]))) {
    throw new TypeError("Cannot prerender an app shell that already carries a robots policy.");
  }

  const documentWithoutOwnedTags = template
    .replace(TITLE_PATTERN, "")
    .replace(META_PATTERN, (match) => (OWNED_META_NAME_PATTERN.test(match) ? "" : match))
    .replace(LINK_PATTERN, (match) => (isCanonicalLink(match) ? "" : match))
    .replace(NOSCRIPT_PATTERN, (match, noscriptContent) =>
      noscriptContent.trim() === APP_SHELL_NOSCRIPT_NOTICE ? "" : match
    );

  if (!documentWithoutOwnedTags.includes("</head>")) {
    throw new TypeError("Cannot prerender without an app shell containing a </head> tag.");
  }

  if (!HTML_LANG_PATTERN.test(documentWithoutOwnedTags)) {
    throw new TypeError("Cannot prerender without an app shell whose <html> tag carries a lang attribute.");
  }

  const head = renderStaticSiteHead(metadata);

  return documentWithoutOwnedTags
    .replace(
      HTML_LANG_PATTERN,
      (match, prefix, suffix) => `${prefix}${escapeHtml(resolveHtmlLanguageTag(metadata.locale))}${suffix}`
    )
    .replace("</head>", () => `${head}</head>`)
    .replace(ROOT_PLACEHOLDER_PATTERN, () => `<div id="root">${content}</div>`);
};
