import { unauthorized } from "../util/httpErrors.js";

const extractClaims = (event) =>
  event?.requestContext?.authorizer?.claims ||
  event?.requestContext?.authorizer?.jwt?.claims ||
  null;

const parseGroups = (claims = {}) => {
  const directGroup =
    claims["custom:group"] ||
    claims["custom:role"] ||
    claims["custom:userType"] ||
    claims.group ||
    claims.role ||
    claims.userType ||
    null;
  const cognitoGroups = claims["cognito:groups"];

  if (Array.isArray(cognitoGroups)) {
    return [directGroup, ...cognitoGroups].filter(Boolean).map((value) => String(value).toLowerCase());
  }

  if (typeof cognitoGroups === "string") {
    const parsedGroups = cognitoGroups
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map((value) => value.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);
    return [directGroup, ...parsedGroups].filter(Boolean).map((value) => String(value).toLowerCase());
  }

  return [directGroup].filter(Boolean).map((value) => String(value).toLowerCase());
};

export const getAuthenticatedUser = (event) => {
  const claims = extractClaims(event);
  const userId = claims?.sub || null;

  if (!userId) {
    throw unauthorized("Unable to establish an authenticated user.");
  }

  const groups = parseGroups(claims);

  return {
    userId: String(userId),
    claims,
    groups,
    isHost: groups.includes("host"),
    isGuest: groups.includes("guest"),
  };
};
