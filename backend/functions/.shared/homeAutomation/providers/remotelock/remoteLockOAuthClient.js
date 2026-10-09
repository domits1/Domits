import {
  allowedOAuthError,
  REMOTELOCK_OAUTH_ERROR_CODE as CODE,
  RemoteLockOAuthError,
} from "./remoteLockOAuthError.js";

export const REMOTELOCK_OAUTH_BASE_URL = "https://connect.remotelock.com";
const FORM_HEADERS = { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" };

const requireText = (value, label) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

// https only. Plain http is allowed for a machine's own address, where nothing leaves the host. The redirect
// URI must match the registered one exactly, so the value is checked but never normalised.
const requireSecureUrl = (value, label) => {
  const text = requireText(value, label);
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new Error(`${label} must be an absolute URL.`);
  }
  const isSecure = url.protocol === "https:" || (url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname));
  if (!isSecure) throw new Error(`${label} must use https (http is allowed only for localhost or 127.0.0.1).`);
  return text;
};

const nonEmptyString = (value) => (typeof value === "string" && value.length > 0 ? value : null);
const parseJson = (rawText) => {
  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
};

// Contract: every POST sends client_id and client_secret in the form body, never in a URL. A failed call throws
// a RemoteLockOAuthError, never the response body; only an allowlisted "error" name survives, as oauthError.
// AUTH (400/401/403) is not retryable, RATE_LIMIT (429) and 5xx are; TIMEOUT and NETWORK are retryable too: a
// request that never reached RemoteLock can be retried, and if it did and the token rotated, the old token is
// already dead, so a retry does not make it worse. The token provider decides the real policy.
// INVALID_RESPONSE with status 200 on exchangeCode or refresh means RemoteLock answered successfully, so the old
// refresh token may already be dead. Only oauthError "invalid_grant" means the host must reconnect: the other
// AUTH errors (invalid_client, invalid_request, ...) point to a wrong Domits app secret or a bug, and would hit
// every host at once. A redirect (3xx) is never followed; it is an HTTP error and not retryable.
export class RemoteLockOAuthClient {
  #clientSecret;

  constructor({
    clientId,
    clientSecret,
    redirectUri,
    baseUrl = REMOTELOCK_OAUTH_BASE_URL,
    fetchImpl = fetch,
    timeoutMs = 10000,
    now = Date.now,
  } = {}) {
    this.clientId = requireText(clientId, "clientId");
    this.#clientSecret = requireText(clientSecret, "clientSecret");
    this.redirectUri = requireSecureUrl(redirectUri, "redirectUri");
    this.baseUrl = requireSecureUrl(baseUrl, "baseUrl");
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.now = now;
  }

  buildAuthorizeUrl(state) {
    const url = new URL("/oauth/authorize", this.baseUrl);
    url.search = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      state: requireText(state, "state"),
    }).toString();
    return url.toString();
  }

  async exchangeCode(code) {
    return this.requestTokens("exchangeCode", {
      grant_type: "authorization_code",
      code: requireText(code, "code"),
      redirect_uri: this.redirectUri,
    });
  }

  async refresh(refreshToken) {
    return this.requestTokens("refresh", {
      grant_type: "refresh_token",
      refresh_token: requireText(refreshToken, "refreshToken"),
    });
  }

  // Resolves with nothing. The body of a successful revoke is never read.
  async revoke(token) {
    await this.post("revoke", "/oauth/revoke", { token: requireText(token, "token") }, { readsBody: false });
  }

  async requestTokens(operation, params) {
    const { body, receivedAt, status } = await this.post(operation, "/oauth/token", params);
    const accessToken = nonEmptyString(body?.access_token);
    const refreshToken = nonEmptyString(body?.refresh_token);
    const expiresIn =
      typeof body?.expires_in === "number" || typeof body?.expires_in === "string" ? Number(body.expires_in) : NaN;
    if (!accessToken || !refreshToken || !Number.isFinite(expiresIn) || expiresIn <= 0) {
      throw new RemoteLockOAuthError({ operation, code: CODE.INVALID_RESPONSE, status, retryable: false });
    }
    return {
      accessToken,
      refreshToken,
      tokenType: nonEmptyString(body.token_type),
      expiresAt: receivedAt + expiresIn * 1000,
      refreshIssuedAt: receivedAt,
    };
  }

  async post(operation, path, params, { readsBody = true } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response;
    let rawText = "";
    try {
      response = await this.fetchImpl(new URL(path, this.baseUrl).toString(), {
        method: "POST",
        headers: FORM_HEADERS,
        // A redirect would re-send this body, with the client secret and a refresh token, to another address.
        redirect: "manual",
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.#clientSecret,
          ...params,
        }).toString(),
        signal: controller.signal,
      });
      if (response.ok && !readsBody) return { body: null, receivedAt: this.now(), status: response.status };
      rawText = await response.text();
    } catch {
      // The original error is dropped on purpose; see RemoteLockOAuthError.
      throw new RemoteLockOAuthError({
        operation,
        code: controller.signal.aborted ? CODE.TIMEOUT : CODE.NETWORK,
        retryable: true,
      });
    } finally {
      clearTimeout(timer);
    }
    const receivedAt = this.now();
    const { status } = response;

    if (!response.ok) throw this.errorForStatus(operation, status, rawText);

    const body = parseJson(rawText);
    if (body === null) {
      throw new RemoteLockOAuthError({ operation, code: CODE.INVALID_RESPONSE, status, retryable: false });
    }
    return { body, receivedAt, status };
  }

  // Only the "error" field of the body is looked at, and only an allowlisted value is kept.
  errorForStatus(operation, status, rawText) {
    const oauthError = allowedOAuthError(parseJson(rawText)?.error);
    if (status === 400 || status === 401 || status === 403) {
      return new RemoteLockOAuthError({ operation, code: CODE.AUTH, status, retryable: false, oauthError });
    }
    if (status === 429) {
      return new RemoteLockOAuthError({ operation, code: CODE.RATE_LIMIT, status, retryable: true, oauthError });
    }
    return new RemoteLockOAuthError({ operation, code: CODE.HTTP, status, retryable: status >= 500, oauthError });
  }
}
