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
    { id: "po_demo_2000", arrivalDate: "May 6", arrivalDateAt: "2026-05-06T00:00:00.000Z", amount: 2000, currency: "EUR", status: "In 2 days", isProjected: true },
    { id: "po_demo_1820", arrivalDate: "May 13", arrivalDateAt: "2026-05-13T00:00:00.000Z", amount: 1820, currency: "EUR", status: "In 9 days", isProjected: true },
    { id: "po_demo_420", arrivalDate: "May 6", arrivalDateAt: "2026-05-06T00:00:00.000Z", amount: 420, currency: "EUR", status: "Processing", isProjected: true },
    { id: "po_demo_paid", arrivalDate: "Apr 29", arrivalDateAt: "2026-04-29T00:00:00.000Z", amount: 1820, currency: "EUR", status: "paid", isProjected: false },
  ],
  charges: [
    {
      createdDate: "Apr 30, 2026",
      description: "Guest payment",
      channel: "Airbnb",
      hostReceives: 670,
      currency: "EUR",
      status: "succeeded",
      transactionType: "payments",
      createdAt: "2026-04-30T00:00:00.000Z",
    },
    {
      createdDate: "Mar 01, 2026",
      description: "Refund booking #017234",
      channel: "Booking.com",
      hostReceives: -50,
      amountRefunded: 50,
      refunded: true,
      currency: "EUR",
      status: "refunded",
      transactionType: "refunds",
      createdAt: "2026-03-01T00:00:00.000Z",
    },
    {
      createdDate: "Mar 01, 2026",
      description: "Refund booking #017668",
      channel: "Booking.com",
      hostReceives: -150,
      amountRefunded: 150,
      refunded: true,
      currency: "EUR",
      status: "refunded",
      transactionType: "refunds",
      createdAt: "2026-03-01T00:00:00.000Z",
    },
  ],
  faqs: [
    {
      faq_id: "demo-faq-1",
      question: "When will I be paid?",
      answer: "Payment timelines depend on your payout schedule and Stripe account status.",
    },
    {
      faq_id: "demo-faq-2",
      question: "How do payouts work?",
      answer: "Payments for your bookings are deposited into your linked Stripe account and paid out according to your Stripe schedule.",
    },
    {
      faq_id: "demo-faq-3",
      question: "Why do I have to share my details with Stripe?",
      answer: "Stripe requires your details to verify your identity and securely process payments.",
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
  if (process.env.NODE_ENV === "production") return false;
  const queryValue = new URLSearchParams(window.location.search).get("financeDemo");
  if (queryValue === "false") return false;
  return (
    queryValue === "true" ||
    window.localStorage.getItem("domits.finance.demo") === "true" ||
    process.env.REACT_APP_FINANCE_DEMO_DATA === "true"
  );
}
