import { bookingCurrencyCode, bookingCurrencyPrefix } from "./bookingCurrency";

describe("bookingCurrencyCode", () => {
  // Every booking from before #3583, and every Domits booking, has no currency and is in euros.
  test.each([{}, { currency: null }, { currency: "" }, null])("is EUR for a booking without a currency: %p", (booking) => {
    expect(bookingCurrencyCode(booking)).toBe("EUR");
  });

  test("returns the stored code in capitals", () => {
    expect(bookingCurrencyCode({ currency: "gbp" })).toBe("GBP");
  });
});

describe("bookingCurrencyPrefix", () => {
  test.each([
    { currency: null, expected: "€" },
    { currency: "EUR", expected: "€" },
    { currency: "GBP", expected: "£" },
    { currency: "USD", expected: "$" },
    // A dollar that is not the US dollar keeps its prefix, so it is not read as USD.
    { currency: "AUD", expected: "A$" },
  ])("shows $expected in front of an amount in $currency", ({ currency, expected }) => {
    expect(bookingCurrencyPrefix({ currency })).toBe(expected);
  });

  // A currency without its own symbol, such as CHF, would read "CHF250" without the space.
  test("shows the code and a space for a currency without its own symbol", () => {
    expect(bookingCurrencyPrefix({ currency: "CHF" })).toBe("CHF ");
  });

  // Intl throws on a malformed code; the page must still render the amount.
  test("shows the stored value and a space instead of failing on a malformed code", () => {
    expect(bookingCurrencyPrefix({ currency: "EU" })).toBe("EU ");
  });
});
