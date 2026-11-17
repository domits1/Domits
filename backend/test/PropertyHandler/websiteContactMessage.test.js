import { describe, expect, it, jest } from "@jest/globals";
import fc from "fast-check";
import {
  CONTACT_FIELD_LIMITS,
  parseContactMessage,
} from "../../functions/PropertyHandler/business/service/websiteContactMessage.js";
import { WebsiteContactError } from "../../functions/PropertyHandler/util/exception/WebsiteContactError.js";

const VALID = Object.freeze({
  siteId: "site-1",
  propertyId: "property-2",
  name: "Noor de Vries",
  email: "noor.devries+stay@example.nl",
  phone: "+31 (6) 12-34.56/78",
  message: "Is the beach house free in May?",
});

const refusal = (body) => {
  try {
    parseContactMessage(body);
  } catch (error) {
    expect(error).toBeInstanceOf(WebsiteContactError);
    return { status: error.statusCode, code: error.code, field: error.field, message: error.message };
  }
  throw new Error("the message was accepted");
};

const ofLength = (length, character = "a") => character.repeat(length);

describe("reading a contact message from an Elite website", () => {
  it("keeps the six fields, trimmed, and drops anything else in the body", () => {
    const parsed = parseContactMessage({
      ...VALID,
      name: "  Noor de Vries ",
      hostId: "host-other",
      hostEmail: "someone@example.com",
      toEmail: "someone@example.com",
      subject: "Prize",
      propertyTitle: "Not this one",
    });

    expect(parsed).toEqual(VALID);
  });

  it.each([
    ["no propertyId", { propertyId: undefined }],
    ["a null propertyId", { propertyId: null }],
    ["an empty propertyId", { propertyId: "  " }],
  ])("reads %s as a message about no property", (_label, change) => {
    expect(parseContactMessage({ ...VALID, ...change }).propertyId).toBeNull();
  });

  it.each([
    ["no phone", undefined],
    ["an empty phone", " "],
  ])("reads %s as no phone", (_label, phone) => {
    expect(parseContactMessage({ ...VALID, phone }).phone).toBeNull();
  });

  it("keeps HTML in the message as typed, so the email shows it as text", () => {
    const message = '<b>Hi</b> <script>alert("x")</script> &amp; <a href="https://example.com">link</a>';

    expect(parseContactMessage({ ...VALID, message }).message).toBe(message);
  });

  it("turns every kind of line break in the message into one newline and keeps tabs", () => {
    const parsed = parseContactMessage({ ...VALID, message: "one\r\ntwo\rthree\u2028four\u2029five\n\tsix" });

    expect(parsed.message).toBe("one\ntwo\nthree\nfour\nfive\n\tsix");
  });

  it.each([
    ["name", ofLength(CONTACT_FIELD_LIMITS.name, "é")],
    ["email", `${ofLength(64)}@${ofLength(63)}.${ofLength(63)}.${ofLength(61)}`],
    ["phone", `+${ofLength(CONTACT_FIELD_LIMITS.phone - 1, "1")}`],
    ["message", ofLength(CONTACT_FIELD_LIMITS.message, "😀")],
    ["siteId", ofLength(CONTACT_FIELD_LIMITS.id)],
  ])("accepts a %s of exactly the limit, counted in characters", (field, value) => {
    expect(parseContactMessage({ ...VALID, [field]: value })[field]).toBe(value);
  });
});

