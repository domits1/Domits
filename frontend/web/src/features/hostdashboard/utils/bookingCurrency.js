const DEFAULT_CURRENCY = "EUR";

// A booking keeps the currency of its total when it came from a channel in another currency (#3583).
// No currency means euros: every booking from before that column, and every Domits booking.
export const bookingCurrencyCode = (booking) => {
  const stored = String(booking?.currency ?? "").trim().toUpperCase();
  return stored || DEFAULT_CURRENCY;
};

// The text in front of an amount, so each page keeps its own number format.
export const bookingCurrencyPrefix = (booking) => {
  const code = bookingCurrencyCode(booking);
  try {
    // "symbol", not "narrowSymbol": the narrow form shows "$" for USD, AUD and CAD alike.
    const symbol = new Intl.NumberFormat("en", { style: "currency", currency: code, currencyDisplay: "symbol" })
      .formatToParts(0)
      .find((part) => part.type === "currency").value;
    // A currency without its own symbol comes back as its code, which needs a space before the amount.
    return symbol === code ? `${code} ` : symbol;
  } catch {
    // Intl throws on a malformed code; showing it as it is keeps the page working.
    return `${code} `;
  }
};
