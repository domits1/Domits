import { TypeException } from "./exception/TypeException.js";

const MAX_CURSOR_LENGTH = 512;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

export const encodeReviewQueueCursor = ({ updatedAt, id }) =>
  Buffer.from(JSON.stringify({ u: updatedAt, i: id }), "utf8").toString("base64url");

const invalidCursor = () => new TypeException("Invalid cursor.");

const parseCursorPayload = (cursor) => {
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw invalidCursor();
  }
};

export const decodeReviewQueueCursor = (cursor) => {
  const isWellFormedString =
    typeof cursor === "string" && cursor.length <= MAX_CURSOR_LENGTH && BASE64URL_PATTERN.test(cursor);
  if (!isWellFormedString) {
    throw invalidCursor();
  }

  const payload = parseCursorPayload(cursor);
  const hasValidKey =
    payload !== null &&
    typeof payload === "object" &&
    Number.isSafeInteger(payload.u) &&
    payload.u >= 0 &&
    typeof payload.i === "string" &&
    payload.i.length > 0;
  if (!hasValidKey) {
    throw invalidCursor();
  }

  const key = { updatedAt: payload.u, id: payload.i };
  if (encodeReviewQueueCursor(key) !== cursor) {
    throw invalidCursor();
  }
  return key;
};
