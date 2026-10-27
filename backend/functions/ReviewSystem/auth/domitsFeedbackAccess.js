// Cognito group membership must be administered exclusively by Domits staff.
export const canReadDomitsFeedbackAsStaff = (event) => {
  const requiredGroup = process.env.DOMITS_FEEDBACK_STAFF_GROUP?.trim();
  const claims = event?.requestContext?.authorizer?.claims;
  if (!requiredGroup || typeof claims?.sub !== "string" || !claims.sub.trim()) return false;
  let groups = claims["cognito:groups"];
  if (typeof groups === "string") {
    try {
      groups = groups.trim().startsWith("[") ? JSON.parse(groups) : groups.split(",").map(group => group.trim());
    } catch {
      return false;
    }
  }
  return Array.isArray(groups) && groups.includes(requiredGroup);
};
