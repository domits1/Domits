import {
  checkAnyWebsiteStatus,
  checkGoLiveStatus,
  checkPaymentsStatus,
  checkSecurityStatus,
  checkOwnersStatus,
  checkMessagingStatus,
  computeIsGoLiveReady,
} from "./onboardingStatusService";
import { Auth } from "aws-amplify";
import { fetchWebsiteDraftByPropertyId } from "../../website/services/websiteDraftService";
import { getStripeAccountDetails } from "../../hostfinance/services/stripeAccountService";
import { listOwners } from "../../hostowners/services/ownerService";
import { listAutomations } from "../../hostmessages/services/automationService";

jest.mock("aws-amplify", () => ({
  Auth: {
    currentAuthenticatedUser: jest.fn(),
    getPreferredMFA: jest.fn(),
    currentSession: jest.fn(),
  },
}));

jest.mock("../../hostowners/services/ownerService", () => ({
  listOwners: jest.fn(),
}));

jest.mock("../../hostmessages/services/automationService", () => ({
  listAutomations: jest.fn(),
}));

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

describe("checkSecurityStatus", () => {
  const user = { username: "host-1" };

  beforeEach(() => {
    Auth.currentAuthenticatedUser.mockReset();
    Auth.getPreferredMFA.mockReset();
    Auth.currentAuthenticatedUser.mockResolvedValue(user);
  });

  test.each([["TOTP"], ["SOFTWARE_TOKEN_MFA"], ["SMS"], ["SMS_MFA"]])(
    "is complete when the preferred MFA is %s",
    async (preferredMfa) => {
      Auth.getPreferredMFA.mockResolvedValue(preferredMfa);

      const result = await checkSecurityStatus();

      expect(result).toEqual({ complete: true, scope: "account" });
      expect(Auth.getPreferredMFA).toHaveBeenCalledWith(user);
    }
  );

  test.each([["NOMFA"], [""], [undefined]])("is not complete when the preferred MFA is %p", async (preferredMfa) => {
    Auth.getPreferredMFA.mockResolvedValue(preferredMfa);

    const result = await checkSecurityStatus();

    expect(result).toEqual({ complete: false, scope: "account" });
  });

  test("reports unknown when the signed-in user cannot be read", async () => {
    Auth.currentAuthenticatedUser.mockRejectedValue(new Error("The user is not authenticated"));

    const result = await checkSecurityStatus();

    expect(result).toEqual({ complete: false, scope: "account", unknown: true });
  });

  test("reports unknown when the MFA lookup fails", async () => {
    Auth.getPreferredMFA.mockRejectedValue(new Error("network error"));

    const result = await checkSecurityStatus();

    expect(result).toEqual({ complete: false, scope: "account", unknown: true });
  });
});

describe("checkOwnersStatus", () => {
  beforeEach(() => {
    listOwners.mockReset();
  });

  test("is complete when at least one owner is not archived", async () => {
    listOwners.mockResolvedValue([
      { id: "o1", status: "archived" },
      { id: "o2", status: "active" },
    ]);

    const result = await checkOwnersStatus();

    expect(result).toEqual({ complete: true, scope: "account" });
  });

  test("is not complete when the host has no owners", async () => {
    listOwners.mockResolvedValue([]);

    const result = await checkOwnersStatus();

    expect(result).toEqual({ complete: false, scope: "account" });
  });

  test("is not complete when every owner is archived", async () => {
    listOwners.mockResolvedValue([
      { id: "o1", status: "archived" },
      { id: "o2", status: "archived" },
    ]);

    const result = await checkOwnersStatus();

    expect(result).toEqual({ complete: false, scope: "account" });
  });

  test("reports unknown when the response is not a list", async () => {
    listOwners.mockResolvedValue({ owners: [] });

    const result = await checkOwnersStatus();

    expect(result).toEqual({ complete: false, scope: "account", unknown: true });
  });

  test("reports unknown when the owners request fails", async () => {
    listOwners.mockRejectedValue(new Error("network error"));

    const result = await checkOwnersStatus();

    expect(result).toEqual({ complete: false, scope: "account", unknown: true });
  });
});

describe("checkMessagingStatus", () => {
  beforeEach(() => {
    listAutomations.mockReset();
  });

  test("is complete when at least one automation is active", async () => {
    listAutomations.mockResolvedValue([
      { id: "a1", status: "DRAFT" },
      { id: "a2", status: "ACTIVE" },
    ]);

    const result = await checkMessagingStatus();

    expect(result).toEqual({ complete: true, scope: "account" });
  });

  test("is not complete when the host has no automations", async () => {
    listAutomations.mockResolvedValue([]);

    const result = await checkMessagingStatus();

    expect(result).toEqual({ complete: false, scope: "account" });
  });

  test("is not complete when every automation is still a draft", async () => {
    listAutomations.mockResolvedValue([
      { id: "a1", status: "DRAFT" },
      { id: "a2", status: "DRAFT" },
    ]);

    const result = await checkMessagingStatus();

    expect(result).toEqual({ complete: false, scope: "account" });
  });

  test("reports unknown when the response is not a list", async () => {
    listAutomations.mockResolvedValue(null);

    const result = await checkMessagingStatus();

    expect(result).toEqual({ complete: false, scope: "account", unknown: true });
  });

  test("reports unknown when the automations request fails", async () => {
    listAutomations.mockRejectedValue(new Error("network error"));

    const result = await checkMessagingStatus();

    expect(result).toEqual({ complete: false, scope: "account", unknown: true });
  });
});

describe("checkGoLiveStatus", () => {
  test.each([
    ["ACTIVE", { complete: true, pending: false, rejected: false }],
    ["pending_review", { complete: false, pending: true, rejected: false }],
    ["REJECTED", { complete: false, pending: false, rejected: true }],
    ["INACTIVE", { complete: false, pending: false, rejected: false }],
    [undefined, { complete: false, pending: false, rejected: false }],
  ])("reports %s", (status, expected) => {
    expect(checkGoLiveStatus({ status })).toMatchObject(expected);
  });

  test("handles a property that has not loaded yet", () => {
    expect(checkGoLiveStatus(null)).toMatchObject({ complete: false, pending: false, rejected: false });
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
