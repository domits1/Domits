import BookingService from "../business/bookingService.js";
import PaymentService from "../business/paymentService.js";
import Forbidden from "../util/exception/Forbidden.js";
import Unauthorized from "../util/exception/Unauthorized.js";
import NotFoundException from "../util/exception/NotFoundException.js";

import responsejson from "../util/const/responseheader.json" with { type: "json" };
const responseHeaderJSON = responsejson;

class ReservationController {
  constructor({ bookingService = new BookingService(), paymentService = new PaymentService() } = {}) {
    this.bookingService = bookingService;
    this.paymentSerivce = paymentService;
  }

  // POST

  async create(event) {
    try {
      const returnInfo = await this.bookingService.create(event.event);
      if (returnInfo.isInquiry) {
        return {
          statusCode: 201,
          headers: responseHeaderJSON,
          response: { bookingId: returnInfo.bookingId, status: "Inquiry" },
        };
      }
      const paymentData = await this.paymentSerivce.create(
        returnInfo.hostId,
        returnInfo.bookingId,
        returnInfo.propertyId,
        returnInfo.dates
      );
      return {
        statusCode: returnInfo.statusCode,
        headers: responseHeaderJSON,
        response:
          returnInfo.channexAvailabilitySync === undefined
            ? paymentData
            : { ...paymentData, channexAvailabilitySync: returnInfo.channexAvailabilitySync },
      };
    } catch (error) {
      console.error(error);
      return {
        statusCode: error.statusCode || 500,
        headers: responseHeaderJSON,
        message: error.message || "Something went wrong, please contact support.",
      };
    }
  }

  // PATCH

  async patch(event) {
    try {
      const cancelBookingId = this.getCancelBookingId(event);
      if (cancelBookingId) {
        return await this.cancelBooking(cancelBookingId, event);
      }

      const body = this.getPatchBody(event);
      const authToken = event?.headers?.Authorization ?? event?.headers?.authorization;
      const actionResponse = await this.handlePatchAction(body, event, authToken);

      return actionResponse || await this.handlePaymentPatch(body);
    } catch (error) {
      console.error(error);
      return {
        statusCode: error.statusCode || 500,
        headers: responseHeaderJSON,
        response: error.message || "Something went wrong, please contact support.",
      };
    }
  }

  getPatchBody(event) {
    if (event?.body === undefined || event?.body === null) {
      throw new Error("Missing request body.");
    }

    return typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  }

  requirePatchField(body, fieldName) {
    if (!body?.[fieldName]) throw new Error(`Missing ${fieldName}.`);
    return body[fieldName];
  }

  async handleModifyBookingDatesAction(body, authToken) {
    const result = await this.bookingService.modifyBookingDates(
      this.requirePatchField(body, "bookingId"),
      this.requirePatchField(body, "arrivalDate"),
      this.requirePatchField(body, "departureDate"),
      authToken
    );
    return { statusCode: 200, headers: responseHeaderJSON, response: result };
  }

  async handlePatchAction(body, event, authToken) {
    if (body?.action === "cancel-booking") {
      if (!body?.bookingId) throw new Error("Missing bookingId.");
      return await this.cancelBooking(body.bookingId, event);
    }

    if (body?.action === "decline-inquiry") {
      if (!body?.bookingId) throw new Error("Missing bookingId.");
      const result = await this.bookingService.declineInquiry(body.bookingId, authToken);
      return { statusCode: 200, headers: responseHeaderJSON, response: result };
    }

    if (body?.action === "accept-inquiry") {
      if (!body?.bookingId) throw new Error("Missing bookingId.");
      return await this.acceptInquiry(body.bookingId, authToken);
    }

    if (body?.action === "modify-booking-dates") {
      return await this.handleModifyBookingDatesAction(body, authToken);
    }

    return null;
  }

  async acceptInquiry(bookingId, authToken) {
    const result = await this.bookingService.acceptInquiry(bookingId, authToken);
    try {
      const paymentData = await this.paymentSerivce.create(
        result.hostId,
        result.bookingId,
        result.propertyId,
        result.dates
      );
      return {
        statusCode: 200,
        headers: responseHeaderJSON,
        response: { ...result, stripeClientSecret: paymentData.stripeClientSecret },
      };
    } catch (stripeError) {
      console.error("Stripe payment intent creation failed after accept:", stripeError);
      return { statusCode: 200, headers: responseHeaderJSON, response: result };
    }
  }

  async handlePaymentPatch(body) {
    if (!body?.paymentid) {
      throw new Error("Missing paymentid.");
    }

    const confirmed = body?.failedpayment
      ? await this.bookingService.failPayment(body.paymentid)
      : await this.bookingService.confirmPayment(body.paymentid);

    return {
      statusCode: 200,
      headers: responseHeaderJSON,
      response: {
        paymentConfirmed: confirmed,
      },
    };
  }

  getCancelBookingId(event) {
    const pathBookingId = event?.pathParameters?.id ?? event?.pathParameters?.bookingId;
    const path = event?.rawPath || event?.path || event?.resource || "";
    const pathParts = path.split("/").filter(Boolean);
    const bookingsIndex = pathParts.indexOf("bookings");
    const hasBookingsRoute = bookingsIndex !== -1;
    const routeBookingId = hasBookingsRoute ? pathParts[bookingsIndex + 1] : "";
    const routeAction = hasBookingsRoute ? pathParts[bookingsIndex + 2] : "";

    if (pathBookingId && (routeAction === "cancel" || path.endsWith("/cancel"))) {
      return pathBookingId;
    }

    if (routeBookingId && routeAction === "cancel") {
      return routeBookingId;
    }

    return "";
  }

  async cancelBooking(bookingId, event) {
    const authToken = event?.headers?.Authorization ?? event?.headers?.authorization;

    if (!authToken) {
      throw new Unauthorized("Missing Authorization header.");
    }

    const user = await this.bookingService.authManager.authenticateUser(authToken);
    const bookingResult = await this.bookingService.reservationRepository.getBookingById(bookingId);
    if (!bookingResult?.response) {
      throw new NotFoundException("Booking not found.");
    }
    const booking = bookingResult.response;
    if (booking.guestid !== user.sub) {
      throw new Forbidden("Only the guest of this booking may cancel this booking.");
    }

    const canceled = await this.bookingService.reservationRepository.cancelBookingByGuest(bookingId, user.sub);

    await this.bookingService.priceLabsBookingNotifier.notifyBookingChange(booking.hostid, "booking_cancelled");

    return {
      statusCode: canceled.statusCode || 200,
      headers: responseHeaderJSON,
      response: canceled.response,
    };
  }

  // GET

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
        headers: responseHeaderJSON,
        message: error.message || "Something went wrong, please contact support.",
        response: error.response || "",
      };
    }
  }
}
export default ReservationController;
