import responsejson from "../util/constant/responseHeader.json" with { type: 'json' };
import StripePayoutsService from "../business/service/stripePayoutsService.js";

const responseHeaderJSON = responsejson;

export default class StripePayoutsController {
  constructor() {
    this.stripePayoutService = new StripePayoutsService();
  }

  // ----------- GET -----------
  async getHostCharges(event) {
    try {
      const response = await this.stripePayoutService.getHostCharges(event);

      return {
        statusCode: response.statusCode || 200,
        headers: responseHeaderJSON,
        response: {
          message: response.message,
          details: response.details,
        },
      };
    } catch (error) {
      return {
        statusCode: error.statusCode || 500,
        headers: responseHeaderJSON,
        response: { 
          message: error.message || "Something went wrong, please contact support." 
        },
      };
    }
  }

  async getHostPayouts(event) {
    try {
      const response = await this.stripePayoutService.getHostPayouts(event);

      return {
        statusCode: response.statusCode || 200,
        headers: responseHeaderJSON,
        response: {
          message: response.message,
          details: response.details,
        },
      };
    } catch (error) {
      return {
        statusCode: error.statusCode || 500,
        headers: responseHeaderJSON,
        response: { 
          message: error.message || "Something went wrong, please contact support." 
        },
      };
    }
  }

  async getHostBalance(event) {
    try {
      const response = await this.stripePayoutService.getHostBalance(event);

      return {
        statusCode: response.statusCode || 200,
        headers: responseHeaderJSON,
        response: {
          message: response.message,
          details: response.details,
        },
      };
    } catch (error) {
      return {
        statusCode: error.statusCode || 500,
        headers: responseHeaderJSON,
        response: { 
          message: error.message || "Something went wrong, please contact support." 
        },
      };
    }
  }

    async getHostPendingAmount(event) {
    try {
      const response = await this.stripePayoutService.getHostPendingAmount(event);

      return {
        statusCode: response.statusCode || 200,
        headers: responseHeaderJSON,
        response: {
          message: response.message,
          details: response.details,
        },
      };
    } catch (error) {
      return {
        statusCode: error.statusCode || 500,
        headers: responseHeaderJSON,
        response: { 
          message: error.message || "Something went wrong, please contact support." 
        },
      };
    }
  }
}
