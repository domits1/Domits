import { describe, expect, test } from "@jest/globals";
import { escapeXml, parseOtaResponse, wrapSoapEnvelope } from "../../functions/SiteMinder-Integration/util/otaXml.js";

describe("escapeXml", () => {
  test("escapes the five XML special characters", () => {
    expect(escapeXml(`A&B <"x"> 'y'`)).toBe("A&amp;B &lt;&quot;x&quot;&gt; &apos;y&apos;");
  });
});

describe("wrapSoapEnvelope", () => {
  test("puts the credentials in a WS-Security UsernameToken and the body inside SOAP-ENV:Body", () => {
    const xml = wrapSoapEnvelope({ username: "user", password: "p&ss", body: "<Ping/>" });
    expect(xml).toContain("<wsse:Username>user</wsse:Username>");
    expect(xml).toContain("#PasswordText\">p&amp;ss</wsse:Password>");
    expect(xml).toContain("<SOAP-ENV:Body><Ping/></SOAP-ENV:Body>");
  });

  test("refuses to build without credentials", () => {
    expect(() => wrapSoapEnvelope({ username: "", password: "x", body: "" })).toThrow("username and password are required");
  });
});

describe("parseOtaResponse", () => {
  test("reads a success response", () => {
    const xml = `<SOAP-ENV:Envelope><SOAP-ENV:Header/><SOAP-ENV:Body>
      <OTA_HotelAvailNotifRS Version="1.0" EchoToken="e1"><Success/></OTA_HotelAvailNotifRS>
    </SOAP-ENV:Body></SOAP-ENV:Envelope>`;
    expect(parseOtaResponse(xml)).toEqual({ success: true, errors: [] });
  });

  test("reads every error with its type, code and message", () => {
    const xml = `<OTA_HotelAvailNotifRS><Errors>
      <Error Type="6">PMS is not authorized to access hotel with HotelCode=XXXX</Error>
      <Error Type="3" Code="392">Invalid &amp; unknown room</Error>
    </Errors></OTA_HotelAvailNotifRS>`;
    expect(parseOtaResponse(xml)).toEqual({
      success: false,
      errors: [
        { type: 6, code: null, message: "PMS is not authorized to access hotel with HotelCode=XXXX" },
        { type: 3, code: 392, message: "Invalid & unknown room" },
      ],
    });
  });

  test("turns a SOAP fault into one error", () => {
    const xml = `<SOAP-ENV:Envelope><SOAP-ENV:Body><SOAP-ENV:Fault>
      <faultcode>wsse:FailedAuthentication</faultcode><faultstring>Authentication failed</faultstring>
    </SOAP-ENV:Fault></SOAP-ENV:Body></SOAP-ENV:Envelope>`;
    expect(parseOtaResponse(xml)).toEqual({
      success: false,
      errors: [{ type: "SoapFault", code: null, message: "Authentication failed" }],
    });
  });

  test("does not report success for a response it does not recognise", () => {
    expect(parseOtaResponse("<html>Bad gateway</html>")).toEqual({
      success: false,
      errors: [{ type: null, code: null, message: "Unrecognised SiteMinder response" }],
    });
  });
});