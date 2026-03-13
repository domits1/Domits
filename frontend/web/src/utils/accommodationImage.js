export const S3_ACCOMMODATION_URL = "https://accommodation.s3.eu-north-1.amazonaws.com/";

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

export const resolvePrimaryAccommodationImageUrl = (images, preferredVariant = "thumb") => {
  const safeImages = Array.isArray(images) ? images : [];
  if (safeImages.length < 1) {
    return placeholderImage;
  }
  return resolveAccommodationImageUrl(safeImages[0], preferredVariant);
};
