import GeneralModel from "./model/generalModel.js";
import IdentifierModel from "./model/identifierModel.js";
import GetParamsModel from "./model/getParamsModel.js";
import AuthManager from "../auth/authManager.js";
import sendEmail from "./sendEmail.js";
import Forbidden from "../util/exception/Forbidden.js";
import Unauthorized from "../util/exception/Unauthorized.js";
import TypeException from "../util/exception/TypeException.js";
import NotFoundException from "../util/exception/NotFoundException.js";
import { BadRequestException } from "../util/exception/badRequestException.js";
import ReservationRepository from "../data/reservationRepository.js";
import StripeRepository from "../data/stripeRepository.js";
import CognitoRepository from "../data/cognitoRepository.js";
import PropertyRepository from "../data/propertyRepository.js";
import getHostEmailById from "./getHostEmailById.js";
import ExternalCalendarService from "./externalCalendarService.js";
import ChannexBookingAvailabilityClient from "./channexBookingAvailabilityClient.js";

const requireStr = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);

const getBookingId = (booking) =>
  requireStr(booking?.id) || requireStr(booking?.bookingId) || requireStr(booking?.booking_id);

const getPropertyId = (booking) =>
  requireStr(booking?.property_id) || requireStr(booking?.propertyId) || requireStr(booking?.domitsPropertyId);

const createLocalChannexAvailabilityEvidence = ({ booking, trigger, skipped, reason, errors = [] }) => ({
  bookingId: getBookingId(booking) ?? null,
  trigger,
  syncType: "booking-availability",
  domitsPropertyId: getPropertyId(booking) ?? null,
  channexPropertyId: null,
  externalRoomTypeId: null,
  countOfRooms: null,
  countOfRoomsSource: null,
  affectedDateRange: { dateFrom: null, dateTo: null },
  affectedDates: [],
  availabilityValuesSent: [],
  requestCount: 0,
  taskIds: [],
  warnings: [],
  errors,
  overallSuccess: false,
  skipped,
  reason,
});

class BookingService {
  constructor({
    reservationRepository = new ReservationRepository(),
    stripeRepository = new StripeRepository(),
    cognitoRepository = new CognitoRepository(),
    propertyRepository = new PropertyRepository(),
    authManager = new AuthManager(),
    getParamsModel = new GetParamsModel(),
    externalCalendarService = new ExternalCalendarService(),
    channexBookingAvailabilityClient = new ChannexBookingAvailabilityClient(),
    sendEmailFn = sendEmail,
    getHostEmailByIdFn = getHostEmailById,
  } = {}) {
    this.reservationRepository = reservationRepository;
    this.stripeRepository = stripeRepository;
    this.cognitoRepository = cognitoRepository;
    this.propertyRepository = propertyRepository;
    this.authManager = authManager;
    this.getParamsModel = getParamsModel;
    this.externalCalendarService = externalCalendarService;
    this.channexBookingAvailabilityClient = channexBookingAvailabilityClient;
    this.sendEmail = sendEmailFn;
    this.getHostEmailById = getHostEmailByIdFn;
  }

