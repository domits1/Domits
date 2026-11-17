import { createHash, timingSafeEqual } from "node:crypto";

// Hashing first gives both sides the same length, so timingSafeEqual cannot throw and the time the
// comparison takes reveals neither the token nor its length (same pattern as webhookSecretVerifier.js).
const sha256 = (value) => createHash("sha256").update(String(value)).digest();

// The internal Lambda-to-Lambda token. A missing configured token never lets a call through.
export const isInternalTokenValid = (expectedToken, providedToken) => {
  if (!expectedToken || !providedToken) return false;
  return timingSafeEqual(sha256(providedToken), sha256(expectedToken));
};
