export const safeJson = (value) => {
  try {
    if (!value) return null;
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }
};

const integrationIdPattern = /\/integrations\/([^/]+)/;

export const extractIntegrationId = (path) => {
  const match = integrationIdPattern.exec(String(path || ""));
  return match?.[1] || null;
};

export const extractLastPathSegment = (path) => {
  const parts = String(path || "")
    .split("/")
    .filter(Boolean);

  return parts.length ? parts[parts.length - 1] : null;
};
