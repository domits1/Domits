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

const request = async (path, { method = "GET", token, body } = {}) => {
  const response = await fetch(`${API_BASE}/automations${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${requireToken(token)}`,
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

export const listAutomations = (token) => request("", { token });
export const createAutomation = (token, automation) => request("", { method: "POST", token, body: automation });
export const updateAutomation = (token, id, automation) =>
  request(`/${encodeURIComponent(id)}`, { method: "PATCH", token, body: automation });
export const activateAutomation = (token, id) =>
  request(`/${encodeURIComponent(id)}/activate`, { method: "POST", token });
export const pauseAutomation = (token, id) =>
  request(`/${encodeURIComponent(id)}/pause`, { method: "POST", token });
export const previewAutomation = (token, automation, id = null) =>
  request(id ? `/${encodeURIComponent(id)}/preview` : "/preview", { method: "POST", token, body: automation });
export const listAutomationDeliveries = (token, id) =>
  request(`/${encodeURIComponent(id)}/deliveries`, { token });
