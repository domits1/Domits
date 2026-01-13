import responsejson from "../util/constant/responseHeader.json" with { type: 'json' };
import StripePayoutsService from "../business/service/stripePayoutsService.js";
import FaqService from "../business/service/faqService.js";

const responseHeaderJSON = responsejson;

export default class StripePayoutsController {
  constructor() {
    this.stripePayoutService = new StripePayoutsService();
    this.faqService = new FaqService();
  }

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

  async setPayoutSchedule(event) {
    try {
      const response = await this.stripePayoutService.setPayoutSchedule(event);

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

  async getPayoutSchedule(event) {
    try {
      const response = await this.stripePayoutService.getPayoutSchedule(event);

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

    async getHostBankAccount(event) {
    try {
      const response = await this.stripePayoutService.getHostBankAccount(event);

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

  async getFinanceFaqs(event) {
    try {
      const response = await this.faqService.getFinanceFaqs(event);

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
