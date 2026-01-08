export const S3_URL = "https://accommodation.s3.eu-north-1.amazonaws.com/";

export const placeholderImage =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><rect width='100%' height='100%' fill='%23eee'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-family='Arial' font-size='20'>No image</text></svg>";

export const normalizeImageUrl = (maybeKeyOrUrl) => {
  if (!maybeKeyOrUrl) return placeholderImage;

  const valueAsString = String(maybeKeyOrUrl);

  if (valueAsString.startsWith("http")) return valueAsString;

  return `${S3_URL}${valueAsString.replace(/^\/+/, "")}`;
};
