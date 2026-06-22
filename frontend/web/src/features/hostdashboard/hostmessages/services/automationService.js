import { Auth } from "aws-amplify";

const API_BASE = String(process.env.REACT_APP_AUTOMATED_MESSAGING_API_URL || "").replace(/\/$/, "");

export class AutomationApiError extends Error {
  constructor(message, { status = 500, code = "REQUEST_FAILED", details = null } = {}) {
    super(message);
    this.name = "AutomationApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const requireToken = (token) => {
  const normalized = String(token || "").trim();
  if (!normalized) throw new AutomationApiError("Authentication token is required.", { status: 401, code: "UNAUTHORIZED" });
  return normalized;
};

const getIdToken = async () => {
  const session = await Auth.currentSession();
  return requireToken(session.getIdToken().getJwtToken());
};

const request = async (path, { method = "GET", body } = {}) => {
  const idToken = await getIdToken();
  const response = await fetch(`${API_BASE}/automations${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AutomationApiError(payload?.message || `Automation request failed with status ${response.status}.`, {
      status: response.status,
      code: payload?.error || "REQUEST_FAILED",
      details: payload?.details || null,
    });
  }
  return payload;
};

export const listAutomations = () => request("");
export const createAutomation = (automation) => request("", { method: "POST", body: automation });
export const updateAutomation = (id, automation) =>
  request(`/${encodeURIComponent(id)}`, { method: "PATCH", body: automation });
export const activateAutomation = (id) =>
  request(`/${encodeURIComponent(id)}/activate`, { method: "POST" });
export const pauseAutomation = (id) =>
  request(`/${encodeURIComponent(id)}/pause`, { method: "POST" });
export const previewAutomation = (automation, id = null) =>
  request(id ? `/${encodeURIComponent(id)}/preview` : "/preview", { method: "POST", body: automation });
export const listAutomationDeliveries = (id) =>
  request(`/${encodeURIComponent(id)}/deliveries`);
