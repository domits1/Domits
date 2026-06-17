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
import ChannexBookingAvailabilityClient, {
  CHANNEX_BOOKING_AVAILABILITY_SYNC_DISABLED,
  CHANNEX_BOOKING_AVAILABILITY_SYNC_FAILED,
  createBookingAvailabilityFallbackEvidence,
} from "./channexBookingAvailabilityClient.js";
import { PriceLabsBookingNotifier } from "./priceLabsBookingNotifier.js";
import { parseBookingDateToMs } from "../util/bookingDateParser.js";

const requireStr = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);
const BOOKING_STATUS_AWAITING_PAYMENT = "Awaiting Payment";
const BOOKING_STATUS_INQUIRY = "Inquiry";
const BOOKING_STATUS_PAID = "Paid";
const BOOKING_STATUS_CANCELLED = "Cancelled";
const TRIGGER_BOOKING_CREATED = "BOOKING_CREATED";
const TRIGGER_BOOKING_MODIFIED = "BOOKING_MODIFIED";
const TRIGGER_BOOKING_CANCELLED = "BOOKING_CANCELLED";
const CHANNEX_CANCEL_BOOKING_ALREADY_CANCELLED = "BOOKING_ALREADY_CANCELLED";
const CHANNEX_CANCEL_BOOKING_NOT_ACTIVE = "BOOKING_STATUS_NOT_ACTIVE_FOR_CHANNEX_CANCEL";

const getPropertyId = (booking) =>
  requireStr(booking?.property_id) || requireStr(booking?.propertyId) || requireStr(booking?.domitsPropertyId);
const normalizeStatus = (status) => String(status || "").trim().toLowerCase();
const isActiveBookingStatus = (status) =>
  normalizeStatus(status) === normalizeStatus(BOOKING_STATUS_AWAITING_PAYMENT) ||
  normalizeStatus(status) === normalizeStatus(BOOKING_STATUS_PAID);
const isCancelledBookingStatus = (status) =>
  normalizeStatus(status) === "cancelled" || normalizeStatus(status) === "canceled";

