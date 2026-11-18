// Amounts sent to PriceLabs and summed as revenue are euros. A booking imported from a channel
// keeps the currency it was paid in (#3583); without an exchange rate it is left out of every
// amount instead of being counted as euros. No currency means euros: every booking from before
// that column, and every Domits booking.
export const isEuroBooking = (booking) => {
  const currency = String(booking?.currency ?? "").trim().toUpperCase();
  return currency === "" || currency === "EUR";
};
