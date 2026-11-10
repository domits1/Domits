import { REVIEW_API_ERROR_CODE } from "../services/propertyReviewApi";

export const EMPTY_VALUE = "—";

const hasText = (value) => typeof value === "string" && value.trim() !== "";

const joinText = (parts, separator) => {
  const present = parts.filter(hasText).map((part) => part.trim());
  return present.length > 0 ? present.join(separator) : EMPTY_VALUE;
};

export const formatReviewPrice = (pricing) => {
  const roomRate = pricing?.roomRate;
  const hasRate = typeof roomRate === "number" && Number.isFinite(roomRate);
  return hasRate ? `EUR ${roomRate.toLocaleString("en-US")} / night` : EMPTY_VALUE;
};

export const formatReviewLocation = (location) => joinText([location?.city, location?.country], ", ");

export const formatReviewType = (type) => joinText([type?.property_type, type?.spaceType], " · ");

export const formatReviewUpdated = (updatedAt) => {
  const date = new Date(updatedAt);
  const isValid = typeof updatedAt === "number" && !Number.isNaN(date.getTime());
  return isValid ? date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : EMPTY_VALUE;
};

export const describeQueueError = (error) => {
  if (error?.code === REVIEW_API_ERROR_CODE.UNAUTHENTICATED) {
    return { message: "Your session has expired. Please sign in again.", canRetry: false };
  }
  if (error?.code === REVIEW_API_ERROR_CODE.FORBIDDEN) {
    return { message: "Not authorized", canRetry: false };
  }
  return { message: "Could not load the queue.", canRetry: true };
};
