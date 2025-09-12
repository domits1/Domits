import stripeAccountRepository from "../../data/stripeAccountRepository.js";
import Stripe from "stripe";
import { randomUUID } from "crypto";

class StripeAccountService {
  constructor() {
    this.stripeAccountRepository = new stripeAccountRepository();
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  async createStripeAccount(event) {
    const userEmail = event.userEmail;
    const cognitoUserId = event.cognitoUserId;
    const refreshUrl = event.refreshUrl || "https://domits.com/";
    const returnUrl = event.returnUrl || "https://domits.com/login";

    if (!userEmail || !cognitoUserId) {
      throw new Error("Missing required fields: userEmail or cognitoUserId");
    }

    try {
      const stripeAccount = await this.stripeAccountRepository.getExistingStripeAccount(cognitoUserId);

      if (stripeAccount) {
        console.log("Stripe account exists. Creating account link...");
        const accountLink = await this.stripe.accountLinks.create({
          account: stripeAccount.account_id,
          refresh_url: refreshUrl,
          return_url: returnUrl,
          type: "account_onboarding",
        });
        console.log("Account link created:", accountLink.url);
        return {
          statusCode: 200,
          message: "Account already exists, redirecting to Stripe onboarding.",
          url: accountLink.url,
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
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      });

      console.log("Account link for new account created:", accountLink.url);
      return {
        statusCode: 200,
        message: "New account created, redirecting to Stripe onboarding.",
        url: accountLink.url,
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
}

export default StripeAccountService;
