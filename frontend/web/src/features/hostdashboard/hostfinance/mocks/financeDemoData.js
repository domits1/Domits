export const FINANCE_DEMO_DATA = {
  account: {
    accountId: "acct_demo_domits",
    onboardingComplete: true,
    chargesEnabled: true,
    payoutsEnabled: true,
  },
  balance: {
    available: [{ amount: 3240, currency: "EUR" }],
    pending: [{ amount: 420, currency: "EUR" }],
  },
  payouts: [
    { id: "po_demo_2000", arrivalDate: "May 6", amount: 2000, currency: "EUR", status: "In 2 days" },
    { id: "po_demo_1820", arrivalDate: "May 13", amount: 1820, currency: "EUR", status: "In 9 days" },
    { id: "po_demo_420", arrivalDate: "May 6", amount: 420, currency: "EUR", status: "Processing" },
  ],
  charges: [
    {
      createdDate: "Apr 30, 2026",
      description: "Guest payment",
      channel: "Airbnb",
      hostReceives: 670,
      currency: "EUR",
      status: "succeeded",
    },
    {
      createdDate: "Apr 15, 2026",
      description: "Payout to bank account",
      channel: "Stripe",
      hostReceives: -1200,
      currency: "EUR",
      status: "paid",
    },
    {
      createdDate: "Mar 01, 2026",
      description: "Refund booking #017234",
      channel: "Booking.com",
      hostReceives: -50,
      currency: "EUR",
      status: "refunded",
    },
    {
      createdDate: "Mar 01, 2026",
      description: "Refund booking #017668",
      channel: "Booking.com",
      hostReceives: -150,
      currency: "EUR",
      status: "refunded",
    },
  ],
  schedule: {
    interval: "daily",
    weekly_anchor: null,
    monthly_anchor: null,
  },
};

export function isFinanceDemoMode() {
  if (typeof window === "undefined") return false;
  const queryValue = new URLSearchParams(window.location.search).get("financeDemo");
  if (queryValue === "false") return false;
  return (
    queryValue === "true" ||
    window.localStorage.getItem("domits.finance.demo") === "true" ||
    process.env.REACT_APP_FINANCE_DEMO_DATA === "true"
  );
}

