import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { inspect } from "node:util";
import { RemoteLockOAuthClient } from "../../functions/.shared/homeAutomation/providers/remotelock/remoteLockOAuthClient.js";
import { RemoteLockOAuthError } from "../../functions/.shared/homeAutomation/providers/remotelock/remoteLockOAuthError.js";

const CLIENT_ID = "client-id-123";
const CLIENT_SECRET = "client-secret-xyz";
const REDIRECT_URI = "https://app.domits.test/hostdashboard/remotelock/callback";
const ACCESS = "access-token-aaa";
const REFRESH = "refresh-token-bbb";
const NEW_REFRESH = "refresh-token-ccc";
const NOW = 1_800_000_000_000;
const SECRETS = [CLIENT_SECRET, ACCESS, REFRESH, NEW_REFRESH];

const tokenBody = (overrides = {}) => ({
  access_token: ACCESS,
  token_type: "Bearer",
  expires_in: 7200,
  refresh_token: NEW_REFRESH,
  created_at: 1_790_000_000,
  ...overrides,
});

const reply = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  text: jest.fn(async () => (typeof body === "string" ? body : JSON.stringify(body))),
});

const clientFor = (response, options = {}) => {
  const fetchImpl = jest.fn().mockResolvedValue(response);
  const client = new RemoteLockOAuthClient({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: REDIRECT_URI,
    fetchImpl,
    now: () => NOW,
    ...options,
  });
  return { client, fetchImpl };
};

const formOf = (init) => Object.fromEntries(new URLSearchParams(init.body));
const dumpOf = (error) => JSON.stringify(error, Object.getOwnPropertyNames(error));

const CALLS = [
  {
    name: "exchangeCode",
    call: (client) => client.exchangeCode("code-1"),
    form: { grant_type: "authorization_code", code: "code-1", redirect_uri: REDIRECT_URI },
    path: "/oauth/token",
  },
  {
    name: "refresh",
    call: (client) => client.refresh(REFRESH),
    form: { grant_type: "refresh_token", refresh_token: REFRESH },
    path: "/oauth/token",
  },
  { name: "revoke", call: (client) => client.revoke(ACCESS), form: { token: ACCESS }, path: "/oauth/revoke" },
];
const TOKEN_CALLS = CALLS.filter(({ name }) => name !== "revoke");

afterEach(() => jest.restoreAllMocks());

describe("RemoteLockOAuthClient construction", () => {
  const valid = { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, redirectUri: REDIRECT_URI };

  it.each([
    ["clientId", { ...valid, clientId: " " }],
    ["clientSecret", { ...valid, clientSecret: undefined }],
    ["redirectUri", { ...valid, redirectUri: "" }],
    ["redirectUri", { ...valid, redirectUri: "not a url" }],
  ])("throws a plain error naming %s, without any secret value", (label, options) => {
    const error = (() => {
      try {
        return new RemoteLockOAuthClient(options);
      } catch (caught) {
        return caught;
      }
    })();

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(RemoteLockOAuthError);
    expect(error.message).toContain(label);
    expect(error.message).not.toContain(CLIENT_SECRET);
  });

  describe.each(["baseUrl", "redirectUri"])("%s", (field) => {
    const build = (value) => new RemoteLockOAuthClient({ ...valid, [field]: value });

    it.each([
      ["https", "https://connect.remotelock.com"],
      ["http on localhost", "http://localhost:3000/callback"],
      ["http on 127.0.0.1", "http://127.0.0.1:8080/callback"],
    ])("accepts %s", (_label, value) => {
      expect(() => build(value)).not.toThrow();
    });

    it.each([
      ["plain http to another host", "http://connect.remotelock.com"],
      ["a host that only starts with localhost", "http://localhost.evil.test/callback"],
      ["a javascript: URL", "javascript:alert(1)"],
      ["an ftp: URL", "ftp://connect.remotelock.com"],
      ["a malformed value", "not a url"],
    ])("rejects %s with a plain error that names the field", (_label, value) => {
      const error = (() => {
        try {
          return build(value);
        } catch (caught) {
          return caught;
        }
      })();

      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(RemoteLockOAuthError);
      expect(error.message).toContain(field);
      expect(error.message).not.toContain(value);
    });
  });
});

