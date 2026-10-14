import { unauthorized } from "../util/httpErrors.js";

const extractClaims = (event) =>
  event?.requestContext?.authorizer?.claims ||
  event?.requestContext?.authorizer?.jwt?.claims ||
  null;

export const getAuthenticatedUser = (event) => {
  const claims = extractClaims(event);
  const userId = claims?.sub || null;

  if (!userId) {
    throw unauthorized("Unable to establish an authenticated user.");
  }

  return {
    userId: String(userId),
    claims,
  };
};
