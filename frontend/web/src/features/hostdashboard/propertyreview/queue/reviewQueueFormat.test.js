import { REVIEW_API_ERROR_CODE, PropertyReviewApiError } from "../services/propertyReviewApi";
import {
  EMPTY_VALUE,
  describeQueueError,
  formatReviewLocation,
  formatReviewPrice,
  formatReviewType,
  formatReviewUpdated,
} from "./reviewQueueFormat";

describe("reviewQueueFormat", () => {
  describe("formatReviewPrice", () => {
    test.each([
      [{ roomRate: 120 }, "EUR 120 / night"],
      [{ roomRate: 1250 }, "EUR 1,250 / night"],
      [{ roomRate: 99.5 }, "EUR 99.5 / night"],
      [{ roomRate: 0 }, "EUR 0 / night"],
    ])("formats %j", (pricing, expected) => {
      expect(formatReviewPrice(pricing)).toBe(expected);
    });

    test.each([[null], [undefined], [{}], [{ roomRate: null }], [{ roomRate: "abc" }], [{ roomRate: NaN }]])(
      "shows a dash for %j",
      (pricing) => {
        expect(formatReviewPrice(pricing)).toBe(EMPTY_VALUE);
      }
    );
  });

  describe("formatReviewLocation", () => {
    test.each([
      [{ city: "Amsterdam", country: "Netherlands" }, "Amsterdam, Netherlands"],
      [{ city: "Amsterdam" }, "Amsterdam"],
      [{ city: " ", country: "Netherlands" }, "Netherlands"],
      [{}, EMPTY_VALUE],
      [null, EMPTY_VALUE],
    ])("formats %j", (location, expected) => {
      expect(formatReviewLocation(location)).toBe(expected);
    });
  });

  describe("formatReviewType", () => {
    test.each([
      [{ property_type: "House", spaceType: "Entire place" }, "House · Entire place"],
      [{ property_type: "House" }, "House"],
      [{ spaceType: "Room" }, "Room"],
      [null, EMPTY_VALUE],
    ])("formats %j", (type, expected) => {
      expect(formatReviewType(type)).toBe(expected);
    });
  });

  describe("formatReviewUpdated", () => {
    test("formats epoch milliseconds as a readable local date", () => {
      const noon = new Date(2026, 9, 30, 12).getTime();

      expect(formatReviewUpdated(noon)).toBe("30 Oct 2026");
    });

    test.each([[null], [undefined], ["x"], [NaN], [Infinity]])("shows a dash for %j", (value) => {
      expect(formatReviewUpdated(value)).toBe(EMPTY_VALUE);
    });
  });

  describe("describeQueueError", () => {
    const errorWithCode = (code) => new PropertyReviewApiError(0, code, "x");

    test.each([
      [REVIEW_API_ERROR_CODE.UNAUTHENTICATED, "Your session has expired. Please sign in again.", false],
      [REVIEW_API_ERROR_CODE.FORBIDDEN, "Not authorized", false],
    ])("explains %s without a retry", (code, message, canRetry) => {
      expect(describeQueueError(errorWithCode(code))).toEqual({ message, canRetry });
    });

    test.each([
      [REVIEW_API_ERROR_CODE.SERVER],
      [REVIEW_API_ERROR_CODE.NETWORK],
      [REVIEW_API_ERROR_CODE.UNAVAILABLE],
      [REVIEW_API_ERROR_CODE.INVALID_CURSOR],
    ])("offers a retry for %s", (code) => {
      expect(describeQueueError(errorWithCode(code))).toEqual({ message: "Could not load the queue.", canRetry: true });
    });

    test("offers a retry for an error that is not an API error", () => {
      expect(describeQueueError(new Error("boom"))).toEqual({ message: "Could not load the queue.", canRetry: true });
    });
  });
});
