export const BOOKING_GUEST_EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

const MAX_CONTACT_FIELD_LENGTH = 255;

export const BOOKING_GUEST_CONTACT_MESSAGES = Object.freeze({
  name: "Please enter your name.",
  email: "Please enter a valid email address.",
});

export const EMPTY_BOOKING_GUEST = Object.freeze({ name: "", email: "" });

export const validateBookingGuestContact = (guest) => {
  const name = String(guest?.name || "").trim();
  const email = String(guest?.email || "")
    .trim()
    .toLowerCase();
  const errors = {};

  if (!name || name.length > MAX_CONTACT_FIELD_LENGTH) {
    errors.name = BOOKING_GUEST_CONTACT_MESSAGES.name;
  }
  if (!email || email.length > MAX_CONTACT_FIELD_LENGTH || !BOOKING_GUEST_EMAIL_PATTERN.test(email)) {
    errors.email = BOOKING_GUEST_CONTACT_MESSAGES.email;
  }

  return { guest: { name, email }, errors };
};
