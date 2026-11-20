import {
  PUBLIC_BOOKING_REQUEST_ERROR_CODES as CODES,
  PublicBookingRequestError,
} from "../util/exception/PublicBookingRequestError.js";

const MAX_PHONE_LENGTH = 32;
const MIN_PHONE_DIGITS = 6;
const MAX_PHONE_DIGITS = 15;
const MAX_MESSAGE_LENGTH = 2000;
const PHONE_PATTERN = /^\+?[0-9 ().-]+$/;
const LINE_BREAKS = /\r\n?|[\u2028\u2029]/g;
const INVISIBLE_CHARACTERS = /(?![\n\u200D])[\p{Cc}\p{Cf}]/gu;
const EXTRA_EMPTY_LINES = /\n{3,}/g;

const invalidPhone = () =>
  new PublicBookingRequestError(
    CODES.INVALID_GUEST_PHONE,
    "Please enter a phone number of 6 to 15 digits and at most 32 characters, with only digits, spaces, brackets, dots, dashes and a leading +."
  );

const invalidMessage = () =>
  new PublicBookingRequestError(CODES.INVALID_GUEST_MESSAGE, "Your message must be text of at most 2000 characters.");

const isAbsent = (value) => value === undefined || value === null;

const readPhone = (value) => {
  if (isAbsent(value)) return null;
  if (typeof value !== "string") throw invalidPhone();
  const phone = value.trim();
  if (!phone) return null;
  const digitCount = phone.replace(/\D/g, "").length;
  const isValid =
    phone.length <= MAX_PHONE_LENGTH &&
    PHONE_PATTERN.test(phone) &&
    digitCount >= MIN_PHONE_DIGITS &&
    digitCount <= MAX_PHONE_DIGITS;
  if (!isValid) throw invalidPhone();
  return phone;
};

const readMessage = (value) => {
  if (isAbsent(value)) return null;
  if (typeof value !== "string") throw invalidMessage();
  const message = value
    .replace(LINE_BREAKS, "\n")
    .replace(/\t/g, " ")
    .replace(INVISIBLE_CHARACTERS, "")
    .replace(EXTRA_EMPTY_LINES, "\n\n")
    .trim();
  if (message.length > MAX_MESSAGE_LENGTH) throw invalidMessage();
  return message || null;
};

export const readGuestNote = ({ phone, message }) => ({ phone: readPhone(phone), message: readMessage(message) });
