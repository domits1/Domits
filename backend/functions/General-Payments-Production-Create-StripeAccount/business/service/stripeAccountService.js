import stripeAccountRepository from "../../data/stripeAccountRepository.js";
import Stripe from "stripe";
import { randomUUID } from "crypto";

class StripeAccountService {
  constructor() {
    this.stripeAccountRepository = new stripeAccountRepository();
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.refreshUrl = process.env.REFRESH_URL;
    this.returnUrl = process.env.RETURN_URL;
  }

  async createStripeAccount(event) {
    const { userEmail, cognitoUserId } = event;

    if (!userEmail || !cognitoUserId) {
      return { statusCode: 400, message: "Missing required fields: userEmail or cognitoUserId" };
    }

    try {
      const stripeAccount = await this.stripeAccountRepository.getExistingStripeAccount(cognitoUserId);

      if (stripeAccount?.account_id) {
        const status = await this.buildStatusForStripeAccount(stripeAccount.account_id, this.refreshUrl, this.returnUrl);

        return {
          statusCode: 200,
          message: status.onboardingComplete
            ? "Account onboarded. Redirecting to Stripe Express Dashboard."
            : "Onboarding not complete. Redirecting to Stripe onboarding.",
          details: status,
        };
      }

      console.log("Creating a new Stripe account...");
      const account = await this.stripe.accounts.create({
        type: "express",
        email: userEmail,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      const id = randomUUID();
      const currentTime = Date.now();

      await this.stripeAccountRepository.insertStripeAccount(id, account.id, cognitoUserId, currentTime, currentTime);

      const accountLink = await this.stripe.accountLinks.create({
        account: account.id,
        refresh_url: this.refreshUrl,
        return_url: this.returnUrl,
        type: "account_onboarding",
      });

      console.log("New Stripe account", account);

      return {
        statusCode: 200,
        message: "New account created, redirecting to Stripe onboarding.",
        details: {
          hasStripeAccount: true,
          accountId: account.id,
          onboardingUrl: accountLink.url,
          loginLinkUrl: null,
          bankDetailsProvided: false,
          onboardingComplete: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          readyForPayments: false,
        },
      };
    } catch (error) {
      console.error("Error in createStripeAccount:", error);
      return {
        statusCode: 500,
        message: "Error creating Stripe account or writing to database",
        error: error.message,
      };
    }
  }

  async getStatusOfStripeAccount(cognitoUserId) {

    try {
      const stripeAccount = await this.stripeAccountRepository.getExistingStripeAccount(cognitoUserId);

      if (!stripeAccount?.account_id) {
        return {
          statusCode: 404,
          message: "No Stripe account has been found, please create one",
          stripeAccount: stripeAccount,
          details: {
            hasStripeAccount: false,
            accountId: null,
            onboardingUrl: null,
            loginLinkUrl: null,
            bankDetailsProvided: false,
            onboardingComplete: false,
            chargesEnabled: false,
            payoutsEnabled: false,
            readyForPayments: false,
          },
        };
      }

      const details = await this.buildStatusForStripeAccount(stripeAccount.account_id, this.refreshUrl, this.returnUrl);
      const message = details.onboardingComplete
        ? "Account onboarded. Redirecting to Stripe Express Dashboard."
        : "Onboarding not complete. Redirecting to Stripe onboarding.";

      return { statusCode: 200, message, details };
    } catch (error) {
      console.error("Error in readStripeAccount:", error);
      return { statusCode: 500, message: "Error reading Stripe account status", error: error.message };
    }
  }

  async buildStatusForStripeAccount(accountId, refreshUrl, returnUrl) {
    let onboardingComplete = false;
    let chargesEnabled = false;
    let payoutsEnabled = false;
    let bankDetailsProvided = false;
    let loginLinkUrl = null;
    let onboardingUrl = null;

    try {
      const account = await this.stripe.accounts.retrieve(accountId);
      
      onboardingComplete = account.details_submitted === true;
      chargesEnabled = account.charges_enabled === true;
      payoutsEnabled = account.payouts_enabled === true;
      bankDetailsProvided = (account.external_accounts?.data?.length || 0) > 0;

      if (!onboardingComplete) {
        const link = await this.stripe.accountLinks.create({
          account: accountId,
          refresh_url: refreshUrl,
          return_url: returnUrl,
          type: "account_onboarding",
        });
        onboardingUrl = link.url;
      } else {
        try {
          const login = await this.stripe.accounts.createLoginLink(accountId);
          loginLinkUrl = login.url;
        } catch (e) {
          console.error("Could not create login link:", e.message);
          const link = await this.stripe.accountLinks.create({
            account: accountId,
            refresh_url: refreshUrl,
            return_url: returnUrl,
            type: "account_onboarding",
          });
          onboardingUrl = link.url;
        }
      }
    } catch (e) {
      console.error("Could not retrieve Stripe account:", e.message);
    }

    return {
      hasStripeAccount: true,
      accountId,
      onboardingUrl,
      loginLinkUrl,
      bankDetailsProvided,
      onboardingComplete,
      chargesEnabled,
      payoutsEnabled,
      readyForPayments: chargesEnabled && payoutsEnabled && bankDetailsProvided,
    };
  }
}

export default StripeAccountService;
