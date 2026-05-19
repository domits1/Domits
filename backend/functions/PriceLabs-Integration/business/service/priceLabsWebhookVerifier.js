/**
 * priceLabsWebhookVerifier.js
 * Verifies inbound webhook requests from PriceLabs using HMAC-SHA256 signatures.
 *
 * PriceLabs signs every outbound request with two headers:
 *   X-PL-SIGNED-HEADERS  = "v1." + HMAC-SHA256(header_components, token)
 *   X-PL-SIGNED-BODY     = HMAC-SHA256(signed_headers + raw_body, token)
 *
 * Where header_components = "v1:{X-SOURCE}:{X-PL-TIMESTAMP}:{X-PL-REQUESTID}"
 */

import { createHmac } from "node:crypto";

function sha256(data, key) {
  return createHmac("sha256", key).update(data).digest("hex");
}

/**
 * Returns true if the request is genuinely from PriceLabs.
 * @param {object} headers - Raw request headers (case-insensitive lookup done internally)
 * @param {string} rawBody - The raw JSON string body
 * @param {string} integrationToken - Our current X-INTEGRATION-TOKEN
 */
export function verifyPriceLabsSignature(headers, rawBody, integrationToken) {
  const h = (name) =>
    headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || "";

  const source       = h("X-SOURCE");
  const timestamp    = h("X-PL-TIMESTAMP");
  const requestId    = h("X-PL-REQUESTID");
  const signedHdrs   = h("X-PL-SIGNED-HEADERS");
  const signedBody   = h("X-PL-SIGNED-BODY");

  if (!signedHdrs || !signedBody) return false;

  // Reconstruct signed headers
  const headerComponents = `v1:${source}:${timestamp}:${requestId}`;
  const expectedSignedHdrs = "v1." + sha256(headerComponents, integrationToken);

  if (signedHdrs !== expectedSignedHdrs) return false;

  // Reconstruct signed body
  const bodyComponents    = expectedSignedHdrs + (rawBody || "");
  const expectedSignedBody = sha256(bodyComponents, integrationToken);

  return signedBody === expectedSignedBody;
}
