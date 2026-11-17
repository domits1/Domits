import { PROPERTY_API_BASE } from "../../hostproperty/constants";

export const PUBLIC_WEBSITE_CONTACT_URL = `${PROPERTY_API_BASE}/website/public/contact`;

const NOT_SENT_TEXT = "Your message could not be sent. Please try again later.";
const RATE_LIMITED_TEXT = "Too many messages were sent. Your message was not sent. Please try again later.";

export const CONTACT_TEXTS = Object.freeze({
  sent: "Your message was sent. The host replies by email.",
  unconfirmed: "We could not confirm that your message was sent. Wait a few minutes before you send it again.",
  propertyGone: "This property is no longer on this website. Choose another one or a general question.",
  checkFields: "Your message was not sent. Check the marked fields.",
});

const FIELD_TEXTS = new Map([
  ["name", "Please enter your name."],
  ["email", "Please enter a valid email address."],
  ["phone", "Please enter a valid phone number."],
  ["message", "Please enter a message."],
]);

const NOT_SENT_TEXTS = new Map([
  ["site_not_found", "This website cannot receive messages. Your message was not sent."],
  ["rate_limited", RATE_LIMITED_TEXT],
  ["contact_unavailable", "Messages cannot be sent from this website yet. Your message was not sent."],
  ["message_not_sent", NOT_SENT_TEXT],
]);

const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const resolveContactAnswer = (status, body) => {
  if (status === 200) {
    return body?.status === "SENT" ? { isSent: true, text: CONTACT_TEXTS.sent } : { text: CONTACT_TEXTS.unconfirmed };
  }

  const { code = "", field, message } = body?.error || {};
  if (code === "property_not_found" || (code === "invalid_request" && field === "propertyId")) {
    return { field: "propertyId", text: CONTACT_TEXTS.propertyGone };
  }
  if (code === "invalid_request" && FIELD_TEXTS.has(field)) {
    return { field, text: typeof message === "string" && message.trim() ? message.trim() : FIELD_TEXTS.get(field) };
  }
  if (NOT_SENT_TEXTS.has(code)) {
    return { text: NOT_SENT_TEXTS.get(code) };
  }

  const isRefusedRequest = status >= 400 && status < 500 && code !== "message_not_confirmed";
  if (!isRefusedRequest) {
    return { text: CONTACT_TEXTS.unconfirmed };
  }
  return { text: status === 429 ? RATE_LIMITED_TEXT : NOT_SENT_TEXT };
};

export const sendWebsiteContactMessage = async ({ siteId, propertyId, name, email, phone, message }, signal) => {
  const body = { siteId, ...(propertyId ? { propertyId } : {}), name, email, ...(phone ? { phone } : {}), message };
  let response;
  try {
    response = await fetch(PUBLIC_WEBSITE_CONTACT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal,
      body: JSON.stringify(body),
    });
  } catch {
    return { text: CONTACT_TEXTS.unconfirmed };
  }

  const text = await response.text().catch(() => "");
  return resolveContactAnswer(response.status, parseJson(text));
};
