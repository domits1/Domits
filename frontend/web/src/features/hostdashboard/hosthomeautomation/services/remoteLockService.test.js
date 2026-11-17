import {
  RemoteLockRequestError,
  completeRemoteLockConnect,
  connectRemoteLock,
  disconnectRemoteLock,
  getRemoteLockDevices,
  getRemoteLockStatus,
} from "./remoteLockService";
import { getIdToken } from "../../../../services/getAccessToken";

jest.mock("../../../../services/getAccessToken");

const BASE = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/integrations/home-automation/remotelocks";
const ID_TOKEN = "id-token-aaa";
const CODE = "one-time-code-xyz";
const STATE = "state-value-123";
const AUTHORIZE_URL = "https://connect.remotelock.com/oauth/authorize?client_id=c&state=s";

const respond = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

beforeEach(() => {
  jest.clearAllMocks();
  getIdToken.mockResolvedValue(ID_TOKEN);
  global.fetch = jest.fn();
});

describe("remoteLockService requests", () => {
  it.each([
    ["getRemoteLockStatus", () => getRemoteLockStatus(), "GET", "/status", undefined],
    ["connectRemoteLock", () => connectRemoteLock(), "POST", "/connect", undefined],
    [
      "completeRemoteLockConnect",
      () => completeRemoteLockConnect({ code: CODE, state: STATE }),
      "POST",
      "/connect/complete",
      { code: CODE, state: STATE },
    ],
    ["disconnectRemoteLock", () => disconnectRemoteLock(), "POST", "/disconnect", undefined],
    ["getRemoteLockDevices", () => getRemoteLockDevices(), "GET", "/devices", undefined],
  ])("%s sends %s %s with the Cognito id token", async (_name, call, method, path, body) => {
    fetch.mockResolvedValue(respond(200, { status: "CONNECTED", authorizeUrl: AUTHORIZE_URL, devices: [] }));

    await call();

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE}${path}`);
    expect(options.method).toBe(method);
    expect(options.headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
    expect(options.body).toBe(body === undefined ? undefined : JSON.stringify(body));
  });

  it("reads the status and the last sync time", async () => {
    fetch.mockResolvedValue(respond(200, { status: "CONNECTED", lastSyncAt: 1790000000000 }));

    await expect(getRemoteLockStatus()).resolves.toEqual({ status: "CONNECTED", lastSyncAt: 1790000000000 });
  });

  it("completes the connection and resolves the new status", async () => {
    fetch.mockResolvedValue(respond(200, { status: "CONNECTED", lastSyncAt: null }));

    await expect(completeRemoteLockConnect({ code: CODE, state: STATE })).resolves.toEqual({
      status: "CONNECTED",
      lastSyncAt: null,
    });
  });

  it("unwraps the devices and the truncated flag", async () => {
    const devices = [{ id: "d-1", name: "Front door", type: "lock", status: "ONLINE", battery: 82, lastSeenAt: null }];
    fetch.mockResolvedValueOnce(respond(200, { devices, truncated: true }));
    fetch.mockResolvedValueOnce(respond(200, {}));

    await expect(getRemoteLockDevices()).resolves.toEqual({ devices, truncated: true });
    await expect(getRemoteLockDevices()).resolves.toEqual({ devices: [], truncated: false });
  });
});

describe("remoteLockService connect", () => {
  it("resolves the sign-in URL when it is RemoteLock's own", async () => {
    fetch.mockResolvedValue(respond(200, { status: "CONNECTING", authorizeUrl: AUTHORIZE_URL }));

    await expect(connectRemoteLock()).resolves.toEqual({ status: "CONNECTING", authorizeUrl: AUTHORIZE_URL });
  });

  it.each([
    ["another host", "https://evil.example.com/oauth/authorize"],
    ["a look-alike host", "https://connect.remotelock.com.evil.example.com/oauth"],
    ["user info in front of another host", "https://connect.remotelock.com@evil.example.com/"],
    ["plain http", "http://connect.remotelock.com/oauth/authorize"],
    ["another port", "https://connect.remotelock.com:8443/oauth/authorize"],
    ["a data URL", "data:text/html,hello"],
    ["no URL", undefined],
  ])("refuses %s", async (_label, authorizeUrl) => {
    fetch.mockResolvedValue(respond(200, { status: "CONNECTING", authorizeUrl }));

    await expect(connectRemoteLock()).rejects.toMatchObject({ code: "INVALID_AUTHORIZE_URL" });
  });
});

describe("remoteLockService errors", () => {
  it("carries the status and the backend codes, and nothing else from the response", async () => {
    fetch.mockResolvedValue(
      respond(503, { error: "RATE_LIMITED", retryable: true, retryAfterSeconds: 7, detail: `token ${CODE}` })
    );

    const error = await getRemoteLockDevices().catch((caught) => caught);

    expect(error).toBeInstanceOf(RemoteLockRequestError);
    expect(error).toMatchObject({ status: 503, code: "RATE_LIMITED", retryable: true, retryAfterSeconds: 7 });
    expect(JSON.stringify([error.message, Object.values(error)])).not.toContain(CODE);
  });

  it.each([
    ["a 401 without a body", respond(401, null), { status: 401, code: null, retryable: false }],
    ["a code that is not text", respond(500, { error: { nested: true } }), { status: 500, code: null }],
  ])("handles %s", async (_label, response, expected) => {
    fetch.mockResolvedValue(response);

    await expect(getRemoteLockStatus()).rejects.toMatchObject(expected);
  });

  it("keeps the code and the state out of the message of a failed completion", async () => {
    fetch.mockResolvedValue(respond(409, { error: "STATE_INVALID", retryable: false }));

    const error = await completeRemoteLockConnect({ code: CODE, state: STATE }).catch((caught) => caught);

    expect(error.code).toBe("STATE_INVALID");
    expect(`${error.message} ${error.name}`).not.toMatch(new RegExp(`${CODE}|${STATE}`));
  });

  it.each([
    ["a network failure", () => fetch.mockRejectedValue(new Error(`offline ${CODE}`))],
    ["a missing session", () => getIdToken.mockRejectedValue(new Error("No current user"))],
  ])("turns %s into a retryable error without its message", async (_label, arrange) => {
    arrange();

    const error = await getRemoteLockStatus().catch((caught) => caught);

    expect(error).toMatchObject({ status: null, code: null, retryable: true });
    expect(error.message).not.toContain(CODE);
  });
});
