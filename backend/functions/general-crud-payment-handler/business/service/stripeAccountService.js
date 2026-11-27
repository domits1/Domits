import Stripe from "stripe";
import { randomUUID } from "node:crypto";

import StripeAccountRepository from "../../data/stripeAccountRepository.js";
import AuthManager from "../../auth/authManager.js";
import { NotFoundException } from "../../util/exception/NotFoundException.js";
import { BadRequestException } from "../../util/exception/badRequestException.js";

const getAuth = (event) =>  event.headers.Authorization;
const unixNow = () => Math.floor(Date.now() / 1000);

const createStripeRequestError = (error, operation) => {
  const accountMissing = error?.code === "resource_missing";
  let statusCode = 502;
  let code = "STRIPE_ONBOARDING_LINK_FAILED";
  let message = "We couldn't create a Stripe access link. Please try again. If the problem continues, contact Domits support.";

  if (accountMissing) {
    statusCode = 409;
    code = "STRIPE_ACCOUNT_NOT_FOUND";
    message = "The saved Stripe account could not be found in this Stripe platform. Please contact Domits support before reconnecting.";
  } else if (operation === "account_lookup") {
    code = "STRIPE_ACCOUNT_LOOKUP_FAILED";
    message = "We couldn't verify your saved Stripe connection. Please try again. If the problem continues, contact Domits support.";
  }

  if (!accountMissing && error?.statusCode >= 500) {
    statusCode = 503;
  }

  console.error("Stripe connected account request failed.", {
    operation,
    errorType: error?.type,
    errorCode: error?.code,
    statusCode: error?.statusCode,
    requestId: error?.requestId,
  });

  const requestError = new Error(message);
  requestError.name = "StripeAccountRequestError";
  requestError.statusCode = statusCode;
  requestError.code = code;
  requestError.cause = error;
  return requestError;
};

export default class StripeAccountService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.refreshUrl = process.env.REFRESH_URL;
    this.returnUrl = process.env.RETURN_URL;
    this.authManager = new AuthManager();
    this.stripeAccountRepository = new StripeAccountRepository();
  }

  async createOnboardingLink(accountId) {
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: this.refreshUrl,
      return_url: this.returnUrl,
      type: "account_onboarding",
    });
    return link.url;
  }

  async createStripeAccount(event) {
    const token = getAuth(event);
    const { 
      email: userEmail,
       sub: cognitoUserId 
      } = await this.authManager.authenticateUser(token);

    if (!cognitoUserId) {
      throw new BadRequestException("Missing required field: cognitoUserId");
    }

    const stripeAccount = await this.stripeAccountRepository.getExistingStripeAccount(cognitoUserId);

    if (stripeAccount?.account_id) {
      const details = await this.buildStatusForStripeAccount(stripeAccount.account_id);
      const message = details.onboardingComplete
        ? "Existing Stripe account found. Redirecting to Stripe Express Dashboard."
        : "Existing Stripe account found. Redirecting to Stripe onboarding.";

      return { statusCode: 200, message, details };
    }

    if (!userEmail) {
      throw new BadRequestException("Missing required field: userEmail");
    }

    const account = await this.stripe.accounts.create({
      type: "express",
      email: userEmail,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    });

    await this.stripeAccountRepository.insertStripeAccount(
      randomUUID(),
      account.id,
      cognitoUserId,
      unixNow(),
      unixNow()
    );

    let onboardingUrl;
    try {
      onboardingUrl = await this.createOnboardingLink(account.id);
    } catch (error) {
      throw createStripeRequestError(error, "onboarding_link");
    }

    return {
      statusCode: 202,
      message: "New account created, redirecting to Stripe onboarding.",
      details: {
        accountId: account.id,
        onboardingUrl: onboardingUrl,
      },
    };
  }

  async createLoginLinkOrOnboarding(accountId) {
    try {
      const login = await this.stripe.accounts.createLoginLink(accountId);
      return { loginLinkUrl: login.url, onboardingUrl: null };
    } catch {
      const onboardingUrl = await this.createOnboardingLink(accountId);
      return { loginLinkUrl: null, onboardingUrl };
    }
  }

  async getStatusOfStripeAccount(event) {
    const token = getAuth(event);
    const { sub: cognitoUserId } = await this.authManager.authenticateUser(token);

    if (!cognitoUserId) {
      throw new BadRequestException("Missing required field: cognitoUserId");
    }

    const stripeAccount = await this.stripeAccountRepository.getExistingStripeAccount(cognitoUserId);

    if (!stripeAccount?.account_id) {
      throw new NotFoundException("No Stripe account has been found, please create one first.");
    }

    const details = await this.buildStatusForStripeAccount(stripeAccount.account_id);
    const message = details.onboardingComplete
      ? "Account onboarded. Redirecting to Stripe Express Dashboard."
      : "Onboarding not complete. Redirecting to Stripe onboarding.";

    return { statusCode: 200, message, details };
  }

  async buildStatusForStripeAccount(accountId) {
    let onboardingComplete = false;
    let chargesEnabled = false;
    let payoutsEnabled = false;
    let bankDetailsProvided = false;
    let loginLinkUrl = null;
    let onboardingUrl = null;

    let account;
    try {
      account = await this.stripe.accounts.retrieve(accountId);
    } catch (error) {
      throw createStripeRequestError(error, "account_lookup");
    }

    onboardingComplete = account.details_submitted;
    chargesEnabled = account.charges_enabled;
    payoutsEnabled = account.payouts_enabled;
    bankDetailsProvided = (account.external_accounts?.data?.length || 0) > 0;

    try {
      if (!onboardingComplete) {
        onboardingUrl = await this.createOnboardingLink(accountId);
      } else {
        const links = await this.createLoginLinkOrOnboarding(accountId);
        loginLinkUrl = links.loginLinkUrl;
        onboardingUrl = links.onboardingUrl;
      }
    } catch (error) {
      throw createStripeRequestError(error, "onboarding_link");
    }

    return {
      accountId,
      onboardingUrl,
      loginLinkUrl,
      bankDetailsProvided,
      onboardingComplete,
      chargesEnabled,
      payoutsEnabled,
    };
  }
}
