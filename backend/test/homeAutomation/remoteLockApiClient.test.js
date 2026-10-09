import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { RemoteLockApiClient } from "../../functions/.shared/homeAutomation/providers/remotelock/remoteLockApiClient.js";
import { RemoteLockApiError } from "../../functions/.shared/homeAutomation/providers/remotelock/remoteLockApiError.js";

const TOKEN = "test-token-abc";
const PIN = "482913";
const NOW = 1_800_000_000_000;
const STARTS = "2026-10-12T15:00:00";
const ENDS = "2026-10-15T11:00:00";
const ACCEPT = "application/vnd.lockstate+json; version=1";

const reply = (status, body, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Headers(headers),
  text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
});

const clientFor = (response) => {
  const fetchImpl = jest.fn().mockResolvedValue(response);
  return { fetchImpl, client: new RemoteLockApiClient({ fetchImpl, now: () => NOW }) };
};

// Shaped like the RemoteLock docs, including the generated pin that must never come back out.
const guest = (status = "upcoming") => ({
  data: { type: "access_guest", id: "guest-1", attributes: { status, starts_at: STARTS, ends_at: ENDS, pin: PIN } },
});

const createGuest = (client) =>
  client.createAccessGuest(TOKEN, { name: "Domits booking b-1", startsAt: STARTS, endsAt: ENDS });

const REQUESTS = [
  {
    name: "listDevices",
    call: (client) => client.listDevices(TOKEN, { page: 2, perPage: 10 }),
    method: "GET",
    path: "/devices?page=2&per_page=10",
    response: {
      data: [{ type: "lock", id: "device-1", attributes: { name: "Front door", model_id: "m", location_id: "l" } }],
      meta: { page: 2, per_page: 10, total_pages: 3, total_count: 25 },
    },
    result: {
      devices: [{ providerDeviceId: "device-1", deviceType: "lock", name: "Front door" }],
      page: 2,
      perPage: 10,
      totalPages: 3,
      totalCount: 25,
    },
  },
  {
    name: "createAccessGuest",
    call: createGuest,
    method: "POST",
    path: "/access_persons",
    body: {
      type: "access_guest",
      attributes: { name: "Domits booking b-1", starts_at: STARTS, ends_at: ENDS, generate_pin: true },
    },
    response: guest(),
    result: { providerCredentialId: "guest-1", status: "upcoming", startsAt: STARTS, endsAt: ENDS },
  },
  {
    name: "grantAccess",
    call: (client) => client.grantAccess(TOKEN, "guest/1", { accessibleId: "device-1", accessibleType: "lock" }),
    method: "POST",
    path: "/access_persons/guest%2F1/accesses",
    body: { attributes: { accessible_id: "device-1", accessible_type: "lock" } },
    response: { data: { type: "access_person_access", id: "access-1", attributes: { access_person_id: "guest/1" } } },
    result: { providerAccessId: "access-1" },
  },
  {
    name: "updateAccessGuest",
    call: (client) => client.updateAccessGuest(TOKEN, "guest-1", { startsAt: STARTS, endsAt: ENDS }),
    method: "PUT",
    path: "/access_persons/guest-1",
    body: { attributes: { starts_at: STARTS, ends_at: ENDS } },
    response: guest("current"),
    result: { providerCredentialId: "guest-1", status: "current", startsAt: STARTS, endsAt: ENDS },
  },
  {
    name: "deactivateAccessGuest",
    call: (client) => client.deactivateAccessGuest(TOKEN, "guest-1"),
    method: "PUT",
    path: "/access_persons/guest-1/deactivate",
    response: guest("deactivated"),
    result: { providerCredentialId: "guest-1", status: "deactivated" },
  },
];

afterEach(() => jest.restoreAllMocks());

