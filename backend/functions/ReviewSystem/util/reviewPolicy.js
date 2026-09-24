// Review: Reads bounded review workflow settings from environment variables with safe defaults.
const positiveInteger = (value, fallback, max) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 && number <= max ? number : fallback;
};

export const REVIEW_WINDOW_DAYS = positiveInteger(process.env.REVIEW_WINDOW_DAYS, 30, 365);
export const REVIEW_REQUEST_DELAY_HOURS = positiveInteger(process.env.REVIEW_REQUEST_DELAY_HOURS, 24, 24 * 30);
export const REVIEW_REMINDER_DAYS = positiveInteger(process.env.REVIEW_REMINDER_DAYS, 7, 30);
export const REVIEW_MAX_EMAILS = positiveInteger(process.env.REVIEW_MAX_EMAILS, 2, 10);
