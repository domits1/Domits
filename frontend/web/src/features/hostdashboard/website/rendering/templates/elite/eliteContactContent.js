import { normalizeServedSiteProperties } from "../../websiteSiteProperties";

export const MAX_CONTACT_MESSAGE_LENGTH = 5000;

const ONE_LINE_BREAKERS = /[\p{Cc}\p{Zl}\p{Zp}]+/gu;
const MESSAGE_LINE_BREAKS = /\r\n?|[\u2028\u2029]/g;
const MESSAGE_CONTROL_CHARACTERS = /[^\P{Cc}\n\t]/gu;

const REQUIRED_TEXTS = Object.freeze({
  name: "Please enter your name.",
  email: "Please enter your email address.",
  message: "Please enter a message.",
});

const INVALID_EMAIL_TEXT = "Please enter a valid email address.";
const MESSAGE_TOO_LONG_TEXT = `Your message can be at most ${MAX_CONTACT_MESSAGE_LENGTH} characters.`;

const toOneLine = (value) =>
  String(value ?? "")
    .replaceAll(ONE_LINE_BREAKERS, " ")
    .trim();

export const cleanContactValues = (values) => ({
  name: toOneLine(values.name),
  email: toOneLine(values.email),
  phone: toOneLine(values.phone),
  message: String(values.message ?? "")
    .replaceAll(MESSAGE_LINE_BREAKS, "\n")
    .replaceAll(MESSAGE_CONTROL_CHARACTERS, "")
    .trim(),
});

export const findContactFieldErrors = (cleanValues) => {
  const errors = {};
  Object.entries(REQUIRED_TEXTS).forEach(([field, text]) => {
    if (!cleanValues[field]) errors[field] = text;
  });
  if (cleanValues.email && !cleanValues.email.includes("@")) errors.email = INVALID_EMAIL_TEXT;
  if (Array.from(cleanValues.message).length > MAX_CONTACT_MESSAGE_LENGTH) errors.message = MESSAGE_TOO_LONG_TEXT;
  return errors;
};

export const buildEliteContactContext = (renderPayload) => {
  const siteId = String(renderPayload?.site?.id || "").trim();
  if (renderPayload?.acceptsContactMessages !== true || !siteId) {
    return null;
  }

  const mainTitle = renderPayload.propertySnapshot?.property?.title;
  const properties = normalizeServedSiteProperties(renderPayload.siteProperties).map((entry) => ({
    propertyId: entry.propertyId,
    title: toOneLine(entry.isMainProperty ? mainTitle : entry.propertySnapshot.property.title) || entry.slug,
  }));
  return { siteId, properties };
};
