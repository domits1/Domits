const requireStr = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);

export const resolveAuthenticatedUserId = (event) => {
  const claims = event?.requestContext?.authorizer?.claims || event?.requestContext?.authorizer?.jwt?.claims || null;
  return requireStr(claims?.sub);
};

const parseJsonObject = (body) => {
  try {
    const parsed = typeof body === "string" && body ? JSON.parse(body) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const withAuthenticatedUserId = (event, userId) => {
  const body = parseJsonObject(event?.body);
  return {
    ...event,
    queryStringParameters: { ...(event?.queryStringParameters || {}), userId },
    ...(body ? { body: JSON.stringify({ ...body, userId }) } : {}),
  };
};