describe("RemoteLockOAuthClient.buildAuthorizeUrl", () => {
  it("builds the documented URL and never contains the client secret", () => {
    const { client } = clientFor(reply(200, {}));

    const url = new URL(client.buildAuthorizeUrl("state-1"));

    expect(`${url.origin}${url.pathname}`).toBe("https://connect.remotelock.com/oauth/authorize");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      state: "state-1",
    });
    expect(url.href).not.toContain(CLIENT_SECRET);
  });

  it.each(["", "  ", undefined])("requires a state (%j)", (state) => {
    const { client } = clientFor(reply(200, {}));

    expect(() => client.buildAuthorizeUrl(state)).toThrow("state");
  });
});

describe("RemoteLockOAuthClient requests", () => {
  it.each(CALLS)("$name posts the documented form to $path, secrets only in the body", async ({ call, form, path }) => {
    const { client, fetchImpl } = clientFor(reply(200, tokenBody()));

    await call(client);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`https://connect.remotelock.com${path}`);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" });
    expect(formOf(init)).toEqual({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, ...form });
    SECRETS.forEach((secret) => expect(url).not.toContain(secret));
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.redirect).toBe("manual");
  });

  it.each([
    ["exchangeCode", (client) => client.exchangeCode(" ")],
    ["refresh", (client) => client.refresh("")],
    ["revoke", (client) => client.revoke(undefined)],
  ])("%s rejects an empty value with a plain error before any request", async (_name, call) => {
    const { client, fetchImpl } = clientFor(reply(200, tokenBody()));

    const error = await call(client).catch((caught) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(RemoteLockOAuthError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("RemoteLockOAuthClient token results", () => {
  it.each(TOKEN_CALLS)(
    "$name returns only the five documented fields, timed from the receive time",
    async ({ call }) => {
      const { client } = clientFor(reply(200, tokenBody({ scope: "x", extra: "ignored" })));

      expect(await call(client)).toEqual({
        accessToken: ACCESS,
        refreshToken: NEW_REFRESH,
        tokenType: "Bearer",
        expiresAt: NOW + 7200 * 1000,
        refreshIssuedAt: NOW,
      });
    }
  );

  it("takes the receive time after the body has been read", async () => {
    let clock = NOW;
    const { client } = clientFor(reply(200, tokenBody()), { now: () => clock });
    client.fetchImpl = jest.fn(async () => {
      clock += 5000;
      return reply(200, tokenBody());
    });

    const result = await client.refresh(REFRESH);

    expect(result.refreshIssuedAt).toBe(NOW + 5000);
    expect(result.expiresAt).toBe(NOW + 5000 + 7200 * 1000);
  });

  it("returns tokenType null when the response has none", async () => {
    const { client } = clientFor(reply(200, tokenBody({ token_type: undefined })));

    expect((await client.refresh(REFRESH)).tokenType).toBeNull();
  });

  it("revoke resolves with nothing and never reads a successful body", async () => {
    const response = reply(200, "ignored");
    const { client } = clientFor(response);

    await expect(client.revoke(ACCESS)).resolves.toBeUndefined();
    expect(response.text).not.toHaveBeenCalled();
  });
});

describe("RemoteLockOAuthClient errors", () => {
  it.each([
    [400, "AUTH", false],
    [401, "AUTH", false],
    [403, "AUTH", false],
    [429, "RATE_LIMIT", true],
    [404, "HTTP", false],
    [422, "HTTP", false],
    [500, "HTTP", true],
    [503, "HTTP", true],
  ])("maps status %i to code %s, retryable %s", async (status, code, retryable) => {
    const { client } = clientFor(reply(status, { error: "invalid_grant" }));

    const error = await client.refresh(REFRESH).catch((caught) => caught);

    expect(error).toBeInstanceOf(RemoteLockOAuthError);
    expect(error).toMatchObject({ operation: "refresh", status, code, retryable });
  });

  it.each(CALLS)(
    "$name does not follow a redirect: a 307 is a non-retryable HTTP error, body not kept",
    async ({ call }) => {
      const { client } = clientFor(reply(307, `<a href="https://elsewhere.test/?x=${CLIENT_SECRET}">moved</a>`));

      const error = await call(client).catch((caught) => caught);

      expect(error).toBeInstanceOf(RemoteLockOAuthError);
      expect(error).toMatchObject({ status: 307, code: "HTTP", retryable: false, oauthError: null });
      expect(dumpOf(error)).not.toContain(CLIENT_SECRET);
      expect(dumpOf(error)).not.toContain("elsewhere");
    }
  );

  it.each([
    "invalid_grant",
    "invalid_client",
    "invalid_request",
    "unauthorized_client",
    "unsupported_grant_type",
    "invalid_scope",
  ])("keeps the known oauth error %s", async (name) => {
    const { client } = clientFor(reply(400, { error: name, error_description: "free text" }));

    const error = await client.exchangeCode("code-1").catch((caught) => caught);

    expect(error.oauthError).toBe(name);
    expect(dumpOf(error)).not.toContain("free text");
  });

  it.each([
    ["an unknown name", { error: "server_error" }],
    ["a non-string", { error: { message: "nested" } }],
    ["no error field", { message: "nothing" }],
    ["a non-JSON body", "<html>oops</html>"],
  ])("drops the oauth error for %s", async (_label, body) => {
    const { client } = clientFor(reply(400, body));

    const error = await client.refresh(REFRESH).catch((caught) => caught);

    expect(error.oauthError).toBeNull();
    expect(error.message).toBe("RemoteLock OAuth refresh failed with status 400.");
  });

  it("reports a network failure as retryable, without the original message", async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error(`ECONNRESET ${CLIENT_SECRET} ${REFRESH}`));
    const client = new RemoteLockOAuthClient({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUri: REDIRECT_URI,
      fetchImpl,
    });

    const error = await client.refresh(REFRESH).catch((caught) => caught);

    expect(error).toMatchObject({ status: null, code: "NETWORK", retryable: true });
    expect(error.message).toBe("RemoteLock OAuth refresh failed (NETWORK).");
  });

  it("aborts the request and reports a retryable timeout", async () => {
    let signal;
    const fetchImpl = jest.fn(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          signal = init.signal;
          signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
        })
    );
    const client = new RemoteLockOAuthClient({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUri: REDIRECT_URI,
      fetchImpl,
      timeoutMs: 20,
    });

    const error = await client.refresh(REFRESH).catch((caught) => caught);

    expect(error).toMatchObject({ status: null, code: "TIMEOUT", retryable: true });
    expect(signal.aborted).toBe(true);
  });

  it.each([
    ["a body that is not JSON", reply(200, "created")],
    ["no access_token", reply(200, tokenBody({ access_token: undefined }))],
    ["no refresh_token", reply(200, tokenBody({ refresh_token: undefined }))],
    ["no expires_in", reply(200, tokenBody({ expires_in: undefined }))],
    ["a zero expires_in", reply(200, tokenBody({ expires_in: 0 }))],
    ["a non-numeric expires_in", reply(200, tokenBody({ expires_in: "soon" }))],
    ["an empty object", reply(200, {})],
  ])("throws INVALID_RESPONSE, not retryable, for %s", async (_label, response) => {
    const { client } = clientFor(response);

    const error = await client.refresh(REFRESH).catch((caught) => caught);

    expect(error).toMatchObject({ code: "INVALID_RESPONSE", status: 200, retryable: false });
  });
});

