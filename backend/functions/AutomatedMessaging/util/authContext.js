import { forbidden, unauthorized } from "./httpErrors.js";

const extractClaims = (event) =>
  event?.requestContext?.authorizer?.claims || event?.requestContext?.authorizer?.jwt?.claims || null;

const normalizeGroups = (claims = {}) => {
  const values = [claims["custom:group"], claims["custom:role"], claims.role, claims["cognito:groups"]];
  return values
    .flatMap((value) => {
      if (Array.isArray(value)) return value;
      if (typeof value !== "string") return [];
      return value.replace(/^\[|\]$/g, "").split(",");
    })
    .map((value) => String(value).trim().replace(/^"|"$/g, "").toLowerCase())
    .filter(Boolean);
};

export const getAuthenticatedHost = (event) => {
  const claims = extractClaims(event);
  const userId = claims?.sub;
  if (!userId) throw unauthorized("Unable to establish an authenticated user.");

  const groups = normalizeGroups(claims);
  if (!groups.includes("host")) throw forbidden("Host access is required.");

  return { userId: String(userId), claims, groups };
};
