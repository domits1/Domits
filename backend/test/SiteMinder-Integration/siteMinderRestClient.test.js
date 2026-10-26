import { describe, expect, jest, test } from "@jest/globals";
import {
  SiteMinderApiError,
  SiteMinderRestClient,
  SITEMINDER_PREPROD_URL,
} from "../../functions/SiteMinder-Integration/data/siteMinderRestClient.js";

function fakeFetch(status, body) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  });
}

const client = (fetchImpl, options = {}) =>
  new SiteMinderRestClient({ pmsCode: "PMSXTEST", username: "user", password: "p@ss", fetchImpl, ...options });

describe("SiteMinderRestClient", () => {
  test("refuses to start without a pmsCode, username or password", () => {
    expect(() => new SiteMinderRestClient({ username: "u", password: "p" })).toThrow("pmsCode is required");
    expect(() => new SiteMinderRestClient({ pmsCode: "X", password: "p" })).toThrow("username is required");
    expect(() => new SiteMinderRestClient({ pmsCode: "X", username: "u" })).toThrow("password is required");
  });

  test("gets the room rates with Basic auth and a trace token", async () => {
    const fetchImpl = fakeFetch(200, [{ roomTypeCode: "DORM", ratePlanCode: "NonRef1" }]);

    const result = await client(fetchImpl).getRoomRates("PMSXTEST1");

    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe(`${SITEMINDER_PREPROD_URL}/core-api/pmses/PMSXTEST/hotels/PMSXTEST1/room-rates`);
    expect(options.method).toBe("GET");
    expect(options.headers.Authorization).toBe(`Basic ${Buffer.from("user:p@ss").toString("base64")}`);
    expect(options.headers["X-SM-TRACE-TOKEN"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(result).toEqual([{ roomTypeCode: "DORM", ratePlanCode: "NonRef1" }]);
  });

  test("encodes the codes in the path", async () => {
    const fetchImpl = fakeFetch(200, []);

    await client(fetchImpl, { pmsCode: "A/B" }).getRoomRates("H 1");

    expect(fetchImpl.mock.calls[0][0]).toBe(`${SITEMINDER_PREPROD_URL}/core-api/pmses/A%2FB/hotels/H%201/room-rates`);
  });

  test("refuses an empty hotelCode", () => {
    expect(() => client(fakeFetch(200, [])).getRoomRates("")).toThrow("hotelCode is required");
  });

  test("throws a SiteMinderApiError with the first error's code and message", async () => {
    const fetchImpl = fakeFetch(401, { errors: [{ code: "UnauthorizedError", message: "Invalid credentials" }] });

    const error = await client(fetchImpl).getRoomRates("PMSXTEST1").catch((e) => e);

    expect(error).toBeInstanceOf(SiteMinderApiError);
    expect(error.status).toBe(401);
    expect(error.code).toBe("UnauthorizedError");
    expect(error.message).toBe("Invalid credentials");
    expect(error.traceToken).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("still throws a clear error when the error body is not JSON", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 503, text: async () => "Service Unavailable" });

    const error = await client(fetchImpl).getRoomRates("PMSXTEST1").catch((e) => e);

    expect(error.status).toBe(503);
    expect(error.message).toBe("Service Unavailable");
  });

  test("cuts a long error message to 200 characters", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "x".repeat(500) });

    const error = await client(fetchImpl).getRoomRates("PMSXTEST1").catch((e) => e);

    expect(error.message).toHaveLength(200);
  });

  test("stops waiting when SiteMinder does not answer in time", async () => {
    const fetchImpl = jest.fn(
      (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))))
    );

    const error = await client(fetchImpl, { timeoutMs: 20 }).getRoomRates("PMSXTEST1").catch((e) => e);

    expect(error).toBeInstanceOf(SiteMinderApiError);
    expect(error.status).toBeNull();
    expect(error.message).toBe("SiteMinder did not answer within 20 ms");
  });

  test("does not put the password on the error", async () => {
    const fetchImpl = fakeFetch(401, { errors: [{ code: "UnauthorizedError" }] });

    const error = await client(fetchImpl).getRoomRates("PMSXTEST1").catch((e) => e);

    expect(JSON.stringify({ ...error, message: error.message })).not.toContain("p@ss");
  });
});
