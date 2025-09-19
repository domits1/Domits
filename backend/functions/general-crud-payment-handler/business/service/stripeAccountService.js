import Stripe from "stripe";
import { randomUUID } from "crypto";

import StripeAccountRepository from "../../data/stripeAccountRepository.js";
import AuthManager from "../../auth/authManager.js";
import { NotFoundException } from "../../util/exception/NotFoundException.js";
import { BadRequestException } from "../../util/exception/badRequestException.js";
import { ConflictException } from "../../util/exception/conflictException.js";

const getAuth = (event) =>  event.headers.Authorization;
const unixNow = () => Math.floor(Date.now() / 1000);

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

    if (!userEmail || !cognitoUserId) {
      throw new BadRequestException("Missing required fields: userEmail or cognitoUserId");
    }

    const stripeAccount = await this.stripeAccountRepository.getExistingStripeAccount(cognitoUserId);

    if (stripeAccount?.account_id) {
      throw new ConflictException("Stripe account already exists", { accountId: stripeAccount.account_id });
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

    const onboardingUrl = await this.createOnboardingLink(account.id);

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

    try {
      const account = await this.stripe.accounts.retrieve(accountId);

      onboardingComplete = account.details_submitted;
      chargesEnabled = account.charges_enabled;
      payoutsEnabled = account.payouts_enabled;
      bankDetailsProvided = (account.external_accounts?.data?.length || 0) > 0;

      if (!onboardingComplete) {
        onboardingUrl = await this.createOnboardingLink(accountId);
      } else {
        const links = await this.createLoginLinkOrOnboarding(accountId);
        loginLinkUrl = links.loginLinkUrl;
        onboardingUrl = links.onboardingUrl;
      }
    } catch (error) {
      throw new NotFoundException("Stripe account could not be retrieved, please contact support.");
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
