import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import {
  DEFAULT_REVIEW_QUEUE_LIMIT,
  MAX_REVIEW_QUEUE_LIMIT,
  normalizeReviewQueueLimit,
} from "../../functions/PropertyHandler/util/reviewQueueLimit.js";

describe("normalizeReviewQueueLimit", () => {
  it("uses 25 as the default and 50 as the maximum", () => {
    expect(DEFAULT_REVIEW_QUEUE_LIMIT).toBe(25);
    expect(MAX_REVIEW_QUEUE_LIMIT).toBe(50);
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["an empty string", ""],
    ["a blank string", "   "],
    ["text", "abc"],
    ["Infinity", "Infinity"],
    ["NaN", Number.NaN],
  ])("falls back to the default for %s", (_name, raw) => {
    expect(normalizeReviewQueueLimit(raw)).toBe(25);
  });

  it.each([
    ["0", 1],
    ["-5", 1],
    ["1", 1],
    ["10", 10],
    ["25", 25],
    ["50", 50],
    ["51", 50],
    ["1000", 50],
    ["1e9", 50],
    ["7.9", 7],
    [" 12 ", 12],
    [30, 30],
  ])("maps %s to %s", (raw, expected) => {
    expect(normalizeReviewQueueLimit(raw)).toBe(expected);
  });

  it("always returns an integer between 1 and 50 for any finite number", () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true, noDefaultInfinity: true }), (raw) => {
        const limit = normalizeReviewQueueLimit(raw);

        expect(Number.isInteger(limit)).toBe(true);
        expect(limit).toBeGreaterThanOrEqual(1);
        expect(limit).toBeLessThanOrEqual(50);
      })
    );
  });
});
