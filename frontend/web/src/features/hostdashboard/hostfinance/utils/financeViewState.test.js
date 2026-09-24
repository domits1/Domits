import { deriveFinanceViewState, getArrivingSoonAmount, getLastPayout, getTransactionType } from "./financeViewState.js";

describe("deriveFinanceViewState", () => {
  test("marks a connected active host as live and shows financial data", () => {
    const result = deriveFinanceViewState({
      accountId: "acct_123",
      onboardingComplete: true,
      chargesEnabled: true,
      payoutsEnabled: true,
      listingState: { hasProperty: true, isLive: true },
      charges: [],
      payouts: [],
      balanceTotal: 0,
    });

    expect(result).toMatchObject({
      isConnected: true,
      stripeIssues: false,
      hasProperty: true,
      listingError: false,
      isLive: true,
      showFinancialData: true,
    });
  });

  test("keeps financial data visible when a connected host has no active listing", () => {
    const result = deriveFinanceViewState({
      accountId: "acct_123",
      onboardingComplete: true,
      chargesEnabled: true,
      payoutsEnabled: true,
      listingState: { hasProperty: true, isLive: false },
      charges: [],
      payouts: [],
      balanceTotal: 100,
    });

    expect(result).toMatchObject({
      isConnected: true,
      hasProperty: true,
      isLive: false,
      showFinancialData: true,
    });
  });

  test("keeps financial data visible when listing status cannot be loaded", () => {
    const result = deriveFinanceViewState({
      accountId: "acct_123",
      onboardingComplete: true,
      chargesEnabled: true,
      payoutsEnabled: true,
      listingState: { hasProperty: false, isLive: false, error: true },
      charges: [],
      payouts: [],
      balanceTotal: 100,
    });

    expect(result).toMatchObject({
      isConnected: true,
      listingError: true,
      isLive: false,
      showFinancialData: true,
    });
  });

  test("flags a connected Stripe account with disabled payouts or charges", () => {
    const result = deriveFinanceViewState({
      accountId: "acct_123",
      onboardingComplete: true,
      chargesEnabled: true,
      payoutsEnabled: false,
      listingState: { hasProperty: true, isLive: true },
      charges: [],
      payouts: [],
      balanceTotal: 100,
    });

    expect(result).toMatchObject({
      isConnected: true,
      stripeIssues: true,
      isLive: false,
      showFinancialData: true,
    });
  });

  test("allows demo data to show financial activity without a live Stripe connection", () => {
    const result = deriveFinanceViewState({
      accountId: null,
      onboardingComplete: false,
      chargesEnabled: true,
      payoutsEnabled: true,
      listingState: { hasProperty: true, isLive: true },
      demoMode: true,
      charges: [{ hostReceives: 100 }],
      payouts: [],
      balanceTotal: 0,
    });

    expect(result).toMatchObject({
      isConnected: false,
      isLive: false,
      hasActivity: true,
      showFinancialData: true,
    });
  });
  test("uses the backend-provided transaction type and defaults to payments", () => {
    expect(getTransactionType({ transactionType: "refunds" })).toBe("refunds");
    expect(getTransactionType({ transactionType: "payments" })).toBe("payments");
    expect(getTransactionType({})).toBe("payments");
  });
});

describe("payout display helpers", () => {
  const payouts = [
    {
      isProjected: true,
      amount: 0,
      arrivalDate: "26 Sep",
      id: null,
      status: "forecasted (not yet started)",
    },
    { isProjected: true, amount: 120, arrivalDate: "28 Sep", id: null, status: "incoming charge - pending" },
    { isProjected: true, amount: 80, arrivalDate: "30 Sep", id: null, status: "incoming charge - pending" },
    { isProjected: false, amount: 670, arrivalDate: "20 Sep" },
    { isProjected: false, amount: 540, arrivalDate: "12 Sep" },
  ];

  test("sums projected payouts without the forecast for arriving soon", () => {
    expect(getArrivingSoonAmount(payouts)).toBe(200);
  });

  test("includes the first projected payout when there is no forecast", () => {
    const payoutsWithoutForecast = [
      { isProjected: true, amount: 120, arrivalDate: "28 Sep", id: null, status: "incoming charge - pending" },
      { isProjected: true, amount: 80, arrivalDate: "30 Sep", id: null, status: "incoming charge - pending" },
      { isProjected: false, amount: 670, arrivalDate: "20 Sep" },
    ];

    expect(getArrivingSoonAmount(payoutsWithoutForecast)).toBe(200);
  });

  test("uses the first real payout as the last payout", () => {
    expect(getLastPayout(payouts)).toMatchObject({
      isProjected: false,
      amount: 670,
      arrivalDate: "20 Sep",
    });
  });
});
