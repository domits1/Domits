import { act, renderHook } from "@testing-library/react";
import { getStripeAccountDetails } from "../hostfinance/services/stripeAccountService";
import { isLiveEligible, useSetLiveEligibility } from "./useSetLiveEligibility";

jest.mock("../hostfinance/services/stripeAccountService", () => ({
  getStripeAccountDetails: jest.fn(),
}));

describe("isLiveEligible", () => {
  test("requires Stripe bank details", () => {
    expect(isLiveEligible({ bankDetailsProvided: true })).toBe(true);
    expect(isLiveEligible({ bankDetailsProvided: false })).toBe(false);
    expect(isLiveEligible(null)).toBe(false);
  });
});

describe("useSetLiveEligibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("reads the same Stripe bank-details status used by Finance", async () => {
    getStripeAccountDetails.mockResolvedValue({
      bankDetailsProvided: true,
      onboardingComplete: false,
      chargesEnabled: false,
      payoutsEnabled: false,
    });

    const { result } = renderHook(() => useSetLiveEligibility());

    await act(async () => {
      await result.current.fetchLiveEligibility();
    });

    expect(result.current.liveEligibility).toBe(true);
    expect(getStripeAccountDetails).toHaveBeenCalledTimes(1);
    expect(result.current.liveEligibilityError).toBe("");
  });

  test("blocks go-live when Stripe bank details are missing", async () => {
    getStripeAccountDetails.mockResolvedValue({
      bankDetailsProvided: false,
      onboardingComplete: true,
      chargesEnabled: true,
      payoutsEnabled: true,
    });

    const { result } = renderHook(() => useSetLiveEligibility());

    await act(async () => {
      await result.current.fetchLiveEligibility();
    });

    expect(result.current.liveEligibility).toBe(false);
  });
});