const MIN_CHECK_IN_OUT_GAP_MS = 60 * 60 * 1000;

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
    priceLabsBookingNotifier = new PriceLabsBookingNotifier(),
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
    this.priceLabsBookingNotifier = priceLabsBookingNotifier;
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
    if (departureDateMs - arrivalDateMs < MIN_CHECK_IN_OUT_GAP_MS) {
      throw new BadRequestException("check-in and check-out must be at least 1 hour apart.");
    }

    const fetchedProperty = await this.propertyRepository.getPropertyById(propertyId);

    await this.propertyRepository.assertBookingDatesAvailable({
      propertyId,
      arrivalDateMs,
      departureDateMs,
    });

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

    const bookingStatus = isInquiry ? BOOKING_STATUS_INQUIRY : BOOKING_STATUS_AWAITING_PAYMENT;
    const eventWithParsedDates = {
      ...event,
      general: {
        ...event.general,
        arrivalDate: arrivalDateMs,
        departureDate: departureDateMs,
      },
    };

    const result = await this.reservationRepository.addBookingToTable(
      eventWithParsedDates,
      authenticatedUser.sub,
      fetchedProperty.hostId,
      cancellationPolicy,
      bookingStatus,
      fetchedProperty.bookingType
    );

    if (bookingStatus !== BOOKING_STATUS_AWAITING_PAYMENT) {
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
      trigger: TRIGGER_BOOKING_CREATED,
    });

    await this.priceLabsBookingNotifier.notifyBookingChange(fetchedProperty.hostId, "booking_created");

    return {
      ...result,
      isInquiry,
      ...(channexAvailabilitySync === undefined ? {} : { channexAvailabilitySync }),
    };
  }

  parseBookingDateToMs(value, fieldName) {
    return parseBookingDateToMs(value, fieldName);
  }

  async confirmPayment(paymentid) {
    const booking = await this.reservationRepository.getBookingByPaymentId(paymentid);
    if (booking.status === BOOKING_STATUS_PAID) {
      return true;
    }
    const paymentIntent = await this.stripeRepository.getPaymentIntentByPaymentId(paymentid);
    if (paymentIntent.status === "succeeded") {
      await this.reservationRepository.updateBookingStatus(booking.id, BOOKING_STATUS_PAID);
      return true;
    } else {
      return false;
    }
  }

  async failPayment(paymentid) {
    const booking = await this.reservationRepository.getBookingByPaymentId(paymentid);
    if (booking.status === BOOKING_STATUS_AWAITING_PAYMENT) {
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

    await this.reservationRepository.updateBookingStatus(bookingId, BOOKING_STATUS_AWAITING_PAYMENT);

    const overlapping = await this.reservationRepository.getOverlappingInquiries({
      propertyId: booking.property_id,
      arrivalDateMs: booking.arrivaldate,
      departureDateMs: booking.departuredate,
      excludeBookingId: bookingId,
    });
    await Promise.all(overlapping.map((b) => this.reservationRepository.updateBookingStatus(b.id, "Declined")));

    return {
      bookingId,
      status: BOOKING_STATUS_AWAITING_PAYMENT,
      hostId: booking.hostid,
      propertyId: booking.property_id,
      declinedCount: overlapping.length,
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
        ? createBookingAvailabilityFallbackEvidence({
            booking: referenceBooking,
            trigger,
            skipped: true,
            reason: CHANNEX_BOOKING_AVAILABILITY_SYNC_DISABLED,
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
      return createBookingAvailabilityFallbackEvidence({
        booking: referenceBooking,
        trigger,
        skipped: false,
        reason: CHANNEX_BOOKING_AVAILABILITY_SYNC_FAILED,
        errors: [
          {
            code: error?.code || error?.name || CHANNEX_BOOKING_AVAILABILITY_SYNC_FAILED,
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
      trigger: TRIGGER_BOOKING_MODIFIED,
      includeDisabledEvidence: true,
    });

    await this.priceLabsBookingNotifier.notifyBookingChange(bookingAfter.hostid, "booking_modified");

    return {
      booking: bookingAfter,
      bookingBefore,
      bookingAfter,
      channexAvailabilitySync,
    };
  }

  async cancelBooking(bookingId, authToken, { reason = null } = {}) {
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
    const isHost = bookingBefore.hostid === user.sub;
    const isGuest = bookingBefore.guestid === user.sub;
    if (!isHost && !isGuest) {
      throw new Forbidden("Only the host or guest of this booking may cancel this booking.");
    }

    const alreadyCancelled = isCancelledBookingStatus(bookingBefore.status);
    if (!alreadyCancelled) {
      await this.reservationRepository.updateBookingStatus(normalizedBookingId, BOOKING_STATUS_CANCELLED);
    }

    const updatedBookingResult = alreadyCancelled
      ? bookingResult
      : await this.reservationRepository.getBookingById(normalizedBookingId);
    const bookingAfter = updatedBookingResult?.response || {
      ...bookingBefore,
      status: BOOKING_STATUS_CANCELLED,
    };

    const shouldSyncChannex = !alreadyCancelled && isActiveBookingStatus(bookingBefore.status);
    const channexAvailabilitySync = shouldSyncChannex
      ? await this.syncChannexBookingAvailabilityIfEnabled({
          userId: bookingAfter.hostid || bookingBefore.hostid,
          bookingBefore,
          bookingAfter,
          trigger: TRIGGER_BOOKING_CANCELLED,
          includeDisabledEvidence: true,
        })
      : createBookingAvailabilityFallbackEvidence({
          booking: bookingAfter,
          trigger: TRIGGER_BOOKING_CANCELLED,
          skipped: true,
          reason: alreadyCancelled ? CHANNEX_CANCEL_BOOKING_ALREADY_CANCELLED : CHANNEX_CANCEL_BOOKING_NOT_ACTIVE,
        });

    if (!alreadyCancelled) {
      await this.priceLabsBookingNotifier.notifyBookingChange(bookingAfter.hostid || bookingBefore.hostid, "booking_cancelled");
    }

    return {
      booking: bookingAfter,
      bookingBefore,
      bookingAfter,
      alreadyCancelled,
      reason: requireStr(reason),
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
