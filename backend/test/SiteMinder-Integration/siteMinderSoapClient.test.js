import { describe, expect, jest, test } from "@jest/globals";
import {
  SiteMinderSoapClient,
  SiteMinderSoapError,
  SITEMINDER_PREPROD_URL,
} from "../../functions/SiteMinder-Integration/data/siteMinderSoapClient.js";

const SUCCESS = `<SOAP-ENV:Envelope><SOAP-ENV:Header/><SOAP-ENV:Body><OTA_HotelAvailNotifRS Version="1.0" EchoToken="e1"><Success/></OTA_HotelAvailNotifRS></SOAP-ENV:Body></SOAP-ENV:Envelope>`;
const ERRORS = `<SOAP-ENV:Envelope><SOAP-ENV:Body><OTA_HotelAvailNotifRS><Errors><Error Type="6">PMS is not authorized to access hotel with HotelCode=XXXX</Error></Errors></OTA_HotelAvailNotifRS></SOAP-ENV:Body></SOAP-ENV:Envelope>`;
const FAULT = `<SOAP-ENV:Envelope><SOAP-ENV:Body><SOAP-ENV:Fault><faultcode>wsse:FailedAuthentication</faultcode><faultstring>Authentication failed</faultstring></SOAP-ENV:Fault></SOAP-ENV:Body></SOAP-ENV:Envelope>`;

const answer = (status, body) =>
  jest.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, text: async () => body });

const client = (fetchImpl, options = {}) =>
  new SiteMinderSoapClient({ pmsCode: "PMSXTEST", username: "user", password: "p@ss", fetchImpl, ...options });

describe("SiteMinderSoapClient", () => {
  test("refuses to start without a pmsCode, username or password", () => {
    expect(() => new SiteMinderSoapClient({ username: "u", password: "p" })).toThrow("pmsCode is required");
    expect(() => new SiteMinderSoapClient({ pmsCode: "X", password: "p" })).toThrow("username is required");
    expect(() => new SiteMinderSoapClient({ pmsCode: "X", username: "u" })).toThrow("password is required");
  });

  test("posts the body in a SOAP envelope to the PMS endpoint", async () => {
    const fetchImpl = answer(200, SUCCESS);

    const result = await client(fetchImpl).send("<OTA_HotelAvailNotifRQ/>", { echoToken: "e1" });

    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe(`${SITEMINDER_PREPROD_URL}/webservices/PMSXTEST`);
    expect(options.method).toBe("POST");
    expect(options.headers).toEqual({ "Content-Type": "text/xml; charset=utf-8" });
    expect(options.body).toContain("<wsse:Username>user</wsse:Username>");
    expect(options.body).toContain("<SOAP-ENV:Body><OTA_HotelAvailNotifRQ/></SOAP-ENV:Body>");
    expect(options.body).not.toContain("\n");
    expect(result).toEqual({ success: true, echoToken: "e1" });
  });

  test("throws a non-retryable error with every OTA error when SiteMinder refuses the message", async () => {
    const error = await client(answer(200, ERRORS)).send("<X/>", { echoToken: "e1" }).catch((e) => e);

    expect(error).toBeInstanceOf(SiteMinderSoapError);
    expect(error.retryable).toBe(false);
    expect(error.errors).toEqual([{ type: 6, code: null, message: "PMS is not authorized to access hotel with HotelCode=XXXX" }]);
    expect(error.message).toBe("PMS is not authorized to access hotel with HotelCode=XXXX");
    expect(error.echoToken).toBe("e1");
  });

  test("reads a SOAP fault, for example wrong credentials", async () => {
    const error = await client(answer(500, FAULT)).send("<X/>").catch((e) => e);

    expect(error.status).toBe(500);
    expect(error.message).toBe("Authentication failed");
  });

  test("marks a 5xx without an OTA answer as retryable", async () => {
    const error = await client(answer(503, "Service Unavailable")).send("<X/>").catch((e) => e);

    expect(error.retryable).toBe(true);
    expect(error.status).toBe(503);
  });

  test("does not report success for a 200 it does not recognise", async () => {
    const error = await client(answer(200, "<html>ok</html>")).send("<X/>").catch((e) => e);

    expect(error).toBeInstanceOf(SiteMinderSoapError);
    expect(error.message).toBe("Unrecognised SiteMinder response");
  });

  test("marks a timeout as retryable", async () => {
    const fetchImpl = jest.fn(
      (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))))
    );

    const error = await client(fetchImpl, { timeoutMs: 20 }).send("<X/>").catch((e) => e);

    expect(error.status).toBeNull();
    expect(error.retryable).toBe(true);
    expect(error.message).toBe("SiteMinder did not answer within 20 ms");
  });

  test("marks a network error as retryable", async () => {
    const fetchImpl = jest.fn(async () => {
      throw new TypeError("fetch failed");
    });

    const error = await client(fetchImpl).send("<X/>").catch((e) => e);

    expect(error.retryable).toBe(true);
    expect(error.message).toBe("fetch failed");
  });

  test("does not put the password on the error", async () => {
    const error = await client(answer(200, ERRORS)).send("<X/>").catch((e) => e);

    expect(JSON.stringify({ ...error, message: error.message })).not.toContain("p@ss");
  });
});
