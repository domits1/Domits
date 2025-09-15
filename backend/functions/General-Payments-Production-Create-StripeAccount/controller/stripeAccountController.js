import responsejson from "../util/constant/responseheader.json" with { type: 'json' };
import StripeAccountService from "../business/service/stripeAccountService.js";
const responseHeaderJSON = responsejson;

class StripeAccountController {
  constructor() {
    this.stripeAccountService = new StripeAccountService();
  }

  // -----------
  // POST
  // -----------

  async create(event) {
    try {
      const body = JSON.parse(event.body);
      const response = await this.stripeAccountService.createStripeAccount(body);

      return {
        statusCode: response.statusCode || 200,
        headers: responseHeaderJSON,
        response: {
          message: response.message,
          url: response.url,
          details: response.details,
        },
      };
    } catch (error) {
      console.error(error);
      return {
        statusCode: 500,
        headers: responseHeaderJSON,
        message: error.message || "Something went wrong, please contact support.",
      };
    }
  }

  // -----------
  // GET/POST /status (read-only status)
  // -----------
  async read(event) {
    try {
      const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
      const cognitoUserId = body.cognitoUserId || body.sub || event.sub;

      if (!cognitoUserId) {
        return {
          statusCode: 400,
          headers: responseHeaderJSON,
          response: { message: "Missing required field: cognitoUserId (or sub)" },
        };
      }

      const response = await this.stripeAccountService.getStatusOfStripeAccount(cognitoUserId);

      return {
        statusCode: response.statusCode || 200,
        headers: responseHeaderJSON,
        response: {
          message: response.message,
          details: response.details,
        },
      };
    } catch (error) {
      console.error(error);
      return {
        statusCode: error.statusCode || 500,
        headers: responseHeaderJSON,
        response: { message: error.message || "Something went wrong, please contact support." },
      };
    }
  }
}
export default StripeAccountController;
