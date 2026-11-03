import { describe, expect, test } from "@jest/globals";
import { truviErrorMessage } from "../../functions/Truvi-Integration/util/truviErrorMessage.js";
import { TruviApiError } from "../../functions/Truvi-Integration/data/truviApiClient.js";

const GUEST_TEXT = "Guest Jan Jansen (jan@example.com, +31612345678) is not valid";

describe("truviErrorMessage", () => {
  test.each([
    [new TruviApiError(400, GUEST_TEXT), "Truvi refused the request with status 400"],
    [new TruviApiError(404, GUEST_TEXT), "Truvi refused the request with status 404"],
    [new TruviApiError(503, GUEST_TEXT), "Truvi failed with status 503"],
    [new TruviApiError(null, "Truvi did not answer within 10000 ms"), "Truvi did not answer"],
    [new TypeError("fetch failed"), "Truvi did not answer"],
    [undefined, "Truvi did not answer"],
  ])("gives a fixed message for %p", (error, message) => {
    expect(truviErrorMessage(error)).toBe(message);
  });

  test("names the known reason Truvi gave, in our own words", () => {
    const error = new TruviApiError(400, `${GUEST_TEXT}: checkIn is in the past, and CAN NO LONGER BE CANCELLED.`);

    expect(truviErrorMessage(error, ["can no longer be cancelled", "screening only"])).toBe(
      "Truvi refused: can no longer be cancelled"
    );
  });

  test("never keeps the text Truvi sent", () => {
    const messages = [400, 404, 409, 500, null].map((status) =>
      truviErrorMessage(new TruviApiError(status, GUEST_TEXT), ["cannot be modified"])
    );

    expect(messages.filter((message) => /jan|@|\+31/i.test(message))).toEqual([]);
  });
});
