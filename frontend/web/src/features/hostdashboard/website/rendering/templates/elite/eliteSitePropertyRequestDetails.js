import { BOOKING_GUEST_EMAIL_PATTERN } from "../../booking/bookingRequestContact";

const MAX_GUEST_NAME_LENGTH = 255;
const MAX_GUEST_PHONE_LENGTH = 32;
const MAX_GUEST_MESSAGE_LENGTH = 2000;

const MIN_PHONE_DIGITS = 6;
const MAX_PHONE_DIGITS = 15;
const PHONE_PATTERN = /^\+?[0-9 ().-]+$/;
const LINE_BREAKS = /\r\n?|[\u2028\u2029]/g;
const INVISIBLE_CHARACTERS = /(?![\n\u200D])[\p{Cc}\p{Cf}]/gu;
const EXTRA_EMPTY_LINES = /\n{3,}/g;

export const REQUEST_DETAIL_MESSAGES = Object.freeze({
  firstName: "Please enter your first name.",
  nameLength: `Your name can be at most ${MAX_GUEST_NAME_LENGTH} characters.`,
  email: "Please enter a valid email address.",
  phone:
    "Please enter a phone number of 6 to 15 digits, with only digits, spaces, brackets, dots, dashes and a leading +.",
  message: `Your message can be at most ${MAX_GUEST_MESSAGE_LENGTH} characters.`,
  houseRules: "Please accept the house rules to send your request.",
});

export const EMPTY_REQUEST_DETAILS = Object.freeze({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  message: "",
  acceptsHouseRules: false,
});

const cleanMessage = (value) =>
  value
    .replaceAll(LINE_BREAKS, "\n")
    .replaceAll("\t", " ")
    .replaceAll(INVISIBLE_CHARACTERS, "")
    .replaceAll(EXTRA_EMPTY_LINES, "\n\n")
    .trim();

const isValidPhone = (phone) => {
  const digitCount = phone.replaceAll(/\D/g, "").length;
  return (
    phone.length <= MAX_GUEST_PHONE_LENGTH &&
    PHONE_PATTERN.test(phone) &&
    digitCount >= MIN_PHONE_DIGITS &&
    digitCount <= MAX_PHONE_DIGITS
  );
};

export const validateRequestDetails = (details, { hasHouseRules }) => {
  const firstName = details.firstName.trim();
  const lastName = details.lastName.trim();
  const name = lastName ? `${firstName} ${lastName}` : firstName;
  const email = details.email.trim().toLowerCase();
  const phone = details.phone.trim();
  const message = cleanMessage(details.message);
  const errors = {};

  if (!firstName) {
    errors.firstName = REQUEST_DETAIL_MESSAGES.firstName;
  } else if (name.length > MAX_GUEST_NAME_LENGTH) {
    errors[lastName ? "lastName" : "firstName"] = REQUEST_DETAIL_MESSAGES.nameLength;
  }
  if (email.length > MAX_GUEST_NAME_LENGTH || !BOOKING_GUEST_EMAIL_PATTERN.test(email)) {
    errors.email = REQUEST_DETAIL_MESSAGES.email;
  }
  if (phone && !isValidPhone(phone)) {
    errors.phone = REQUEST_DETAIL_MESSAGES.phone;
  }
  if (message.length > MAX_GUEST_MESSAGE_LENGTH) {
    errors.message = REQUEST_DETAIL_MESSAGES.message;
  }
  if (hasHouseRules && !details.acceptsHouseRules) {
    errors.acceptsHouseRules = REQUEST_DETAIL_MESSAGES.houseRules;
  }

  return { guest: { name, email, ...(phone ? { phone } : {}) }, message, errors };
};
