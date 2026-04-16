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