  async create(event) {
    //await this.verifyEventDataTypes(event);
    const authenticatedUser = await this.authManager.authenticateUser(event.Authorization);
    const propertyId = String(event?.identifiers?.property_Id || "").trim();
    if (!propertyId) {
      throw new BadRequestException("property_Id is required.");
    }

    const arrivalDateMs = this.parseBookingDateToMs(event?.general?.arrivalDate, "arrivalDate");
    const departureDateMs = this.parseBookingDateToMs(event?.general?.departureDate, "departureDate");
    if (departureDateMs <= arrivalDateMs) {
      throw new BadRequestException("departureDate must be after arrivalDate.");
    }

    await this.reservationRepository.assertNoBookingConflict({
      propertyId,
      arrivalDateMs,
      departureDateMs,
    });

    await this.externalCalendarService.ensureNoExternalConflict({
      propertyId,
      arrivalMs: arrivalDateMs,
      departureMs: departureDateMs,
    });

    const userEmail = authenticatedUser.email;
    const fetchedProperty = await this.propertyRepository.getPropertyById(propertyId);
    const cancellationPolicy = await this.propertyRepository.getCancellationPolicyByPropertyId(propertyId);
    const hostEmail = await this.getHostEmailById(fetchedProperty.hostId);
    const isInquiry = fetchedProperty.bookingType === "inquiry";

    const bookingInfo = {
      guests: event.general.guests,
      propertyName: fetchedProperty.title,
      arriveDate: event.general.arrivalDate,
      departureDate: event.general.departureDate,
    };
    await this.sendEmail(userEmail, hostEmail, bookingInfo);

    const bookingStatus = isInquiry ? "Inquiry" : "Awaiting Payment";
    const result = await this.reservationRepository.addBookingToTable(
      event,
      authenticatedUser.sub,
      fetchedProperty.hostId,
      cancellationPolicy,
      bookingStatus,
      fetchedProperty.bookingType
    );

    if (bookingStatus !== "Awaiting Payment") {
      return { ...result, isInquiry };
    }

    const bookingAfter = {
      id: result.bookingId,
      property_id: propertyId,
      hostid: fetchedProperty.hostId,
      guestid: authenticatedUser.sub,
      arrivaldate: arrivalDateMs,
      departuredate: departureDateMs,
      status: bookingStatus,
      bookingtype: fetchedProperty.bookingType,
    };
    const channexAvailabilitySync = await this.syncChannexBookingAvailabilityIfEnabled({
      userId: fetchedProperty.hostId,
      bookingAfter,
      trigger: "BOOKING_CREATED",
    });

    return {
      ...result,
      isInquiry,
      ...(channexAvailabilitySync === undefined ? {} : { channexAvailabilitySync }),
    };
  }

