import BookingService from "../business/bookingService.js";
import PaymentService from "../business/paymentService.js";

import responsejson from "../util/const/responseheader.json" with { type: "json" };
const responseHeaderJSON = responsejson;

class ReservationController {
  constructor() {
    this.bookingService = new BookingService();
    this.paymentSerivce = new PaymentService();
  }
  // -----------
  // POST
  // -----------

  async create(event) {
    try {
      // 1) Create booking with transactional overlap check
      const bookingInfo = await this.bookingService.create(event.event);

      let paymentData;

      try {
        // 2) Stripe/payment logic AFTER booking transaction commit
        paymentData = await this.paymentSerivce.create(
          bookingInfo.hostId,
          bookingInfo.bookingId,
          bookingInfo.propertyId,
          bookingInfo.dates
        );
      } catch (paymentError) {
        // On Stripe failure: mark booking as Failed in a short DB transaction
        try {
          await this.bookingService.markBookingFailedById(bookingInfo.bookingId);
        } catch (markError) {
          console.error("Failed to mark booking as Failed after payment error:", markError);
        }

        paymentError.statusCode = paymentError.statusCode || 500;
        throw paymentError;
      }

      return {
        statusCode: bookingInfo.statusCode,
        headers: responseHeaderJSON,
        response: paymentData,
      };
    } catch (error) {
      console.error(error);
      return {
        statusCode: error.statusCode || 500,
        headers: responseHeaderJSON,
        response: {
          message: error.message || "Something went wrong, please contact support.",
        },
      };
    }
  }

  // -----------
  // PATCH
  // -----------
  async patch(event) {
    try {
      // Safely parse body
      let body = {};
      if (event?.body) {
        if (typeof event.body === "string") {
          try {
            body = JSON.parse(event.body);
          } catch (parseError) {
            throw new Error("Invalid JSON in request body");
          }
        } else if (typeof event.body === "object") {
          body = event.body;
        }
      }

      let confirmed;
      if (body?.failedpayment) {
        confirmed = await this.bookingService.failPayment(body.paymentid);
      } else {
        confirmed = await this.bookingService.confirmPayment(body.paymentid);
      }
      return {
        statusCode: 200,
        headers: responseHeaderJSON,
        response: {
          paymentConfirmed: confirmed,
        },
      };
    } catch (error) {
      console.error(error);
      return {
        statusCode: error.statusCode || 500,
        response: error.message || "Something went wrong, please contact support.",
      };
    }
  }

  // -----------
  // GET
  // -----------

  async read(event) {
    try {
      const returnInfo = await this.bookingService.read(event);
      return {
        statusCode: returnInfo.statusCode || 209,
        headers: responseHeaderJSON,
        response: returnInfo.response,
      };
    } catch (error) {
      console.error(error);
      return {
        statusCode: error.statusCode || 500,
        message: error.message || "Something went wrong, please contact support.",
        response: error.response || "",
      };
    }
  }
}
export default ReservationController;