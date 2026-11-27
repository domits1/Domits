import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import StripeAccountService from "../../functions/general-crud-payment-handler/business/service/stripeAccountService.js";

const ACCOUNT_ID = "acct_existing";
const COGNITO_USER_ID = "cognito-host-1";
const EVENT = { headers: { Authorization: "access-token" } };

const buildService = ({
  existingAccount = null,
  account = {
    details_submitted: false,
    charges_enabled: false,
    payouts_enabled: false,
    external_accounts: { data: [] },
  },
  retrieveError = null,
  loginLinkError = null,
  onboardingLinkError = null,
} = {}) => {
  const service = new StripeAccountService();
  const stripe = {
    accounts: {
      retrieve: jest.fn(async () => {
        if (retrieveError) throw retrieveError;
        return account;
      }),
      create: jest.fn(async () => ({ id: "acct_new" })),
      createLoginLink: jest.fn(async () => {
        if (loginLinkError) throw loginLinkError;
        return { url: "https://stripe.example/login" };
      }),
    },
    accountLinks: {
      create: jest.fn(async () => {
        if (onboardingLinkError) throw onboardingLinkError;
        return { url: "https://stripe.example/onboarding" };
      }),
    },
  };
  const repository = {
    getExistingStripeAccount: jest.fn(async () => existingAccount),
    insertStripeAccount: jest.fn(async () => {}),
    replaceStripeAccount: jest.fn(async () => {}),
  };

  service.stripe = stripe;
  service.authManager = {
    authenticateUser: jest.fn(async () => ({
      email: "host@example.com",
      sub: COGNITO_USER_ID,
    })),
  };
  service.stripeAccountRepository = repository;

  return { service, stripe, repository };
};

