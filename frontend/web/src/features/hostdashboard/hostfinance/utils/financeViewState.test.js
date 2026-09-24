import { deriveFinanceViewState, getTransactionType } from "./financeViewState.js";

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
