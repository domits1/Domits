import {
  normalizeImageUrl as normalizeAccommodationImageUrl,
  resolveAccommodationImageKey as resolveAccommodationImageKeyInternal,
  resolveAccommodationImageUrl as resolveAccommodationImageUrlInternal,
  resolveAccommodationImageUrls as resolveAccommodationImageUrlsInternal,
  resolvePrimaryAccommodationImageUrl as resolvePrimaryAccommodationImageUrlInternal,
} from "../../../utils/accommodationImage";

export { S3_ACCOMMODATION_URL as S3_URL, placeholderImage } from "../../../utils/accommodationImage";
export const normalizeImageUrl = (maybeKeyOrUrl) =>
  normalizeAccommodationImageUrl(maybeKeyOrUrl);
export const resolveAccommodationImageKey = (image, preferredVariant = "web") =>
  resolveAccommodationImageKeyInternal(image, preferredVariant);
export const resolveAccommodationImageUrl = (image, preferredVariant = "web") =>
  resolveAccommodationImageUrlInternal(image, preferredVariant);
export const resolveAccommodationImageUrls = (images, preferredVariant = "web") =>
  resolveAccommodationImageUrlsInternal(images, preferredVariant);
export const resolvePrimaryAccommodationImageUrl = (images, preferredVariant = "thumb") =>
  resolvePrimaryAccommodationImageUrlInternal(images, preferredVariant);