describe("RemoteLockApiClient requests", () => {
  it.each(REQUESTS)(
    "$name sends the documented URL, method, headers and body",
    async ({ call, method, path, body, response }) => {
      const { client, fetchImpl } = clientFor(reply(200, response));

      await call(client);

      const [url, init] = fetchImpl.mock.calls[0];
      expect(url).toBe(`https://api.remotelock.com${path}`);
      expect(init.method).toBe(method);
      expect(init.headers).toEqual({
        Authorization: `Bearer ${TOKEN}`,
        Accept: ACCEPT,
        ...(method === "GET" ? {} : { "Content-Type": "application/json" }),
      });
      expect(init.body === undefined ? undefined : JSON.parse(init.body)).toEqual(body);
      expect(init.signal).toBeInstanceOf(AbortSignal);
    }
  );

  it.each(REQUESTS)("$name returns only the documented result fields", async ({ call, response, result }) => {
    const { client } = clientFor(reply(200, response));

    expect(await call(client)).toEqual(result);
  });

  it("sends a padded token, name, accessible id and accessible type trimmed", async () => {
    const { client, fetchImpl } = clientFor(reply(200, { data: { id: "x", attributes: {} } }));

    await client.createAccessGuest(`  ${TOKEN}  `, { name: "  Domits booking b-1  ", startsAt: STARTS, endsAt: ENDS });
    await client.grantAccess(TOKEN, "guest-1", { accessibleId: " device-1 ", accessibleType: " lock " });

    const [[, create], [, grant]] = fetchImpl.mock.calls;
    expect(create.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(JSON.parse(create.body).attributes.name).toBe("Domits booking b-1");
    expect(JSON.parse(grant.body).attributes).toEqual({ accessible_id: "device-1", accessible_type: "lock" });
  });
});

describe("RemoteLockApiClient argument checks", () => {
  const invalid = [
    ["an empty token", (c) => c.listDevices("")],
    ["page 0", (c) => c.listDevices(TOKEN, { page: 0 })],
    ["a fractional page", (c) => c.listDevices(TOKEN, { page: 1.5 })],
    ["perPage 0", (c) => c.listDevices(TOKEN, { perPage: 0 })],
    ["perPage above 50", (c) => c.listDevices(TOKEN, { perPage: 51 })],
    ["a blank guest name", (c) => c.createAccessGuest(TOKEN, { name: " ", startsAt: STARTS, endsAt: ENDS })],
    ["a start with a Z", (c) => c.createAccessGuest(TOKEN, { name: "n", startsAt: `${STARTS}Z`, endsAt: ENDS })],
    [
      "a start with an offset",
      (c) => c.createAccessGuest(TOKEN, { name: "n", startsAt: `${STARTS}+02:00`, endsAt: ENDS }),
    ],
    ["a date without a time", (c) => c.createAccessGuest(TOKEN, { name: "n", startsAt: "2026-10-12", endsAt: ENDS })],
    ["month 13", (c) => c.createAccessGuest(TOKEN, { name: "n", startsAt: "2026-13-12T15:00:00", endsAt: ENDS })],
    ["hour 25", (c) => c.createAccessGuest(TOKEN, { name: "n", startsAt: "2026-10-12T25:00:00", endsAt: ENDS })],
    ["an end equal to the start", (c) => c.createAccessGuest(TOKEN, { name: "n", startsAt: STARTS, endsAt: STARTS })],
    ["an end before the start", (c) => c.updateAccessGuest(TOKEN, "g", { startsAt: ENDS, endsAt: STARTS })],
    ["an update end with a Z", (c) => c.updateAccessGuest(TOKEN, "g", { startsAt: STARTS, endsAt: `${ENDS}Z` })],
    ["a blank access person id on update", (c) => c.updateAccessGuest(TOKEN, " ", { startsAt: STARTS, endsAt: ENDS })],
    [
      "a blank access person id on grant",
      (c) => c.grantAccess(TOKEN, "", { accessibleId: "d", accessibleType: "lock" }),
    ],
    ["a missing accessibleType", (c) => c.grantAccess(TOKEN, "g", { accessibleId: "d" })],
    ["a blank access person id on deactivate", (c) => c.deactivateAccessGuest(TOKEN, "")],
  ];

  it.each(invalid)("rejects %s with a plain error before any request", async (_label, call) => {
    const { client, fetchImpl } = clientFor(reply(200, {}));

    const error = await call(client).catch((caught) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(RemoteLockApiError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("RemoteLockApiClient errors", () => {
  it.each([
    [401, "AUTH", false],
    [403, "AUTH", false],
    [404, "HTTP", false],
    [422, "HTTP", false],
    [429, "RATE_LIMIT", true],
    [500, "HTTP", true],
    [503, "HTTP", true],
  ])("maps status %i to code %s, retryable %s", async (status, code, retryable) => {
    const { client } = clientFor(reply(status, { errors: [] }));

    const error = await createGuest(client).catch((caught) => caught);

    expect(error).toBeInstanceOf(RemoteLockApiError);
    expect(error).toMatchObject({ status, code, retryable, operation: "createAccessGuest" });
  });

  it.each([
    ["30 seconds ahead", { "X-RateLimit-Reset": String(NOW / 1000 + 30) }, 30000],
    ["already past", { "X-RateLimit-Reset": String(NOW / 1000 - 5) }, 0],
    ["missing", {}, null],
  ])("computes retryAfterMs from X-RateLimit-Reset when it is %s", async (_label, headers, expected) => {
    const { client } = clientFor(reply(429, "", headers));

    const error = await client.listDevices(TOKEN).catch((caught) => caught);

    expect(error.retryAfterMs).toBe(expected);
  });

  it("copes with a non-JSON error body and says nothing about it", async () => {
    const { client } = clientFor(reply(502, `<html>Bad gateway, pin ${PIN}</html>`));

    const error = await client.listDevices(TOKEN).catch((caught) => caught);

    expect(error).toMatchObject({ status: 502, code: "HTTP", retryable: true });
    expect(error.message).toBe("RemoteLock listDevices failed with status 502.");
  });

  it("reports a network failure as retryable, without the original message", async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error(`ECONNRESET, pin ${PIN}`));
    const client = new RemoteLockApiClient({ fetchImpl });

    const error = await client.listDevices(TOKEN).catch((caught) => caught);

    expect(error).toMatchObject({ status: null, code: "NETWORK", retryable: true });
    expect(error.message).toBe("RemoteLock listDevices failed (NETWORK).");
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
    const client = new RemoteLockApiClient({ fetchImpl, timeoutMs: 20 });

    const error = await client.listDevices(TOKEN).catch((caught) => caught);

    expect(error).toMatchObject({ status: null, code: "TIMEOUT", retryable: true });
    expect(signal.aborted).toBe(true);
  });

  it.each([
    ["a guest without an id", (c) => createGuest(c), reply(200, { data: { type: "access_guest" } })],
    ["a success body that is not JSON", (c) => createGuest(c), reply(200, "created")],
    ["a device list where data is not a list", (c) => c.listDevices(TOKEN), reply(200, { data: {} })],
    ["a device without an id", (c) => c.listDevices(TOKEN), reply(200, { data: [{ type: "lock" }] })],
    [
      "an access without an id",
      (c) => c.grantAccess(TOKEN, "g", { accessibleId: "d", accessibleType: "lock" }),
      reply(200, { data: {} }),
    ],
    ["an empty deactivate response", (c) => c.deactivateAccessGuest(TOKEN, "g"), reply(200, {})],
  ])("throws INVALID_RESPONSE, not retryable, for %s", async (_label, call, response) => {
    const { client } = clientFor(response);

    const error = await call(client).catch((caught) => caught);

    expect(error).toMatchObject({ code: "INVALID_RESPONSE", retryable: false });
  });
});

describe("RemoteLockApiClient secrets", () => {
  it.each(REQUESTS.filter(({ name }) => name !== "listDevices" && name !== "grantAccess"))(
    "$name never returns the pin from a success response",
    async ({ call, response }) => {
      expect(JSON.stringify(response)).toContain(PIN);
      const { client } = clientFor(reply(200, response));

      const dump = JSON.stringify(await call(client));

      expect(dump).not.toContain(PIN);
      expect(dump).not.toMatch(/pin/i);
    }
  );

  it("never keeps the pin that an error response echoes", async () => {
    const body = { errors: [{ detail: `pin ${PIN} is already taken` }], data: { attributes: { pin: PIN } } };
    const { client } = clientFor(reply(422, body));

    const error = await createGuest(client).catch((caught) => caught);

    expect(JSON.stringify(error, Object.getOwnPropertyNames(error))).not.toContain(PIN);
    expect(error.message).not.toMatch(/pin/i);
    expect(error).not.toHaveProperty("body");
    expect(error).not.toHaveProperty("cause");
  });

  it("never puts the token in a result or an error, and never logs", async () => {
    const spies = ["log", "info", "warn", "error"].map((level) => jest.spyOn(console, level));
    const ok = clientFor(reply(200, guest()));
    const failed = clientFor(reply(401, { errors: [{ detail: `Bearer ${TOKEN} rejected` }] }));

    const result = await createGuest(ok.client);
    const error = await createGuest(failed.client).catch((caught) => caught);

    expect(JSON.stringify(result)).not.toContain(TOKEN);
    expect(JSON.stringify(error, Object.getOwnPropertyNames(error))).not.toContain(TOKEN);
    spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  });
});
