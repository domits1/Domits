const parsePostgresArrayLiteral = (value) => {
  if (!value.startsWith("{") || !value.endsWith("}")) return null;

  try {
    const elements = JSON.parse(`[${value.slice(1, -1)}]`);
    const items = elements.map((element) => JSON.parse(element));
    return items.every((item) => item && typeof item === "object") ? items : null;
  } catch {
    return null;
  }
};

export const serializeAttachments = (attachments) => {
  if (attachments === null || attachments === undefined) return null;
  return Array.isArray(attachments) ? JSON.stringify(attachments) : attachments;
};

const parseJsonArray = (value) => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const parseStoredAttachments = (stored) => {
  if (Array.isArray(stored)) return stored;
  if (typeof stored !== "string") return null;

  return parseJsonArray(stored) ?? parsePostgresArrayLiteral(stored);
};
