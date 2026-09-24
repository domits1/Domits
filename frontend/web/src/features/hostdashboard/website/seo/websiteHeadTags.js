import { normalizeImageUrl, resolveAccommodationImageKey } from "../../../../utils/accommodationImage";

export const WEBSITE_HEAD_DESCRIPTION_MAX_LENGTH = 155;
export const WEBSITE_HEAD_ROBOTS_NOINDEX = "noindex, nofollow";
export const WEBSITE_HEAD_ROBOTS_META_NAME = "robots";
export const WEBSITE_HEAD_OG_TYPE = "website";

const ABSOLUTE_HTTP_URL_PATTERN = /^https?:\/\//i;
const NON_HTTP_SCHEME_PATTERN = /^(?!https?:)[a-z][a-z0-9+.-]*:/i;
const TRAILING_SEPARATOR_PATTERN = /[\s,.;:!?-]+$/u;

export const normalizeWebsiteHeadText = (value) =>
  String(value ?? "")
    .replaceAll(/\s+/g, " ")
    .trim();

export const truncateWebsiteHeadText = (value, maxLength = WEBSITE_HEAD_DESCRIPTION_MAX_LENGTH) => {
  const normalizedValue = normalizeWebsiteHeadText(value);
  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  const clippedValue = normalizedValue.slice(0, maxLength);
  const lastSpaceIndex = clippedValue.lastIndexOf(" ");
  const truncatedValue = lastSpaceIndex > 0 ? clippedValue.slice(0, lastSpaceIndex) : clippedValue;
  const cleanedValue = truncatedValue.replace(TRAILING_SEPARATOR_PATTERN, "");

  return `${cleanedValue || truncatedValue}…`;
};

export const buildWebsiteHeadLocationLabel = ({ city, country } = {}) =>
  [normalizeWebsiteHeadText(city), normalizeWebsiteHeadText(country)].filter(Boolean).join(", ");

export const buildWebsiteHeadTitle = ({ title, city, country } = {}) => {
  const normalizedTitle = normalizeWebsiteHeadText(title);
  if (!normalizedTitle) {
    return "";
  }

  const locationLabel = buildWebsiteHeadLocationLabel({ city, country });
  return locationLabel ? `${normalizedTitle} | ${locationLabel}` : normalizedTitle;
};

export const resolveWebsiteHeadImageUrl = (images) => {
  const candidateImages = Array.isArray(images) ? images : [images];

  for (const candidateImage of candidateImages) {
    const candidateImageKey = resolveAccommodationImageKey(candidateImage, "web");
    if (!candidateImageKey || NON_HTTP_SCHEME_PATTERN.test(candidateImageKey)) {
      continue;
    }

    const resolvedImageUrl = normalizeImageUrl(candidateImageKey);
    if (ABSOLUTE_HTTP_URL_PATTERN.test(resolvedImageUrl)) {
      return resolvedImageUrl;
    }
  }

  return "";
};

const selectWebsiteHeadSource = (model) => ({
  title: normalizeWebsiteHeadText(model?.site?.title),
  description: normalizeWebsiteHeadText(model?.hero?.description || model?.site?.subtitle),
  city: normalizeWebsiteHeadText(model?.location?.city),
  country: normalizeWebsiteHeadText(model?.location?.country),
  images: [
    model?.media?.heroImage,
    ...(Array.isArray(model?.media?.galleryImages) ? model.media.galleryImages : []),
  ],
});

const buildRobotsOnlyTags = (title) => ({
  title,
  metaByName: { [WEBSITE_HEAD_ROBOTS_META_NAME]: WEBSITE_HEAD_ROBOTS_NOINDEX },
  metaByProperty: {},
});

export const buildWebsiteHeadTags = ({
  model = null,
  fallbackTitle = "",
  isDirectBookingHost = true,
  isUnavailable = false,
  isMissing = false,
} = {}) => {
  const headSource = selectWebsiteHeadSource(model);
  const normalizedFallbackTitle = normalizeWebsiteHeadText(fallbackTitle);

  if (!isDirectBookingHost) {
    return buildRobotsOnlyTags(buildWebsiteHeadTitle(headSource) || normalizedFallbackTitle);
  }

  if (isUnavailable || !headSource.title) {
    const unavailableTitle = normalizedFallbackTitle || headSource.title;
    if (isMissing) {
      return buildRobotsOnlyTags(unavailableTitle);
    }

    return {
      title: unavailableTitle,
      metaByName: {},
      metaByProperty: {},
    };
  }

  const headTitle = buildWebsiteHeadTitle(headSource);
  const headDescription = truncateWebsiteHeadText(headSource.description);
  const headImageUrl = resolveWebsiteHeadImageUrl(headSource.images);
  const metaByName = {};
  const metaByProperty = {
    "og:type": WEBSITE_HEAD_OG_TYPE,
    "og:title": headTitle,
  };

  if (headDescription) {
    metaByName.description = headDescription;
    metaByProperty["og:description"] = headDescription;
  }

  if (headImageUrl) {
    metaByProperty["og:image"] = headImageUrl;
    metaByProperty["og:image:alt"] = headTitle;
  }

  return {
    title: headTitle,
    metaByName,
    metaByProperty,
  };
};
