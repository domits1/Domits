import { createHmac } from "node:crypto";

function sha256(data, key) {
  return createHmac("sha256", key).update(data).digest("hex");
}

export function verifyPriceLabsSignature(headers, rawBody, integrationToken) {
  const h = (name) =>
    headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || "";

  const source       = h("X-SOURCE");
  const timestamp    = h("X-PL-TIMESTAMP");
  const requestId    = h("X-PL-REQUESTID");
  const signedHdrs   = h("X-PL-SIGNED-HEADERS");
  const signedBody   = h("X-PL-SIGNED-BODY");

  if (!signedHdrs || !signedBody) return false;

  const headerComponents = `v1:${source}:${timestamp}:${requestId}`;
  const expectedSignedHdrs = "v1." + sha256(headerComponents, integrationToken);

  if (signedHdrs !== expectedSignedHdrs) return false;

  const bodyComponents     = expectedSignedHdrs + (rawBody || "");
  const expectedSignedBody = sha256(bodyComponents, integrationToken);

  return signedBody === expectedSignedBody;
}
