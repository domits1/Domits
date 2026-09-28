const DESCRIPTION_MAX_LENGTH = 160;
const HOSTNAME_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
const REGIONAL_LOCALE_PATTERN = /^([a-z]{2,3})[_-]([a-z]{2})$/i;
const EMBEDDED_DATA_URI_PATTERN = /data:[a-z]+\/[a-z0-9+.-]+/i;
export const MODEL_FALLBACK_TITLE = "Untitled listing";
const MAX_JSON_LD_IMAGES = 6;
const MAX_JSON_LD_AMENITIES = 12;

const cleanText = (value) => String(value ?? "").replaceAll(/\s+/g, " ").trim();

const toArray = (value) => (Array.isArray(value) ? value : []);

const truncateAtWordBoundary = (value, maxLength) => {
  if (value.length <= maxLength) {
    return value;
  }

  const clipped = value.slice(0, maxLength - 1);
  const lastSpace = clipped.lastIndexOf(" ");
  const usable = lastSpace > maxLength / 2 ? clipped.slice(0, lastSpace) : clipped;
  return `${usable.replace(/[\s,.;:—-]+$/, "")}…`;
};

export const resolveStaticSiteImageUrl = (value) => {
  const candidate = cleanText(value);
  if (!/^https:\/\/[^\s/?#]+\.[^\s/?#]+/i.test(candidate)) {
    return "";
  }

  if (EMBEDDED_DATA_URI_PATTERN.test(candidate)) {
    return "";
  }

  return candidate;
};

export const resolveOpenGraphLocale = (locale) => {
  const match = REGIONAL_LOCALE_PATTERN.exec(cleanText(locale));
  return match ? `${match[1].toLowerCase()}_${match[2].toUpperCase()}` : "";
};

export const resolveHtmlLanguageTag = (locale) => {
  const match = REGIONAL_LOCALE_PATTERN.exec(cleanText(locale));
  return match ? `${match[1].toLowerCase()}-${match[2].toUpperCase()}` : cleanText(locale);
};

export const resolveStaticSitePrimaryDomain = (renderPayload) => {
  const candidate = renderPayload?.resolution?.domain || renderPayload?.domain;
  return candidate?.isPrimary === true ? candidate : null;
};

export const resolveStaticSiteCanonicalUrl = (renderPayload) => {
  const domain = cleanText(resolveStaticSitePrimaryDomain(renderPayload)?.domain).toLowerCase();
  if (!HOSTNAME_PATTERN.test(domain)) {
    return "";
  }

  return `https://${domain}/`;
};

export const isStaticSitePubliclyIndexable = (renderPayload) => {
  if (!resolveStaticSiteCanonicalUrl(renderPayload)) {
    return false;
  }

  if (typeof renderPayload?.resolution?.isReachable === "boolean") {
    return renderPayload.resolution.isReachable;
  }

  return (
    cleanText(renderPayload?.site?.status).toUpperCase() === "PUBLISHED" &&
    cleanText(resolveStaticSitePrimaryDomain(renderPayload)?.status).toUpperCase() === "ACTIVE"
  );
};

export const resolveStaticSiteListingName = (renderPayload, model) => {
  const modelTitle = cleanText(model?.site?.title);
  if (modelTitle && modelTitle !== MODEL_FALLBACK_TITLE) {
    return modelTitle;
  }

  return cleanText(renderPayload?.site?.siteName) || modelTitle;
};

const resolveTitle = (listingName, model) => {
  if (!listingName) {
    return "Direct booking website";
  }

  const locationLabel = cleanText(model?.location?.label);
  return locationLabel ? `${listingName} | ${locationLabel}` : listingName;
};

const resolveDescription = (model) => {
  const source =
    cleanText(model?.hero?.description) ||
    cleanText(model?.location?.narrative) ||
    cleanText(model?.site?.subtitle);
  return source ? truncateAtWordBoundary(source, DESCRIPTION_MAX_LENGTH) : "";
};

const buildJsonLd = ({ model, name, title, description, canonicalUrl, imageUrls }) => {
  if (!name) {
    return null;
  }

  const city = cleanText(model?.location?.city);
  const country = cleanText(model?.location?.country);
  const amenityNames =
    model?.visibility?.amenitiesPanel === false
      ? []
      : toArray(model?.amenities?.all)
          .map((amenity) => cleanText(amenity?.label))
          .filter(Boolean)
          .slice(0, MAX_JSON_LD_AMENITIES);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name,
  };

  if (description) {
    jsonLd.description = description;
  }
  if (canonicalUrl) {
    jsonLd.url = canonicalUrl;
  }
  if (imageUrls.length > 0) {
    jsonLd.image = imageUrls.slice(0, MAX_JSON_LD_IMAGES);
  }
  if (city || country) {
    jsonLd.address = {
      "@type": "PostalAddress",
      ...(city ? { addressLocality: city } : {}),
      ...(country ? { addressCountry: country } : {}),
    };
  }
  if (amenityNames.length > 0) {
    jsonLd.amenityFeature = amenityNames.map((amenityName) => ({
      "@type": "LocationFeatureSpecification",
      name: amenityName,
      value: true,
    }));
  }

  return title === name ? jsonLd : { ...jsonLd, alternateName: title };
};

export const buildStaticSiteMetadata = ({ renderPayload, model }) => {
  const indexable = isStaticSitePubliclyIndexable(renderPayload);
  const canonicalUrl = resolveStaticSiteCanonicalUrl(renderPayload);
  const listingName = resolveStaticSiteListingName(renderPayload, model);
  const title = resolveTitle(listingName, model);
  const description = resolveDescription(model);
  const locale = cleanText(renderPayload?.site?.primaryLocale) || cleanText(model?.source?.locale) || "en";
  const openGraphLocale = resolveOpenGraphLocale(locale);
  const siteName = cleanText(renderPayload?.site?.siteName) || listingName || title;
  const galleryImages = model?.visibility?.gallerySection === false ? [] : toArray(model?.media?.galleryImages);
  const imageUrls = [
    ...new Set([model?.media?.heroImage, ...galleryImages].map(resolveStaticSiteImageUrl).filter(Boolean)),
  ];
  const primaryImageUrl = imageUrls[0] || "";

  const openGraph = {
    "og:type": "website",
    "og:site_name": siteName,
    "og:title": title,
    ...(openGraphLocale ? { "og:locale": openGraphLocale } : {}),
    ...(description ? { "og:description": description } : {}),
    ...(canonicalUrl ? { "og:url": canonicalUrl } : {}),
    ...(primaryImageUrl ? { "og:image": primaryImageUrl, "og:image:alt": title } : {}),
  };

  const twitter = {
    "twitter:card": primaryImageUrl ? "summary_large_image" : "summary",
    "twitter:title": title,
    ...(description ? { "twitter:description": description } : {}),
    ...(primaryImageUrl ? { "twitter:image": primaryImageUrl } : {}),
  };

  return {
    title,
    description,
    canonicalUrl: indexable ? canonicalUrl : "",
    robots: indexable ? "index, follow" : "noindex, nofollow",
    locale,
    openGraph,
    twitter,
    jsonLd: indexable
      ? buildJsonLd({ model, name: listingName, title, description, canonicalUrl, imageUrls })
      : null,
  };
};
