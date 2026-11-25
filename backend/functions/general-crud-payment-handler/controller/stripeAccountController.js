import responsejson from "../util/constant/responseHeader.json" with { type: 'json' };
import StripeAccountService from "../business/service/stripeAccountService.js";
import AuthManager from "../auth/authManager.js";

const responseHeaderJSON = responsejson;
const STRIPE_ACCOUNT_ERROR_CODES = new Set([
  "STRIPE_ACCOUNT_NOT_FOUND",
  "STRIPE_ACCOUNT_LOOKUP_FAILED",
  "STRIPE_ONBOARDING_LINK_FAILED",
]);

const getStripeAccountErrorCode = (error) =>
  STRIPE_ACCOUNT_ERROR_CODES.has(error?.code) ? error.code : null;

export default class StripeAccountController {
  constructor() {
    this.stripeAccountService = new StripeAccountService();
    this.authManager = new AuthManager();
  }

  // -----------
  // POST
  // -----------

  async create(event) {
    try {
      const response = await this.stripeAccountService.createStripeAccount(event);
      return {
        statusCode: response.statusCode || 200,
        headers: responseHeaderJSON,
        response: {
          message: response.message,
          details: response.details,
        },
      };
    } catch (error) {
      const code = getStripeAccountErrorCode(error);
      return {
        statusCode: error.statusCode || 500,
        headers: responseHeaderJSON,
        response: {
          message: error.message || "Something went wrong, please contact support.",
          ...(code ? { code } : {}),
        }
      };
    }
  }

  // -----------
  // GET
  // -----------
  async read(event) {
    try {
      const response = await this.stripeAccountService.getStatusOfStripeAccount(event);

      return {
        statusCode: response.statusCode || 200,
        headers: responseHeaderJSON,
        response: {
          message: response.message,
          details: response.details,
        },
      };
    } catch (error) {
      const code = getStripeAccountErrorCode(error);
      return {
        statusCode: error.statusCode || 500,
        headers: responseHeaderJSON,
        response: {
          message: error.message || "Something went wrong, please contact support.",
          ...(code ? { code } : {}),
        },
      };
    }
  }
}
