import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_PREFIX = "qtok_";

const assertUsableSecret = (secret) => {
  if (typeof secret !== "string" || secret.length === 0) {
    throw new TypeError("A non-empty quote token secret is required.");
  }
};

const computeSignature = (encodedPayload, secret) =>
  createHmac("sha256", secret).update(encodedPayload).digest();

const decodePayload = (encodedPayload) => {
  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const signWebsiteQuoteToken = (payload, secret) => {
  assertUsableSecret(secret);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError("A quote token payload must be a plain object.");
  }

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${TOKEN_PREFIX}${encodedPayload}.${computeSignature(encodedPayload, secret).toString("base64url")}`;
};

export const verifyWebsiteQuoteToken = (token, secret, { now = Date.now() } = {}) => {
  assertUsableSecret(secret);
  if (typeof token !== "string" || !token.startsWith(TOKEN_PREFIX)) {
    return null;
  }

  const parts = token.slice(TOKEN_PREFIX.length).split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  const [encodedPayload, encodedSignature] = parts;
  const expectedSignature = computeSignature(encodedPayload, secret);
  const providedSignature = Buffer.from(encodedSignature, "base64url");
  if (
    providedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(providedSignature, expectedSignature)
  ) {
    return null;
  }

  const payload = decodePayload(encodedPayload);
  if (!payload) {
    return null;
  }

  // A token that never expires must not verify: expiry is part of the contract.
  // expiresAt must be an ISO-8601 string; any other representation fails closed.
  const expiresAtMs = typeof payload.expiresAt === "string" ? Date.parse(payload.expiresAt) : NaN;
  if (!Number.isFinite(expiresAtMs) || now >= expiresAtMs) {
    return null;
  }

  return payload;
};
