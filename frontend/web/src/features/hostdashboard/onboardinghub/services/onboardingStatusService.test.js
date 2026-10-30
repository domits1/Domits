import { checkAnyWebsiteStatus, checkPaymentsStatus, computeIsGoLiveReady } from "./onboardingStatusService";
import { fetchWebsiteDraftByPropertyId } from "../../website/services/websiteDraftService";
import { getStripeAccountDetails } from "../../hostfinance/services/stripeAccountService";

jest.mock("../../website/services/websiteDraftService", () => ({
  fetchWebsiteDraftByPropertyId: jest.fn(),
}));

jest.mock("../../hostfinance/services/stripeAccountService", () => ({
  ...jest.requireActual("../../hostfinance/services/stripeAccountService"),
  getStripeAccountDetails: jest.fn(),
}));

const makeProperties = (count) => Array.from({ length: count }, (_, i) => ({ propertyId: `p${i}` }));

describe("checkAnyWebsiteStatus", () => {
  beforeEach(() => {
    fetchWebsiteDraftByPropertyId.mockReset();
  });

  test("returns complete as soon as any listing in the batch has a draft, without checking listings past that batch", async () => {
    fetchWebsiteDraftByPropertyId.mockImplementation((id) => Promise.resolve(id === "p3" ? { id } : null));

    const result = await checkAnyWebsiteStatus(makeProperties(50));

    expect(result).toEqual({ complete: true, scope: "account" });
    expect(fetchWebsiteDraftByPropertyId).toHaveBeenCalledTimes(10);
  });

  test("stops at the request cap for a very large portfolio with no drafts, reporting unknown rather than a false 'not started'", async () => {
    fetchWebsiteDraftByPropertyId.mockResolvedValue(null);

    const result = await checkAnyWebsiteStatus(makeProperties(1000));

    expect(result).toEqual({ complete: false, scope: "account", unknown: true });
    expect(fetchWebsiteDraftByPropertyId).toHaveBeenCalledTimes(200);
  });

  test("reports complete: false, not unknown, once a whole small portfolio is checked and none has a draft", async () => {
    fetchWebsiteDraftByPropertyId.mockResolvedValue(null);

    const result = await checkAnyWebsiteStatus(makeProperties(5));

    expect(result).toEqual({ complete: false, scope: "account" });
  });

  test("reports unknown when every lookup in the portfolio fails", async () => {
    fetchWebsiteDraftByPropertyId.mockRejectedValue(new Error("network error"));

    const result = await checkAnyWebsiteStatus(makeProperties(15));

    expect(result).toEqual({ complete: false, scope: "account", unknown: true });
  });

  test("returns complete: false without making any requests for an empty portfolio", async () => {
    const result = await checkAnyWebsiteStatus([]);

    expect(result).toEqual({ complete: false, scope: "account" });
    expect(fetchWebsiteDraftByPropertyId).not.toHaveBeenCalled();
  });
});

describe("checkPaymentsStatus", () => {
  beforeEach(() => {
    getStripeAccountDetails.mockReset();
  });

  test("is complete only once Stripe onboarding, charges and payouts are all enabled", async () => {
    getStripeAccountDetails.mockResolvedValue({
      accountId: "acct_test",
      onboardingComplete: true,
      chargesEnabled: true,
      payoutsEnabled: true,
    });

    const result = await checkPaymentsStatus();

    expect(result).toEqual({ complete: true, scope: "account" });
  });

  test.each([
    ["onboarding isn't finished", { accountId: "acct_test", onboardingComplete: false, chargesEnabled: true, payoutsEnabled: true }],
    ["charges are disabled", { accountId: "acct_test", onboardingComplete: true, chargesEnabled: false, payoutsEnabled: true }],
    ["payouts are disabled", { accountId: "acct_test", onboardingComplete: true, chargesEnabled: true, payoutsEnabled: false }],
    ["the Stripe account is missing", { onboardingComplete: true, chargesEnabled: true, payoutsEnabled: true }],
  ])("is not complete when %s, even though a Stripe account exists", async (_label, details) => {
    getStripeAccountDetails.mockResolvedValue(details);

    const result = await checkPaymentsStatus();

    expect(result).toEqual({ complete: false, scope: "account" });
  });

  test("reports unknown when the Stripe lookup fails", async () => {
    getStripeAccountDetails.mockRejectedValue(new Error("network error"));

    const result = await checkPaymentsStatus();

    expect(result).toEqual({ complete: false, scope: "account", unknown: true });
  });
});

describe("computeIsGoLiveReady", () => {
  const REQUIRED = new Set(["company", "payments"]);

  test("is ready once every required step is complete", () => {
    expect(computeIsGoLiveReady({ company: { complete: true }, payments: { complete: true } }, REQUIRED)).toBe(true);
  });

  test("is not ready while any required step is incomplete", () => {
    expect(computeIsGoLiveReady({ company: { complete: true }, payments: { complete: false } }, REQUIRED)).toBe(
      false
    );
  });

  test("is not ready when a required step's status hasn't loaded yet", () => {
    expect(computeIsGoLiveReady({ company: { complete: true } }, REQUIRED)).toBe(false);
  });
});
