export const S3_ACCOMMODATION_URL = "https://accommodation.s3.eu-north-1.amazonaws.com/";
export const THUMB_ACCOMMODATION_IMAGE_MAX_WIDTH = 600;
export const WEB_ACCOMMODATION_IMAGE_MAX_WIDTH = 1920;

export const placeholderImage =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><rect width='100%' height='100%' fill='%23eee'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-family='Arial' font-size='20'>No image</text></svg>";

const isHttpUrl = (value) => typeof value === "string" && /^https?:\/\//i.test(value);

const normalizeKey = (value) => String(value || "").trim();

const getVariantValue = (image, keys) => {
  for (const key of keys) {
    const value = normalizeKey(image?.[key]);
    if (value) {
      return value;
    }
  }
  return "";
};

const getVariantWidth = (image, keys, fallbackWidth = null) => {
  for (const key of keys) {
    const widthValue = Number(image?.[key]);
    if (Number.isFinite(widthValue) && widthValue > 0) {
      return Math.trunc(widthValue);
    }
  }

  return fallbackWidth;
};

export const normalizeImageUrl = (maybeKeyOrUrl) => {
  const value = normalizeKey(maybeKeyOrUrl);
  if (!value) {
    return placeholderImage;
  }

  if (isHttpUrl(value)) {
    return value;
  }

  return `${S3_ACCOMMODATION_URL}${value.replace(/^\/+/, "")}`;
};

export const resolveAccommodationImageKey = (image, preferredVariant = "web") => {
  if (!image) {
    return "";
  }

  if (typeof image === "string") {
    return normalizeKey(image);
  }

  const variantOrder =
    preferredVariant === "thumb"
      ? [
          ["thumb_key", "thumbKey"],
          ["web_key", "webKey"],
          ["key"],
          ["original_key", "originalKey"],
        ]
      : [
          ["web_key", "webKey"],
          ["thumb_key", "thumbKey"],
          ["key"],
          ["original_key", "originalKey"],
        ];

  for (const keys of variantOrder) {
    const value = getVariantValue(image, keys);
    if (value) {
      return value;
    }
  }

  return "";
};

export const resolveAccommodationImageUrl = (image, preferredVariant = "web") =>
  normalizeImageUrl(resolveAccommodationImageKey(image, preferredVariant));

export const resolveAccommodationImageUrls = (images, preferredVariant = "web") => {
  const safeImages = Array.isArray(images) ? images : [];
  return safeImages
    .map((image) => resolveAccommodationImageKey(image, preferredVariant))
    .filter(Boolean)
    .map((imageKey) => normalizeImageUrl(imageKey));
};

export const buildAccommodationImageAssetFromUrl = (imageUrl) => {
  const normalizedImageUrl = normalizeKey(imageUrl);
  if (!normalizedImageUrl) {
    return null;
  }

  const src = normalizeImageUrl(normalizedImageUrl);
  return {
    src,
    thumbSrc: "",
    webSrc: "",
    originalSrc: src,
    srcSet: "",
    sizes: "",
  };
};

export const buildAccommodationImageAsset = (image, preferredVariant = "web") => {
  if (!image) {
    return null;
  }

  if (typeof image === "string") {
    return buildAccommodationImageAssetFromUrl(image);
  }

  const resolvedImageKey = resolveAccommodationImageKey(image, preferredVariant);
  if (!resolvedImageKey) {
    return null;
  }

  const src = normalizeImageUrl(resolvedImageKey);
  const thumbKey = getVariantValue(image, ["thumb_key", "thumbKey"]);
  const webKey = getVariantValue(image, ["web_key", "webKey"]);
  const originalKey = getVariantValue(image, ["original_key", "originalKey"]);
  const thumbSrc = thumbKey ? normalizeImageUrl(thumbKey) : "";
  const webSrc = webKey ? normalizeImageUrl(webKey) : "";
  const originalSrc = originalKey ? normalizeImageUrl(originalKey) : "";
  const thumbWidth = getVariantWidth(
    image,
    ["thumb_width", "thumbWidth"],
    thumbSrc ? THUMB_ACCOMMODATION_IMAGE_MAX_WIDTH : null
  );
  const webWidth = getVariantWidth(
    image,
    ["web_width", "webWidth"],
    webSrc ? WEB_ACCOMMODATION_IMAGE_MAX_WIDTH : null
  );
  const originalWidth = getVariantWidth(image, ["original_width", "originalWidth"]);
  const srcSetCandidates = [
    thumbSrc && thumbWidth ? `${thumbSrc} ${thumbWidth}w` : "",
    webSrc && webWidth ? `${webSrc} ${webWidth}w` : "",
    originalSrc && originalWidth ? `${originalSrc} ${originalWidth}w` : "",
  ].filter(Boolean);

  return {
    src,
    thumbSrc,
    webSrc,
    originalSrc,
    srcSet: Array.from(new Set(srcSetCandidates)).join(", "),
    sizes: "100vw",
  };
};

export const buildAccommodationImageAssets = (images, preferredVariant = "web") =>
  (Array.isArray(images) ? images : [])
    .map((image) => buildAccommodationImageAsset(image, preferredVariant))
    .filter(Boolean);

export const resolvePrimaryAccommodationImageUrl = (images, preferredVariant = "thumb") => {
  const safeImages = Array.isArray(images) ? images : [];
  if (safeImages.length < 1) {
    return placeholderImage;
  }
  return resolveAccommodationImageUrl(safeImages[0], preferredVariant);
};
