import GeneralModel from "./model/generalModel.js";
import IdentifierModel from "./model/identifierModel.js";
import GetParamsModel from "./model/getParamsModel.js";
import AuthManager from "../auth/authManager.js";
import sendEmail from "./sendEmail.js";
import Forbidden from "../util/exception/Forbidden.js";
import TypeException from "../util/exception/TypeException.js";
import NotFoundException from "../util/exception/NotFoundException.js";
import ReservationRepository from "../data/reservationRepository.js";
import StripeRepository from "../data/stripeRepository.js";
import CognitoRepository from "../data/cognitoRepository.js";
import PropertyRepository from "../data/propertyRepository.js";
import getHostEmailById from "./getHostEmailById.js";
import ConflictException from "../util/exception/ConflictException.js";

/**
 * Concurrency Note:
 * This implementation prevents most double-bookings via a transactional overlap check
 * in ReservationRepository.addBookingToTable (one DB transaction per booking create).
 *
 * A small race condition window remains under extreme concurrency where two transactions
 * can both evaluate the overlap query before either commits.
 *
 * Future hardening: Add a PostgreSQL exclusion constraint (e.g. using GIST + tstzrange
 * on (property_id, [arrivaldate, departuredate))) so the database rejects overlapping
 * inserts, and map that constraint error back to HTTP 409.
 */

class BookingService {
  constructor() {
    this.reservationRepository = new ReservationRepository();
    this.stripeRepository = new StripeRepository();
    this.cognitoRepository = new CognitoRepository();
    this.propertyRepository = new PropertyRepository();
    this.authManager = new AuthManager();
    this.getParamsModel = new GetParamsModel();
  }

  /**
   * Booking create flow:
   * 1) Auth guest (Cognito)
   * 2) Fetch property + host
   * 3) Send email
   * 4) Create booking (transactional + overlap check)
   * 5) Create Stripe payment intent (outside DB transaction)
   * 6) On Stripe success: status updated later via PATCH/confirmPayment
   *    On Stripe immediate failure: booking can be marked Failed via markBookingFailedById
   */
  async create(event) {
    //await this.verifyEventDataTypes(event);

    // 1) Authenticate user
    const authenticatedUser = await this.authManager.authenticateUser(event.Authorization);
    const userEmail = authenticatedUser.email;

    // 2) Fetch property and host email
    const fetchedProperty = await this.propertyRepository.getPropertyById(event.identifiers.property_Id);
    const hostEmail = await getHostEmailById(fetchedProperty.hostId);

    // 3) Send email (pre-booking info)
    const bookingInfo = {
      guests: event.general.guests,
      propertyName: fetchedProperty.title,
      arriveDate: event.general.arrivalDate,
      departureDate: event.general.departureDate,
    };
    await sendEmail(userEmail, hostEmail, bookingInfo);

    // 4) Transactional booking create with overlap check
    //    This will throw ConflictException on overlap (statusCode 409).
    const bookingResult = await this.reservationRepository.addBookingToTable(
      event,
      authenticatedUser.sub,
      fetchedProperty.hostId
    );

    // Stripe/payment logic is orchestrated in the controller (PaymentService)
    // to keep it clearly outside the DB transaction. We still provide a helper
    // to mark a booking as Failed by ID if an immediate Stripe error occurs.

    return bookingResult;
  }

  async confirmPayment(paymentid) {
    const booking = await this.reservationRepository.getBookingByPaymentId(paymentid);
    if (booking.status === "Paid") {
      return true;
    }
    const paymentIntent = await this.stripeRepository.getPaymentIntentByPaymentId(paymentid);
    if (paymentIntent.status === "succeeded") {
      await this.reservationRepository.updateBookingStatus(booking.id, "Paid");
      return true;
    } else {
      return false;
    }
  }

  async failPayment(paymentid) {
    const booking = await this.reservationRepository.getBookingByPaymentId(paymentid);
    if (booking.status === "Awaiting Payment") {
      await this.reservationRepository.updateBookingStatus(booking.id, "Failed");
      return true;
    }
  }

  /**
   * Mark booking as Failed by booking ID (used when Stripe create call fails immediately).
   */
  async markBookingFailedById(bookingId) {
    if (!bookingId) {
      throw new TypeException("markBookingFailedById - bookingId is required");
    }
    await this.reservationRepository.updateBookingStatus(bookingId, "Failed");
  }

  async read(event) {
    let authToken;
    await this.verifyQueryDataTypes(event);
    switch (event.event.readType) {
      case "property": {
        return { response: "Removed readtype due to security flaws.", statusCode: 501 };
      }
      case "guest": {
        authToken = await this.authManager.authenticateUser(event.Authorization);
        return await this.reservationRepository.readByGuestId(authToken.sub);
      }

      case "createdAt": {
        return await this.reservationRepository.readByDate(event.event.createdAt, event.event.property_Id);
      }
      case "paymentId": {
        await this.authManager.authenticateUser(event.Authorization);
        return await this.reservationRepository.readByPaymentId(event.event.paymentID);
      }
      case "hostId": {
        authToken = await this.authManager.authenticateUser(event.Authorization);
        if (event.event?.property_Id) {
          return await this.reservationRepository.readByHostIdSingleProperty(authToken.sub, event.event.property_Id);
        }
        return await this.reservationRepository.readByHostId(authToken.sub);
      }
      case "departureDate": {
        return await this.reservationRepository.readByDepartureDate(event.event.departureDate, event.event.property_Id);
      }
      case "getId": {
        authToken = await this.authManager.authenticateUser(event.Authorization);
        return {
          response: authToken.sub,
        };
      }
      case "getPayment": {
        const user = await this.authManager.authenticateUser(event.Authorization);
        const booking = await this.reservationRepository.getBookingById(event.event.bookingId);
        if (booking.guestId !== user.sub) {
          throw new Forbidden("Only the guest of this booking may view payment information.");
        }
        const payment = await this.stripeRepository.getPaymentByBookingId(event.event.bookingId);
        return {
          statusCode: 200,
          response: payment.stripeClientSecret,
        };
      }
      default: {
        throw new TypeException("Unable to determine what read type to use.");
      }
    }
  }

  async verifyEventDataTypes(event) {
    try {
      if (event?.identifiers && event?.tax && event?.general) {
        IdentifierModel.verifyIdentifierData(event);
        GeneralModel.verifyGeneralData(event);
      }
    } catch (error) {
      console.error(error);
      throw new Forbidden("Unable to verify data");
    }
  }

  async verifyQueryDataTypes(params) {
    try {
      //await this.getParamsModel.verifyGetParams(params);
    } catch (error) {
      console.error(error);
      throw new Forbidden("Unable to verify data");
    }
  }
}

export default BookingService;