describe("RemoteLockOAuthClient secrets", () => {
  it("never keeps a secret that an error response echoes", async () => {
    const echoed = {
      error: "invalid_grant",
      error_description: `bad ${CLIENT_SECRET} ${REFRESH} ${ACCESS}`,
      data: SECRETS,
    };
    const { client } = clientFor(reply(400, echoed));

    const error = await client.refresh(REFRESH).catch((caught) => caught);

    SECRETS.forEach((secret) => expect(dumpOf(error)).not.toContain(secret));
    expect(error).not.toHaveProperty("body");
    expect(error).not.toHaveProperty("cause");
  });

  it("never puts a secret in the error for an unreadable success response", async () => {
    const { client } = clientFor(reply(200, tokenBody({ refresh_token: undefined })));

    const error = await client.refresh(REFRESH).catch((caught) => caught);

    SECRETS.forEach((secret) => expect(dumpOf(error)).not.toContain(secret));
  });

  it("does not expose the client secret through serialisation, inspection or enumeration", () => {
    const { client } = clientFor(reply(200, {}));

    expect(JSON.stringify(client)).not.toContain(CLIENT_SECRET);
    expect(String(client)).not.toContain(CLIENT_SECRET);
    expect(inspect(client, { showHidden: true, depth: 5 })).not.toContain(CLIENT_SECRET);
    expect(Object.values(client).map(String).join()).not.toContain(CLIENT_SECRET);
  });

  it("never logs, on success or on failure", async () => {
    const spies = ["log", "info", "warn", "error"].map((level) => jest.spyOn(console, level));
    const ok = clientFor(reply(200, tokenBody()));
    const failed = clientFor(reply(400, { error: "invalid_grant", error_description: CLIENT_SECRET }));

    await ok.client.refresh(REFRESH);
    await failed.client.refresh(REFRESH).catch(() => null);

    spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  });
});
