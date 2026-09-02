import fc from "fast-check";
import { describe, it, expect } from "@jest/globals";
import {
  signWebsiteQuoteToken,
  verifyWebsiteQuoteToken,
} from "../../functions/.shared/websiteQuoteToken.js";

const SECRET = "test-quote-secret";
const NOW = Date.parse("2026-09-02T12:00:00.000Z");

const buildPayload = (overrides = {}) => ({
  siteId: "site-1",
  propertyId: "property-1",
  checkIn: "2026-10-01",
  checkOut: "2026-10-05",
  guests: 2,
  priceBreakdown: { currency: "EUR", total: 81000 },
  expiresAt: "2026-09-02T12:30:00.000Z",
  ...overrides,
});

describe("signWebsiteQuoteToken", () => {
  it("produces a qtok_-prefixed token", () => {
    const token = signWebsiteQuoteToken(buildPayload(), SECRET);
    expect(token.startsWith("qtok_")).toBe(true);
  });

  it("throws when the secret is missing or empty", () => {
    expect(() => signWebsiteQuoteToken(buildPayload(), "")).toThrow(TypeError);
    expect(() => signWebsiteQuoteToken(buildPayload(), undefined)).toThrow(TypeError);
  });

  it("throws when the payload is not an object", () => {
    expect(() => signWebsiteQuoteToken("not-a-payload", SECRET)).toThrow(TypeError);
    expect(() => signWebsiteQuoteToken(null, SECRET)).toThrow(TypeError);
  });
});

describe("verifyWebsiteQuoteToken", () => {
  it("round-trips a signed payload before expiry", () => {
    const payload = buildPayload();
    const token = signWebsiteQuoteToken(payload, SECRET);
    expect(verifyWebsiteQuoteToken(token, SECRET, { now: NOW })).toEqual(payload);
  });

  it("rejects a token signed with a different secret", () => {
    const token = signWebsiteQuoteToken(buildPayload(), "other-secret");
    expect(verifyWebsiteQuoteToken(token, SECRET, { now: NOW })).toBeNull();
  });

  it("rejects a token whose payload was tampered with", () => {
    const token = signWebsiteQuoteToken(buildPayload(), SECRET);
    const signature = token.split(".")[1];
    const tamperedPayload = Buffer.from(
      JSON.stringify(buildPayload({ priceBreakdown: { currency: "EUR", total: 1 } })),
      "utf8"
    ).toString("base64url");
    const tampered = `qtok_${tamperedPayload}.${signature}`;
    expect(tampered).not.toEqual(token);
    expect(verifyWebsiteQuoteToken(tampered, SECRET, { now: NOW })).toBeNull();
  });

  it("rejects a token whose signature was tampered with", () => {
    const token = signWebsiteQuoteToken(buildPayload(), SECRET);
    const flipped = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    expect(verifyWebsiteQuoteToken(flipped, SECRET, { now: NOW })).toBeNull();
  });

  it("rejects an expired token, including exactly at expiry", () => {
    const payload = buildPayload({ expiresAt: "2026-09-02T12:00:00.000Z" });
    const token = signWebsiteQuoteToken(payload, SECRET);
    expect(verifyWebsiteQuoteToken(token, SECRET, { now: NOW })).toBeNull();
    expect(verifyWebsiteQuoteToken(token, SECRET, { now: NOW + 1 })).toBeNull();
    expect(verifyWebsiteQuoteToken(token, SECRET, { now: NOW - 1 })).toEqual(payload);
  });

  it("rejects a payload without a parseable ISO-8601 expiresAt", () => {
    const withoutExpiry = signWebsiteQuoteToken(buildPayload({ expiresAt: undefined }), SECRET);
    const withBadExpiry = signWebsiteQuoteToken(buildPayload({ expiresAt: "soon" }), SECRET);
    const withNumericExpiry = signWebsiteQuoteToken(buildPayload({ expiresAt: NOW + 60_000 }), SECRET);
    expect(verifyWebsiteQuoteToken(withoutExpiry, SECRET, { now: NOW })).toBeNull();
    expect(verifyWebsiteQuoteToken(withBadExpiry, SECRET, { now: NOW })).toBeNull();
    expect(verifyWebsiteQuoteToken(withNumericExpiry, SECRET, { now: NOW })).toBeNull();
  });

  it("rejects malformed tokens without throwing", () => {
    const malformed = [
      null,
      undefined,
      42,
      "",
      "qtok_",
      "qtok_only-one-part",
      "qtok_a.b.c",
      "wrongprefix_abc.def",
      "qtok_%%%.###",
      `qtok_${Buffer.from("not-json", "utf8").toString("base64url")}.deadbeef`,
    ];
    for (const token of malformed) {
      expect(verifyWebsiteQuoteToken(token, SECRET, { now: NOW })).toBeNull();
    }
  });

  it("throws when the secret is missing or empty", () => {
    const token = signWebsiteQuoteToken(buildPayload(), SECRET);
    expect(() => verifyWebsiteQuoteToken(token, "", { now: NOW })).toThrow(TypeError);
  });

  it("round-trips any JSON-safe payload carrying a valid expiry", () => {
    fc.assert(
      fc.property(fc.jsonValue({ maxDepth: 3 }), (extra) => {
        const payload = buildPayload({ extra });
        const token = signWebsiteQuoteToken(payload, SECRET);
        return (
          JSON.stringify(verifyWebsiteQuoteToken(token, SECRET, { now: NOW })) === JSON.stringify(payload)
        );
      })
    );
  });
});
