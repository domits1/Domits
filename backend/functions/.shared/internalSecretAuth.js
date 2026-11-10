import { createHash, timingSafeEqual } from "node:crypto";

// Hashing first gives both sides the same length, so timingSafeEqual cannot throw and the
// comparison does not reveal how long the secret is.
const sha256 = (value) => createHash("sha256").update(String(value)).digest();

export const isValidInternalSecret = (providedSecret, expectedSecret) => {
    if (!providedSecret || !expectedSecret) return false;
    return timingSafeEqual(sha256(providedSecret), sha256(expectedSecret));
};
