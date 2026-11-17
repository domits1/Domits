import { WebsiteContactError, WEBSITE_CONTACT_ERROR_CODES } from "../../util/exception/WebsiteContactError.js";

export const CONTACT_FIELD_LIMITS = Object.freeze({ id: 100, name: 100, email: 254, phone: 30, message: 5000 });
export const MIN_PHONE_DIGITS = 6;

const ONE_LINE_BREAKERS = /[\p{Cc}\p{Zl}\p{Zp}]/u;
const MESSAGE_LINE_BREAKS = /\r\n?|[\u2028\u2029]/g;
const MESSAGE_CONTROL_CHARACTERS = /[^\P{Cc}\n\t]/u;
const EMAIL_PATTERN =
  /^(?=[^@]{1,64}@)[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const PHONE_PATTERN = /^\+?[0-9 ()./-]+$/;
const PHONE_RULE = `Please enter a valid phone number: at least ${MIN_PHONE_DIGITS} digits, only spaces and + ( ) - . / between them, at most ${CONTACT_FIELD_LIMITS.phone} characters.`;

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isLongerThan = (value, limit) =>
  value.length > limit && (value.length > 2 * limit || Array.from(value).length > limit);
const invalid = (field, message) =>
  new WebsiteContactError(WEBSITE_CONTACT_ERROR_CODES.INVALID_REQUEST, message, field);

const readText = (body, field) => {
  const value = body[field];
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw invalid(field, `${field} must be text.`);
  return value.trim();
};

const readId = (body, field, { required }) => {
  const id = readText(body, field);
  if (!id) {
    if (required) throw invalid(field, `${field} is required.`);
    return null;
  }
  if (isLongerThan(id, CONTACT_FIELD_LIMITS.id) || ONE_LINE_BREAKERS.test(id)) {
    throw invalid(field, `${field} must be one line of at most ${CONTACT_FIELD_LIMITS.id} characters.`);
  }
  return id;
};

const readName = (body) => {
  const name = readText(body, "name");
  if (!name) throw invalid("name", "Please enter your name.");
  if (isLongerThan(name, CONTACT_FIELD_LIMITS.name)) {
    throw invalid("name", `Your name can be at most ${CONTACT_FIELD_LIMITS.name} characters.`);
  }
  if (ONE_LINE_BREAKERS.test(name)) throw invalid("name", "Your name must be one line of text.");
  return name;
};

const readEmail = (body) => {
  const email = readText(body, "email");
  if (!email) throw invalid("email", "Please enter your email address.");
  if (isLongerThan(email, CONTACT_FIELD_LIMITS.email) || !EMAIL_PATTERN.test(email)) {
    throw invalid("email", "Please enter a valid email address.");
  }
  return email;
};

const readPhone = (body) => {
  const phone = readText(body, "phone");
  if (!phone) return null;
  const isPhoneShaped = !isLongerThan(phone, CONTACT_FIELD_LIMITS.phone) && PHONE_PATTERN.test(phone);
  if (!isPhoneShaped || phone.replaceAll(/\D/g, "").length < MIN_PHONE_DIGITS) throw invalid("phone", PHONE_RULE);
  return phone;
};

const readMessage = (body) => {
  const message = readText(body, "message").replaceAll(MESSAGE_LINE_BREAKS, "\n");
  if (!message) throw invalid("message", "Please enter a message.");
  if (isLongerThan(message, CONTACT_FIELD_LIMITS.message)) {
    throw invalid("message", `Your message can be at most ${CONTACT_FIELD_LIMITS.message} characters.`);
  }
  if (MESSAGE_CONTROL_CHARACTERS.test(message)) {
    throw invalid("message", "Your message holds characters that cannot be sent. Remove them and try again.");
  }
  return message;
};

export const parseContactMessage = (body) => {
  if (!isPlainObject(body)) throw invalid("body", "A JSON object request body is required.");
  return {
    siteId: readId(body, "siteId", { required: true }),
    propertyId: readId(body, "propertyId", { required: false }),
    name: readName(body),
    email: readEmail(body),
    phone: readPhone(body),
    message: readMessage(body),
  };
};
