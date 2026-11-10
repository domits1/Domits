import { getIdToken } from "../../../../services/getAccessToken";

const API_BASE =
  "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/integrations/home-automation/remotelocks";
const AUTHORIZE_ORIGIN = "https://connect.remotelock.com";

export class RemoteLockRequestError extends Error {
  constructor({ status = null, code = null, retryable = false, retryAfterSeconds = null } = {}) {
    // Built from the code alone: a response body or URL can hold a one-time code or a state value.
    super(`RemoteLock request failed (${code ?? status ?? "network"}).`);
    this.name = "RemoteLockRequestError";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const readJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const requestRemoteLock = async (path, { method = "GET", body } = {}) => {
  let response;
  try {
    const headers = { Authorization: `Bearer ${await getIdToken()}` };
    response = await fetch(
      `${API_BASE}${path}`,
      body === undefined
        ? { method, headers }
        : { method, headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
  } catch {
    throw new RemoteLockRequestError({ retryable: true });
  }

  const data = await readJson(response);
  if (!response.ok) {
    throw new RemoteLockRequestError({
      status: response.status,
      code: typeof data?.error === "string" ? data.error : null,
      retryable: data?.retryable === true,
      retryAfterSeconds: Number.isFinite(data?.retryAfterSeconds) ? data.retryAfterSeconds : null,
    });
  }
  return data;
};

const toStatus = (data) => ({ status: data?.status ?? null, lastSyncAt: data?.lastSyncAt ?? null });

// Only RemoteLock's own sign-in page may be navigated to; origin also covers the scheme and the port.
const isAuthorizeUrl = (value) => {
  try {
    return new URL(value).origin === AUTHORIZE_ORIGIN;
  } catch {
    return false;
  }
};

// GET /status. lastSyncAt is epoch milliseconds, or null when nothing has synced.
export const getRemoteLockStatus = async () => toStatus(await requestRemoteLock("/status"));

// POST /connect. Resolves with the RemoteLock sign-in URL to send the host to; the connection is finished by
// completeRemoteLockConnect when RemoteLock sends the host back.
export const connectRemoteLock = async () => {
  const data = await requestRemoteLock("/connect", { method: "POST" });
  if (!isAuthorizeUrl(data?.authorizeUrl)) throw new RemoteLockRequestError({ code: "INVALID_AUTHORIZE_URL" });
  return { status: data.status ?? null, authorizeUrl: data.authorizeUrl };
};

// POST /connect/complete with the one-time code and state from RemoteLock's redirect.
export const completeRemoteLockConnect = async ({ code, state }) =>
  toStatus(await requestRemoteLock("/connect/complete", { method: "POST", body: { code, state } }));

// POST /disconnect. Resolves with the new status, in the shape of getRemoteLockStatus.
export const disconnectRemoteLock = async () => toStatus(await requestRemoteLock("/disconnect", { method: "POST" }));

// GET /devices. Only meaningful while the account is CONNECTED. truncated means the list was cut short.
export const getRemoteLockDevices = async () => {
  const data = await requestRemoteLock("/devices");
  return { devices: Array.isArray(data?.devices) ? data.devices : [], truncated: data?.truncated === true };
};
