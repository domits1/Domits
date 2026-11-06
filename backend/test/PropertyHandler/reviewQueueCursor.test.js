import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import {
  decodeReviewQueueCursor,
  encodeReviewQueueCursor,
} from "../../functions/PropertyHandler/util/reviewQueueCursor.js";
import { TypeException } from "../../functions/PropertyHandler/util/exception/TypeException.js";

const toCursor = (payload) => Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

describe("review queue cursor", () => {
  it("decodes what it encoded", () => {
    const key = { updatedAt: 1_800_000_000_000, id: "property-1" };

    expect(decodeReviewQueueCursor(encodeReviewQueueCursor(key))).toEqual(key);
  });

  it("round trips any non-negative safe integer and non-empty id", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        fc.string({ minLength: 1 }),
        (updatedAt, id) => {
          expect(decodeReviewQueueCursor(encodeReviewQueueCursor({ updatedAt, id }))).toEqual({ updatedAt, id });
        }
      )
    );
  });

  it("produces a string that is safe to put in a query string untouched", () => {
    const cursor = encodeReviewQueueCursor({ updatedAt: 0, id: "id with spaces/and+symbols=?" });

    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["a number", 123],
    ["an object", { u: 1, i: "a" }],
    ["an empty string", ""],
    ["characters outside base64url", "not a cursor!"],
    ["standard base64 padding", `${toCursor({ u: 1, i: "a" })}=`],
    ["longer than 512 characters", "a".repeat(513)],
    ["base64url of text that is not JSON", Buffer.from("not json", "utf8").toString("base64url")],
    ["a JSON array", toCursor([1, "a"])],
    ["JSON null", toCursor(null)],
    ["a missing updatedAt", toCursor({ i: "a" })],
    ["a missing id", toCursor({ u: 1 })],
    ["a negative updatedAt", toCursor({ u: -1, i: "a" })],
    ["a fractional updatedAt", toCursor({ u: 1.5, i: "a" })],
    ["a string updatedAt", toCursor({ u: "1", i: "a" })],
    ["an unsafe integer updatedAt", toCursor({ u: Number.MAX_SAFE_INTEGER + 1, i: "a" })],
    ["an empty id", toCursor({ u: 1, i: "" })],
    ["a numeric id", toCursor({ u: 1, i: 5 })],
    ["extra fields", toCursor({ u: 1, i: "a", x: true })],
    ["keys in another order", toCursor({ i: "a", u: 1 })],
  ])("rejects %s with a 400", (_name, cursor) => {
    const decode = () => decodeReviewQueueCursor(cursor);

    expect(decode).toThrow(TypeException);
    expect(decode).toThrow(expect.objectContaining({ statusCode: 400, message: "Invalid cursor." }));
  });
});
