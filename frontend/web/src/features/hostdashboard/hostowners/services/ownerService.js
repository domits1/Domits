import { getAccessToken } from "../../../../services/getAccessToken";
import { getOwnerApiUrl } from "./ownerApiConfig";

const SIGNED_OUT_MESSAGE = "We could not read your sign-in. Please sign in again.";
const INVALID_RESPONSE_MESSAGE = "The property owners service returned an unreadable response.";

export class OwnerApiError extends Error {
  constructor(message, { status, serverMessage }) {
    super(message);
    this.name = "OwnerApiError";
    this.status = status;
    this.serverMessage = serverMessage;
  }
}

const buildUrl = (query) => {
  const pairs = Object.entries(query).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  const baseUrl = getOwnerApiUrl();
  return pairs.length === 0 ? baseUrl : `${baseUrl}?${pairs.join("&")}`;
};

const requireOwnerId = (id) => {
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error("An owner id is required.");
  }
  return id.trim();
};

const readPayload = async (response) => {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
};

const readServerMessage = (payload) =>
  payload !== null && typeof payload === "object" && typeof payload.message === "string" ? payload.message : null;

const request = async ({ method, query = {}, body }) => {
  const url = buildUrl(query);
  const token = getAccessToken();
  if (!token) {
    throw new Error(SIGNED_OUT_MESSAGE);
  }
  const hasBody = body !== undefined;
  const headers = hasBody ? { Authorization: token, "Content-Type": "application/json" } : { Authorization: token };
  const response = await fetch(url, { method, headers, ...(hasBody ? { body: JSON.stringify(body) } : {}) });
  const payload = await readPayload(response);

  if (!response.ok) {
    const serverMessage = readServerMessage(payload);
    const message = serverMessage ?? `The property owners request failed with status ${response.status}.`;
    throw new OwnerApiError(message, { status: response.status, serverMessage });
  }
  if (payload === undefined) {
    throw new OwnerApiError(INVALID_RESPONSE_MESSAGE, { status: response.status, serverMessage: null });
  }
  return payload;
};

export const listOwners = () => request({ method: "GET" });

export const getOwner = async (id) => request({ method: "GET", query: { id: requireOwnerId(id) } });

export const createOwner = (body) => request({ method: "POST", body });

export const updateOwner = async (id, changes) =>
  request({ method: "PATCH", query: { id: requireOwnerId(id) }, body: changes });

export const archiveOwner = async (id) =>
  request({ method: "PATCH", query: { action: "archive", id: requireOwnerId(id) } });

export const setShares = async ({ property_id, effective_from, shares }) =>
  request({ method: "PUT", query: { action: "set-shares" }, body: { property_id, effective_from, shares } });
