import { REVIEW_API_ERROR_CODE } from "../services/propertyReviewApi";
import { EMPTY_VALUE } from "../queue/reviewQueueFormat";

const TERMINAL_MESSAGES = Object.freeze({
  [REVIEW_API_ERROR_CODE.UNAUTHENTICATED]: "Your session has expired. Please sign in again.",
  [REVIEW_API_ERROR_CODE.FORBIDDEN]: "Not authorized",
  [REVIEW_API_ERROR_CODE.NOT_FOUND]: "This listing no longer exists.",
});

const toText = (value) => (value === null || value === undefined ? "" : String(value).trim());

const compact = (parts, separator) => parts.map(toText).filter(Boolean).join(separator);

export const textOrEmpty = (value) => toText(value) || EMPTY_VALUE;

export const formatReviewAddress = (location) => {
  const houseNumber = compact([location?.houseNumber, location?.houseNumberExtension], "");
  const streetLine = compact([location?.street, houseNumber], " ");
  const cityLine = compact([location?.postalCode, location?.city], " ");
  return compact([streetLine, cityLine, location?.country], ", ") || EMPTY_VALUE;
};

export const formatReviewCleaning = (pricing) => {
  const cleaning = pricing?.cleaning;
  const hasFee = typeof cleaning === "number" && Number.isFinite(cleaning);
  return hasFee ? `EUR ${cleaning.toLocaleString("en-US")}` : EMPTY_VALUE;
};

export const describeDetailError = (error) => {
  const terminalMessage = TERMINAL_MESSAGES[error?.code];
  if (terminalMessage) return { message: terminalMessage, canRetry: false };
  return { message: "Could not load this listing.", canRetry: true };
};