  parseBookingDateToMs(value, fieldName) {
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        throw new BadRequestException(`${fieldName} is invalid.`);
      }
      return value;
    }

    if (typeof value === "string") {
      const normalized = value.trim();
      if (!normalized) {
        throw new BadRequestException(`${fieldName} is required.`);
      }
      if (/^\d+$/.test(normalized)) {
        const parsedInt = Number(normalized);
        if (!Number.isFinite(parsedInt)) {
          throw new BadRequestException(`${fieldName} is invalid.`);
        }
        return parsedInt;
      }
      const parsedDate = new Date(normalized).getTime();
      if (!Number.isFinite(parsedDate)) {
        throw new BadRequestException(`${fieldName} is invalid.`);
      }
      return parsedDate;
    }

    throw new BadRequestException(`${fieldName} is required.`);
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
      case "blockedDates": {
        if (!event.event?.property_Id) {
          throw new BadRequestException("property_Id is required.");
        }
        return await this.reservationRepository.getBlockedDatesByPropertyId(event.event.property_Id);
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

  async acceptInquiry(bookingId, authToken) {
    const user = await this.authManager.authenticateUser(authToken);
    const bookingResult = await this.reservationRepository.getBookingById(bookingId);
    if (!bookingResult?.response) throw new NotFoundException("Booking not found.");
    const booking = bookingResult.response;
    if (booking.hostid !== user.sub) throw new Forbidden("Only the host may accept this inquiry.");
    if (booking.status !== "Inquiry") throw new BadRequestException("Booking is not in Inquiry status.");
    await this.reservationRepository.updateBookingStatus(bookingId, "Awaiting Payment");
    return {
      bookingId,
      status: "Awaiting Payment",
      hostId: booking.hostid,
      propertyId: booking.property_id,
      dates: {
        arrivalDate: booking.arrivaldate,
        departureDate: booking.departuredate,
      },
    };
  }

  async declineInquiry(bookingId, authToken) {
    const user = await this.authManager.authenticateUser(authToken);
    const bookingResult = await this.reservationRepository.getBookingById(bookingId);
    if (!bookingResult?.response) throw new NotFoundException("Booking not found.");
    const booking = bookingResult.response;
    if (booking.hostid !== user.sub) throw new Forbidden("Only the host may decline this inquiry.");
    if (booking.status !== "Inquiry") throw new BadRequestException("Booking is not in Inquiry status.");
    await this.reservationRepository.updateBookingStatus(bookingId, "Declined");
    return { bookingId, status: "Declined" };
  }

  isChannexBookingAvailabilitySyncEnabled() {
    return String(process.env.CHANNEX_BOOKING_AVAILABILITY_SYNC_ENABLED || "").trim().toLowerCase() === "true";
  }

  async syncChannexBookingAvailabilityIfEnabled({
    userId,
    bookingBefore = null,
    bookingAfter = null,
    trigger,
    includeDisabledEvidence = false,
  }) {
    const referenceBooking = bookingAfter || bookingBefore || {};
    if (!this.isChannexBookingAvailabilitySyncEnabled()) {
      return includeDisabledEvidence
        ? createLocalChannexAvailabilityEvidence({
          booking: referenceBooking,
          trigger,
          skipped: true,
          reason: "CHANNEX_BOOKING_AVAILABILITY_SYNC_DISABLED",
        })
        : undefined;
    }

    try {
      return await this.channexBookingAvailabilityClient.syncAvailabilityForBookingChange({
        userId,
        bookingBefore,
        bookingAfter,
        trigger,
      });
    } catch (error) {
      return createLocalChannexAvailabilityEvidence({
        booking: referenceBooking,
        trigger,
        skipped: false,
        reason: "CHANNEX_BOOKING_AVAILABILITY_SYNC_FAILED",
        errors: [
          {
            code: error?.code || error?.name || "CHANNEX_BOOKING_AVAILABILITY_SYNC_FAILED",
            message: error?.message || "Channex booking availability sync failed.",
            httpStatus: error?.statusCode ?? null,
          },
        ],
      });
    }
  }

  async modifyBookingDates(bookingId, arrivalDate, departureDate, authToken) {
    const normalizedBookingId = requireStr(bookingId);
    if (!normalizedBookingId) {
      throw new BadRequestException("bookingId is required.");
    }
    if (!authToken) {
      throw new Unauthorized("Missing Authorization header.");
    }

    const user = await this.authManager.authenticateUser(authToken);
    const bookingResult = await this.reservationRepository.getBookingById(normalizedBookingId);
    if (!bookingResult?.response) throw new NotFoundException("Booking not found.");

    const bookingBefore = bookingResult.response;
    if (bookingBefore.hostid !== user.sub) {
      throw new Forbidden("Only the host may modify this booking.");
    }

    const arrivalDateMs = this.parseBookingDateToMs(arrivalDate, "arrivalDate");
    const departureDateMs = this.parseBookingDateToMs(departureDate, "departureDate");
    if (departureDateMs <= arrivalDateMs) {
      throw new BadRequestException("departureDate must be after arrivalDate.");
    }

    const propertyId = getPropertyId(bookingBefore);
    if (!propertyId) {
      throw new BadRequestException("Booking is missing property_id.");
    }

    await this.reservationRepository.assertNoBookingConflict({
      propertyId,
      arrivalDateMs,
      departureDateMs,
      excludeBookingId: normalizedBookingId,
    });

    await this.externalCalendarService.ensureNoExternalConflict({
      propertyId,
      arrivalMs: arrivalDateMs,
      departureMs: departureDateMs,
      excludeBookingId: normalizedBookingId,
    });

    await this.reservationRepository.updateBookingDates(normalizedBookingId, arrivalDateMs, departureDateMs);

    const updatedBookingResult = await this.reservationRepository.getBookingById(normalizedBookingId);
    const bookingAfter = updatedBookingResult?.response || {
      ...bookingBefore,
      arrivaldate: arrivalDateMs,
      departuredate: departureDateMs,
    };

    const channexAvailabilitySync = await this.syncChannexBookingAvailabilityIfEnabled({
      userId: bookingAfter.hostid,
      bookingBefore,
      bookingAfter,
      trigger: "BOOKING_MODIFIED",
      includeDisabledEvidence: true,
    });

    return {
      booking: bookingAfter,
      bookingBefore,
      bookingAfter,
      channexAvailabilitySync,
    };
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