describe("StripeAccountService.createStripeAccount", () => {
  let consoleError;

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("reuses an existing account and creates a fresh onboarding link instead of returning 409", async () => {
    const { service, stripe, repository } = buildService({
      existingAccount: { account_id: ACCOUNT_ID },
    });

    const result = await service.createStripeAccount(EVENT);

    expect(result.statusCode).toBe(200);
    expect(result.details).toMatchObject({
      accountId: ACCOUNT_ID,
      onboardingUrl: "https://stripe.example/onboarding",
      onboardingComplete: false,
    });
    expect(stripe.accounts.retrieve).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(stripe.accounts.create).not.toHaveBeenCalled();
    expect(repository.insertStripeAccount).not.toHaveBeenCalled();
  });

  it("does not require the current Cognito email when reusing an existing account", async () => {
    const { service, stripe } = buildService({
      existingAccount: { account_id: ACCOUNT_ID },
    });
    service.authManager.authenticateUser.mockResolvedValue({
      sub: COGNITO_USER_ID,
    });

    const result = await service.createStripeAccount(EVENT);

    expect(result.statusCode).toBe(200);
    expect(stripe.accounts.create).not.toHaveBeenCalled();
  });

  it("falls back to a fresh onboarding link when an existing account cannot create a login link", async () => {
    const { service, stripe } = buildService({
      existingAccount: { account_id: ACCOUNT_ID },
      account: {
        details_submitted: true,
        charges_enabled: false,
        payouts_enabled: false,
        external_accounts: { data: [] },
      },
      loginLinkError: new Error("Account onboarding is not complete"),
    });

    const result = await service.createStripeAccount(EVENT);

    expect(result.statusCode).toBe(200);
    expect(result.details.loginLinkUrl).toBeNull();
    expect(result.details.onboardingUrl).toBe("https://stripe.example/onboarding");
    expect(stripe.accounts.create).not.toHaveBeenCalled();
  });

  it("replaces a legacy saved account when Stripe confirms it no longer exists on this platform", async () => {
    const missingAccount = Object.assign(new Error("No such account"), {
      type: "StripeInvalidRequestError",
      code: "resource_missing",
      statusCode: 404,
      requestId: "req_missing",
    });
    const { service, stripe, repository } = buildService({
      existingAccount: { account_id: ACCOUNT_ID },
      retrieveError: missingAccount,
    });

    const result = await service.createStripeAccount(EVENT);

    expect(result.statusCode).toBe(202);
    expect(result.details).toMatchObject({
      accountId: "acct_new",
      onboardingUrl: "https://stripe.example/onboarding",
    });
    expect(stripe.accounts.create).toHaveBeenCalledTimes(1);
    expect(repository.replaceStripeAccount).toHaveBeenCalledWith(
      COGNITO_USER_ID,
      "acct_new",
      expect.any(Number)
    );
    expect(repository.insertStripeAccount).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "Stripe connected account request failed.",
      expect.objectContaining({
        operation: "account_lookup",
        errorCode: "resource_missing",
        requestId: "req_missing",
      })
    );
  });

  it("replaces a legacy saved account when Stripe rejects it as invalid for the current platform", async () => {
    const invalidAccount = Object.assign(new Error("The account is invalid for this platform"), {
      type: "StripePermissionError",
      code: "account_invalid",
      statusCode: 403,
      requestId: "req_invalid",
    });
    const { service, stripe, repository } = buildService({
      existingAccount: { account_id: ACCOUNT_ID },
      retrieveError: invalidAccount,
    });

    const result = await service.createStripeAccount(EVENT);

    expect(result.statusCode).toBe(202);
    expect(result.details).toMatchObject({
      accountId: "acct_new",
      onboardingUrl: "https://stripe.example/onboarding",
    });
    expect(stripe.accounts.create).toHaveBeenCalledTimes(1);
    expect(repository.replaceStripeAccount).toHaveBeenCalledWith(
      COGNITO_USER_ID,
      "acct_new",
      expect.any(Number)
    );
    expect(repository.insertStripeAccount).not.toHaveBeenCalled();
  });

  it("preserves Stripe service failures as temporary lookup errors instead of 404", async () => {
    const stripeUnavailable = Object.assign(new Error("Stripe unavailable"), {
      type: "StripeConnectionError",
      statusCode: 503,
      requestId: "req_unavailable",
    });
    const { service } = buildService({
      existingAccount: { account_id: ACCOUNT_ID },
      retrieveError: stripeUnavailable,
    });

    const error = await service.createStripeAccount(EVENT).catch((failure) => failure);

    expect(error).toMatchObject({
      statusCode: 503,
      code: "STRIPE_ACCOUNT_LOOKUP_FAILED",
    });
  });

  it("returns a typed link failure after storing a newly created account", async () => {
    const stripeFailure = Object.assign(new Error("Stripe link failed"), {
      type: "StripeAPIError",
      statusCode: 400,
      requestId: "req_link",
    });
    const { service, repository } = buildService({ onboardingLinkError: stripeFailure });

    const error = await service.createStripeAccount(EVENT).catch((failure) => failure);

    expect(error).toMatchObject({
      statusCode: 502,
      code: "STRIPE_ONBOARDING_LINK_FAILED",
    });
    expect(repository.insertStripeAccount).toHaveBeenCalledTimes(1);
  });

  it("creates and stores a new account only when no saved account exists", async () => {
    const { service, stripe, repository } = buildService();

    const result = await service.createStripeAccount(EVENT);

    expect(result.statusCode).toBe(202);
    expect(result.details).toMatchObject({
      accountId: "acct_new",
      onboardingUrl: "https://stripe.example/onboarding",
    });
    expect(stripe.accounts.create).toHaveBeenCalledWith({
      type: "express",
      email: "host@example.com",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    expect(repository.insertStripeAccount).toHaveBeenCalledWith(
      expect.any(String),
      "acct_new",
      COGNITO_USER_ID,
      expect.any(Number),
      expect.any(Number)
    );
  });
});
