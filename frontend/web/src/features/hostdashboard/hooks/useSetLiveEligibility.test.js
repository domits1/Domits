import { act, renderHook } from "@testing-library/react";
import { getStripeAccountDetails } from "../hostfinance/services/stripeAccountService";
import { useSetLiveEligibility } from "./useSetLiveEligibility";

jest.mock("../hostfinance/services/stripeAccountService", () => ({
  ...jest.requireActual("../hostfinance/services/stripeAccountService"),
  getStripeAccountDetails: jest.fn(),
}));

describe("useSetLiveEligibility", () => {
  beforeEach(() => {
    getStripeAccountDetails.mockReset();
  });

  test("allows publishing when Stripe onboarding, charges and payouts are enabled", async () => {
    getStripeAccountDetails.mockResolvedValue({
      accountId: "acct_test",
      onboardingComplete: true,
      chargesEnabled: true,
      payoutsEnabled: true,
    });
    const { result } = renderHook(() => useSetLiveEligibility());

    let isEligible;
    await act(async () => {
      isEligible = await result.current.fetchLiveEligibility();
    });

    expect(isEligible).toBe(true);
    expect(result.current.liveEligibility).toBe(true);
    expect(result.current.liveEligibilityError).toBe("");
    expect(result.current.liveEligibilityLoading).toBe(false);
  });

  test.each([
    ["Stripe onboarding is incomplete", { accountId: "acct_test", onboardingComplete: false, chargesEnabled: true, payoutsEnabled: true }],
    ["charges are disabled", { accountId: "acct_test", onboardingComplete: true, chargesEnabled: false, payoutsEnabled: true }],
    ["payouts are disabled", { accountId: "acct_test", onboardingComplete: true, chargesEnabled: true, payoutsEnabled: false }],
    ["no Stripe account is connected", null],
  ])("blocks publishing when %s", async (_description, details) => {
    getStripeAccountDetails.mockResolvedValue(details);
    const { result } = renderHook(() => useSetLiveEligibility());

    let isEligible;
    await act(async () => {
      isEligible = await result.current.fetchLiveEligibility();
    });

    expect(isEligible).toBe(false);
    expect(result.current.liveEligibility).toBe(false);
    expect(result.current.liveEligibilityError).toBe("");
  });

  test("surfaces Stripe lookup errors without treating them as missing bank details", async () => {
    getStripeAccountDetails.mockRejectedValue(new Error("Stripe API unavailable"));
    const { result } = renderHook(() => useSetLiveEligibility());

    let isEligible;
    await act(async () => {
      isEligible = await result.current.fetchLiveEligibility();
    });

    expect(isEligible).toBe(false);
    expect(result.current.liveEligibility).toBe(false);
    expect(result.current.liveEligibilityError).toBe("Stripe API unavailable");
    expect(result.current.liveEligibilityLoading).toBe(false);
  });
});
