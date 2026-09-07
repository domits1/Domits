import { randomBytes } from "node:crypto";

export const PUBLIC_BOOKING_REF_PREFIX = "DBW-";
export const PUBLIC_BOOKING_REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const PUBLIC_BOOKING_REF_LENGTH = 10;
const PUBLIC_BOOKING_REF_PATTERN = new RegExp(
  `^${PUBLIC_BOOKING_REF_PREFIX}[${PUBLIC_BOOKING_REF_ALPHABET}]{${PUBLIC_BOOKING_REF_LENGTH}}$`
);

export const generatePublicBookingRef = (randomBytesFn = randomBytes) => {
  const bytes = randomBytesFn(PUBLIC_BOOKING_REF_LENGTH);
  let body = "";
  for (let index = 0; index < PUBLIC_BOOKING_REF_LENGTH; index += 1) {
    body += PUBLIC_BOOKING_REF_ALPHABET[bytes[index] % PUBLIC_BOOKING_REF_ALPHABET.length];
  }
  return `${PUBLIC_BOOKING_REF_PREFIX}${body}`;
};

export const isPublicBookingRef = (value) => typeof value === "string" && PUBLIC_BOOKING_REF_PATTERN.test(value);