describe("refusing a contact message with a clear 400", () => {
  it.each([
    ["no body", undefined],
    ["an array", [VALID]],
    ["a string", "message"],
  ])("refuses %s", (_label, body) => {
    expect(refusal(body)).toEqual({
      status: 400,
      code: "invalid_request",
      field: "body",
      message: "A JSON object request body is required.",
    });
  });

  it.each([
    ["siteId", { siteId: " " }, "siteId is required."],
    ["siteId", { siteId: ofLength(CONTACT_FIELD_LIMITS.id + 1) }, "siteId must be one line of at most 100 characters."],
    ["siteId", { siteId: "site-1\nsite-2" }, "siteId must be one line of at most 100 characters."],
    [
      "propertyId",
      { propertyId: ofLength(CONTACT_FIELD_LIMITS.id + 1) },
      "propertyId must be one line of at most 100 characters.",
    ],
    ["name", { name: " " }, "Please enter your name."],
    ["name", { name: ofLength(CONTACT_FIELD_LIMITS.name + 1, "é") }, "Your name can be at most 100 characters."],
    ["email", { email: "" }, "Please enter your email address."],
    [
      "phone",
      { phone: "12345" },
      "Please enter a valid phone number: at least 6 digits, only spaces and + ( ) - . / between them, at most 30 characters.",
    ],
    [
      "phone",
      { phone: `+${ofLength(CONTACT_FIELD_LIMITS.phone, "1")}` },
      "Please enter a valid phone number: at least 6 digits, only spaces and + ( ) - . / between them, at most 30 characters.",
    ],
    [
      "phone",
      { phone: "06 12 34 56 78 ext" },
      "Please enter a valid phone number: at least 6 digits, only spaces and + ( ) - . / between them, at most 30 characters.",
    ],
    ["message", { message: " \n " }, "Please enter a message."],
    [
      "message",
      { message: ofLength(CONTACT_FIELD_LIMITS.message + 1, "😀") },
      "Your message can be at most 5000 characters.",
    ],
    [
      "message",
      { message: "hello\u0000there" },
      "Your message holds characters that cannot be sent. Remove them and try again.",
    ],
    [
      "message",
      { message: "hello\u001bthere" },
      "Your message holds characters that cannot be sent. Remove them and try again.",
    ],
  ])("refuses a bad %s with its own message", (field, change, message) => {
    expect(refusal({ ...VALID, ...change })).toEqual({ status: 400, code: "invalid_request", field, message });
  });

  it.each(["siteId", "propertyId", "name", "email", "phone", "message"])("refuses a %s that is not text", (field) => {
    for (const value of [42, true, { text: "x" }, ["x"]]) {
      expect(refusal({ ...VALID, [field]: value })).toEqual({
        status: 400,
        code: "invalid_request",
        field,
        message: `${field} must be text.`,
      });
    }
  });

  it.each([
    ["a line break", "Noor\r\nBcc: someone@example.com"],
    ["a bare line feed", "Noor\nSubject: Prize"],
    ["a tab", "Noor\tde Vries"],
    ["a line separator", "Noor\u2028Email: someone@example.com"],
    ["a paragraph separator", "Noor\u2029Phone: 0"],
    ["a null character", "Noor\u0000"],
  ])("refuses a name with %s, so it cannot add a line or a header", (_label, name) => {
    expect(refusal({ ...VALID, name })).toEqual({
      status: 400,
      code: "invalid_request",
      field: "name",
      message: "Your name must be one line of text.",
    });
  });

  it.each([
    ["a header after a line break", "noor@example.nl\r\nBcc: someone@example.com"],
    ["a second address", "noor@example.nl, someone@example.com"],
    ["a second address after a semicolon", "noor@example.nl;someone@example.com"],
    ["a display name", "Noor <noor@example.nl>"],
    ["a space", "noor @example.nl"],
    ["no domain dot", "noor@localhost"],
    ["no at sign", "noor.example.nl"],
    ["two at signs", "noor@home@example.nl"],
    ["a dot at the start", ".noor@example.nl"],
    ["a dot before the at sign", "noor.@example.nl"],
    ["two dots in a row", "noor..vries@example.nl"],
    ["a non-ASCII address", "nöör@example.nl"],
    ["a local part over 64 characters", `${ofLength(65)}@example.nl`],
    ["an address over 254 characters", `${ofLength(64)}@${ofLength(63)}.${ofLength(63)}.${ofLength(62)}`],
  ])("refuses an email with %s", (_label, email) => {
    expect(refusal({ ...VALID, email })).toEqual({
      status: 400,
      code: "invalid_request",
      field: "email",
      message: "Please enter a valid email address.",
    });
  });

  it("refuses a phone with a line break", () => {
    expect(refusal({ ...VALID, phone: "0612345678\r\nBcc: x" }).field).toBe("phone");
  });

  it.each(["siteId", "name", "email", "phone", "message"])(
    "refuses a %s of the size API Gateway lets through without counting it character by character",
    (field) => {
      const counted = jest.spyOn(Array, "from");
      const result = refusal({ ...VALID, [field]: ofLength(10 * 1024 * 1024) });
      const countedHugeValue = counted.mock.calls.some(([value]) => typeof value === "string" && value.length > 1000);
      counted.mockRestore();

      expect(result.field).toBe(field);
      expect(countedHugeValue).toBe(false);
    }
  );

  it("never accepts a name or an email that holds a control character or a line separator", () => {
    const breaker = fc.constantFrom("\r", "\n", "\t", "\u0000", "\u0085", "\u2028", "\u2029", "\u007f");
    fc.assert(
      fc.property(
        fc.string(),
        breaker,
        fc.string(),
        fc.constantFrom("name", "email"),
        (before, middle, after, field) => {
          const value = `a${before}${middle}${after}a`;
          expect(refusal({ ...VALID, [field]: value }).field).toBe(field);
        }
      )
    );
  });
});
