import { randomUUID } from "node:crypto";
import { verifyWebsiteQuoteToken } from "../.shared/websiteQuoteToken.js";
import ReservationRepository from "../data/reservationRepository.js";
import PropertyRepository from "../data/propertyRepository.js";
import StandaloneSiteRepository from "../data/standaloneSiteRepository.js";
import StandaloneSiteEventRepository from "../data/standaloneSiteEventRepository.js";
import SystemManagerRepository from "../data/systemManagerRepository.js";
import ExternalCalendarService from "./externalCalendarService.js";
import QuoteRevalidationClient from "./quoteRevalidationClient.js";
import defaultGetHostContactById from "./getHostContactById.js";
import defaultSendBookingRequestEmails from "./sendBookingRequestEmails.js";
import { parseBookingDateToMs } from "../util/bookingDateParser.js";
import { generatePublicBookingRef as defaultGeneratePublicBookingRef } from "../util/publicBookingRef.js";
import ConflictException from "../util/exception/ConflictException.js";
import {
  PUBLIC_BOOKING_REQUEST_ERROR_CODES as CODES,
  PublicBookingRequestError,
  publicBookingRequestErrorFromQuoteError,
} from "../util/exception/PublicBookingRequestError.js";

const QUOTE_TOKEN_SECRET_PARAMETER =
  process.env.DIRECT_BOOKING_WEBSITE_QUOTE_TOKEN_SECRET_PARAMETER || "/direct-booking-website/quote-token-secret";
const BOOKING_STATUS_INQUIRY = "Inquiry";
const BOOKING_TYPE_INQUIRY = "inquiry";
const BOOKING_SOURCE_STANDALONE_SITE = "STANDALONE_SITE";
const RESPONSE_STATUS_REQUESTED = "REQUESTED";
const RESPONSE_CURRENCY = "EUR";
const SITE_STATUS_PUBLISHED = "PUBLISHED";
const SITE_STATUS_SUSPENDED = "SUSPENDED";
const SITE_BOOKING_REQUESTED_EVENT = "SITE_BOOKING_REQUESTED";
const HOSTNAME_FALLBACK = "WIP-Host";
const PAYMENT_ID_PLACEHOLDER = "FAILED: ";
const GUEST_ID_PREFIX = "dbw-";
const MAX_IDEMPOTENCY_KEY_LENGTH = 255;
const MAX_GUEST_NAME_LENGTH = 255;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNIQUE_VIOLATION_CODE = "23505";
const IDEMPOTENCY_KEY_CONSTRAINT_FRAGMENT = "idempotency_key";
const PUBLIC_BOOKING_REF_CONSTRAINT_FRAGMENT = "public_booking_ref";
const MAX_INSERT_ATTEMPTS = 2;

const MESSAGES = Object.freeze({
  missingIdempotencyKey: "An Idempotency-Key header is required.",
  invalidIdempotencyKey: "The Idempotency-Key header must be at most 255 characters.",
  invalidGuestContact: "Please provide your name and a valid email address.",
  quoteExpired: "Your quote is no longer valid. Please request a new price.",
  priceChanged: "The price for these dates has changed. Please request a new price.",
  quoteTokenInvalid: "The quote does not belong to this website.",
  siteNotFound: "This website could not be found.",
  siteSuspended: "This website is no longer accepting bookings.",
  siteNotPublished: "This website is not accepting bookings yet.",
  idempotencyKeyReused: "This Idempotency-Key was already used for a different booking request.",
  unavailableDates: "The selected dates are no longer available.",
  serviceUnavailable: "Your booking request could not be saved. Please try again.",
});

const cleanText = (value) => String(value ?? "").trim();

const isUniqueViolationOn = (error, constraintFragment) =>
  error?.code === UNIQUE_VIOLATION_CODE && String(error?.constraint || "").includes(constraintFragment);

const isAvailabilityConflict = (error) =>
  error instanceof ConflictException || error?.name === "ConflictException" || error?.statusCode === 409;

class PublicSiteBookingRequestService {
  constructor({
    standaloneSiteRepository = new StandaloneSiteRepository(),
    reservationRepository = new ReservationRepository(),
    propertyRepository = new PropertyRepository(),
    externalCalendarService = new ExternalCalendarService(),
    quoteRevalidationClient = new QuoteRevalidationClient(),
    standaloneSiteEventRepository = new StandaloneSiteEventRepository(),
    systemManagerRepository = new SystemManagerRepository(),
    getHostContactById = defaultGetHostContactById,
    sendBookingRequestEmails = defaultSendBookingRequestEmails,
    generatePublicBookingRef = defaultGeneratePublicBookingRef,
    clock = Date.now,
  } = {}) {
    this.standaloneSiteRepository = standaloneSiteRepository;
    this.reservationRepository = reservationRepository;
    this.propertyRepository = propertyRepository;
    this.externalCalendarService = externalCalendarService;
    this.quoteRevalidationClient = quoteRevalidationClient;
    this.standaloneSiteEventRepository = standaloneSiteEventRepository;
    this.systemManagerRepository = systemManagerRepository;
    this.getHostContactById = getHostContactById;
    this.sendBookingRequestEmails = sendBookingRequestEmails;
    this.generatePublicBookingRef = generatePublicBookingRef;
    this.clock = clock;
    this.quoteTokenSecretPromise = null;
  }

  async createBookingRequest({ siteId, idempotencyKey, quoteToken, guest, session, requestId }) {
    const normalizedIdempotencyKey = this.validateIdempotencyKey(idempotencyKey);
    const contact = this.validateGuestContact(guest);
    const normalizedSiteId = cleanText(siteId);
    const sessionId = cleanText(session?.sessionId) || null;

    const stay = await this.verifyQuoteToken(quoteToken, normalizedSiteId);

    try {
      const existing = await this.reservationRepository.getByIdempotencyKey(normalizedIdempotencyKey);
      if (existing) {
        return this.replayResponse(existing, stay);
      }

      const site = await this.loadPublishedSite(normalizedSiteId, stay.propertyId);
      const total = await this.confirmLivePrice({ stay, sessionId, requestId });
      await this.assertDatesStillAvailable(stay);

      const hostContact = await this.lookupHostContact(site.hostId);
      const propertyName = await this.lookupPropertyName(site.propertyId);
      const cancellationPolicy = await this.lookupCancellationPolicy(site.propertyId);

      const booking = await this.insertBookingRequest({
        stay,
        site,
        contact,
        hostContact,
        cancellationPolicy,
        total,
        idempotencyKey: normalizedIdempotencyKey,
      });
      if (booking.replayed) {
        return booking.result;
      }

      await this.recordRequestedEvent({ site, stay, sessionId, requestId, publicBookingRef: booking.publicBookingRef });
      await this.notifyParties({ site, stay, contact, hostContact, propertyName, publicBookingRef: booking.publicBookingRef });

      return this.buildResult({ publicBookingRef: booking.publicBookingRef, stay, total });
    } catch (error) {
      if (error instanceof PublicBookingRequestError) {
        throw error;
      }
      console.error("Public site booking request failed.", error);
      throw new PublicBookingRequestError(CODES.BOOKING_SERVICE_UNAVAILABLE, MESSAGES.serviceUnavailable);
    }
  }

  validateIdempotencyKey(idempotencyKey) {
    const normalized = cleanText(idempotencyKey);
    if (!normalized) {
      throw new PublicBookingRequestError(CODES.MISSING_IDEMPOTENCY_KEY, MESSAGES.missingIdempotencyKey);
    }
    if (normalized.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
      throw new PublicBookingRequestError(CODES.INVALID_IDEMPOTENCY_KEY, MESSAGES.invalidIdempotencyKey);
    }
    return normalized;
  }

  validateGuestContact(guest) {
    const name = cleanText(guest?.name);
    const email = cleanText(guest?.email).toLowerCase();
    const nameIsValid = name.length > 0 && name.length <= MAX_GUEST_NAME_LENGTH;
    const emailIsValid = email.length <= MAX_GUEST_NAME_LENGTH && EMAIL_PATTERN.test(email);
    if (!nameIsValid || !emailIsValid) {
      throw new PublicBookingRequestError(CODES.INVALID_GUEST_CONTACT, MESSAGES.invalidGuestContact);
    }
    return { name, email };
  }

  async getQuoteTokenSecret() {
    if (!this.quoteTokenSecretPromise) {
      this.quoteTokenSecretPromise = this.systemManagerRepository
        .getSystemManagerParameter(QUOTE_TOKEN_SECRET_PARAMETER)
        .catch((error) => {
          this.quoteTokenSecretPromise = null;
          throw error;
        });
    }
    return this.quoteTokenSecretPromise;
  }

  async verifyQuoteToken(quoteToken, siteId) {
    let secret;
    try {
      secret = await this.getQuoteTokenSecret();
    } catch (error) {
      console.error("Quote token secret could not be read.", error);
      throw new PublicBookingRequestError(CODES.BOOKING_SERVICE_UNAVAILABLE, MESSAGES.serviceUnavailable);
    }

    const payload = verifyWebsiteQuoteToken(cleanText(quoteToken), secret, { now: this.clock() });
    if (!payload) {
      throw new PublicBookingRequestError(CODES.QUOTE_EXPIRED, MESSAGES.quoteExpired);
    }
    if (cleanText(payload.siteId) !== siteId) {
      throw new PublicBookingRequestError(CODES.QUOTE_TOKEN_INVALID, MESSAGES.quoteTokenInvalid);
    }

    const guests = Number(payload.guests);
    const quotedTotal = Number(payload.priceBreakdown?.total);
    let arrivalDateMs;
    let departureDateMs;
    try {
      arrivalDateMs = parseBookingDateToMs(payload.checkIn, "checkIn");
      departureDateMs = parseBookingDateToMs(payload.checkOut, "checkOut");
    } catch (error) {
      throw new PublicBookingRequestError(CODES.QUOTE_TOKEN_INVALID, MESSAGES.quoteTokenInvalid);
    }
    if (!Number.isInteger(guests) || guests < 1 || !Number.isFinite(quotedTotal)) {
      throw new PublicBookingRequestError(CODES.QUOTE_TOKEN_INVALID, MESSAGES.quoteTokenInvalid);
    }

    return {
      siteId,
      propertyId: cleanText(payload.propertyId),
      quoteId: cleanText(payload.quoteId),
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      arrivalDateMs,
      departureDateMs,
      guests,
      quotedTotal,
    };
  }

  async loadPublishedSite(siteId, tokenPropertyId) {
    const site = await this.standaloneSiteRepository.getSiteById(siteId);
    if (!site) {
      throw new PublicBookingRequestError(CODES.SITE_NOT_FOUND, MESSAGES.siteNotFound);
    }
    if (site.status === SITE_STATUS_SUSPENDED) {
      throw new PublicBookingRequestError(CODES.SITE_SUSPENDED, MESSAGES.siteSuspended);
    }
    if (site.status !== SITE_STATUS_PUBLISHED) {
      throw new PublicBookingRequestError(CODES.SITE_NOT_PUBLISHED, MESSAGES.siteNotPublished);
    }
    if (site.propertyId !== tokenPropertyId) {
      throw new PublicBookingRequestError(CODES.QUOTE_TOKEN_INVALID, MESSAGES.quoteTokenInvalid);
    }
    return site;
  }

  async confirmLivePrice({ stay, sessionId, requestId }) {
    const requote = await this.quoteRevalidationClient.requoteSite({
      siteId: stay.siteId,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      guests: stay.guests,
      sessionId,
      requestId,
    });
    if (!requote.ok) {
      throw publicBookingRequestErrorFromQuoteError({ code: requote.code, message: requote.message });
    }

    const liveTotal = Number(requote.quote?.priceBreakdown?.total);
    if (!Number.isFinite(liveTotal) || liveTotal !== stay.quotedTotal) {
      throw new PublicBookingRequestError(CODES.QUOTE_EXPIRED, MESSAGES.priceChanged);
    }
    return liveTotal;
  }

  async assertDatesStillAvailable(stay) {
    const range = { propertyId: stay.propertyId, arrivalDateMs: stay.arrivalDateMs, departureDateMs: stay.departureDateMs };
    try {
      await this.propertyRepository.assertBookingDatesAvailable(range);
      await this.reservationRepository.assertNoBookingConflict(range);
      await this.externalCalendarService.ensureNoExternalConflict({
        propertyId: stay.propertyId,
        arrivalMs: stay.arrivalDateMs,
        departureMs: stay.departureDateMs,
      });
    } catch (error) {
      if (isAvailabilityConflict(error)) {
        throw new PublicBookingRequestError(CODES.UNAVAILABLE_DATES, MESSAGES.unavailableDates);
      }
      throw error;
    }
  }

  async lookupHostContact(hostId) {
    try {
      const contact = await this.getHostContactById(hostId);
      return { email: cleanText(contact?.email) || null, name: cleanText(contact?.name) || null };
    } catch (error) {
      console.error("Host contact lookup failed; falling back to placeholder host name.", error);
      return { email: null, name: null };
    }
  }

  async lookupPropertyName(propertyId) {
    try {
      const property = await this.propertyRepository.getPropertyById(propertyId);
      return cleanText(property?.title) || null;
    } catch (error) {
      console.error("Property lookup for booking request emails failed.", error);
      return null;
    }
  }

  async lookupCancellationPolicy(propertyId) {
    try {
      return (await this.propertyRepository.getCancellationPolicyByPropertyId(propertyId)) ?? null;
    } catch (error) {
      console.error("Cancellation policy lookup failed; storing the booking request without one.", error);
      return null;
    }
  }

  buildInsertValues({ stay, site, contact, hostContact, cancellationPolicy, total, idempotencyKey, publicBookingRef }) {
    return {
      id: randomUUID(),
      arrivaldate: stay.arrivalDateMs,
      departuredate: stay.departureDateMs,
      createdat: this.clock(),
      guestid: `${GUEST_ID_PREFIX}${randomUUID()}`,
      guests: stay.guests,
      hostid: site.hostId,
      latepayment: false,
      paymentid: PAYMENT_ID_PLACEHOLDER,
      property_id: site.propertyId,
      status: BOOKING_STATUS_INQUIRY,
      guestname: contact.name,
      hostname: hostContact.name || HOSTNAME_FALLBACK,
      total_price: total / 100,
      cancellation_policy: cancellationPolicy,
      bookingtype: BOOKING_TYPE_INQUIRY,
      booking_source: BOOKING_SOURCE_STANDALONE_SITE,
      site_id: site.id,
      guest_email: contact.email,
      public_booking_ref: publicBookingRef,
      idempotency_key: idempotencyKey,
    };
  }

  async insertBookingRequest({ stay, site, contact, hostContact, cancellationPolicy, total, idempotencyKey }) {
    let publicBookingRef = this.generatePublicBookingRef();

    for (let attempt = 1; attempt <= MAX_INSERT_ATTEMPTS; attempt += 1) {
      try {
        await this.reservationRepository.createPublicSiteBookingRequest(
          this.buildInsertValues({
            stay,
            site,
            contact,
            hostContact,
            cancellationPolicy,
            total,
            idempotencyKey,
            publicBookingRef,
          })
        );
        return { replayed: false, publicBookingRef };
      } catch (error) {
        if (isUniqueViolationOn(error, IDEMPOTENCY_KEY_CONSTRAINT_FRAGMENT)) {
          const winner = await this.reservationRepository.getByIdempotencyKey(idempotencyKey);
          if (winner) {
            return { replayed: true, result: this.replayResponse(winner, stay) };
          }
          throw error;
        }
        if (isUniqueViolationOn(error, PUBLIC_BOOKING_REF_CONSTRAINT_FRAGMENT) && attempt < MAX_INSERT_ATTEMPTS) {
          publicBookingRef = this.generatePublicBookingRef();
          continue;
        }
        throw error;
      }
    }

    throw new PublicBookingRequestError(CODES.BOOKING_SERVICE_UNAVAILABLE, MESSAGES.serviceUnavailable);
  }

  replayResponse(existing, stay) {
    const matchesStay =
      cleanText(existing.site_id) === stay.siteId &&
      Number(existing.arrivaldate) === stay.arrivalDateMs &&
      Number(existing.departuredate) === stay.departureDateMs &&
      Number(existing.guests) === stay.guests;
    if (!matchesStay) {
      throw new PublicBookingRequestError(CODES.IDEMPOTENCY_KEY_REUSED, MESSAGES.idempotencyKeyReused);
    }

    return this.buildResult({
      publicBookingRef: existing.public_booking_ref,
      stay,
      total: Math.round(Number(existing.total_price) * 100),
    });
  }

  buildResult({ publicBookingRef, stay, total }) {
    return {
      statusCode: 201,
      response: {
        publicBookingRef,
        status: RESPONSE_STATUS_REQUESTED,
        siteId: stay.siteId,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        guests: stay.guests,
        total,
        currency: RESPONSE_CURRENCY,
      },
    };
  }

  async recordRequestedEvent({ site, stay, sessionId, requestId, publicBookingRef }) {
    try {
      await this.standaloneSiteEventRepository.recordEvent({
        propertyId: site.propertyId,
        hostId: site.hostId,
        eventType: SITE_BOOKING_REQUESTED_EVENT,
        payload: {
          requestId,
          siteId: site.id,
          quoteId: stay.quoteId,
          publicBookingRef,
          sessionId,
          checkIn: stay.checkIn,
          checkOut: stay.checkOut,
          guests: stay.guests,
        },
        occurredAt: this.clock(),
      });
    } catch (error) {
      console.error("Recording SITE_BOOKING_REQUESTED failed; the booking request was still saved.", error);
    }
  }

  async notifyParties({ site, stay, contact, hostContact, propertyName, publicBookingRef }) {
    try {
      await this.sendBookingRequestEmails({
        hostEmail: hostContact.email,
        guestEmail: contact.email,
        bookingInfo: {
          publicBookingRef,
          propertyName: propertyName || "the property",
          propertyId: site.propertyId,
          guestName: contact.name,
          guestEmail: contact.email,
          guests: stay.guests,
          checkIn: stay.checkIn,
          checkOut: stay.checkOut,
        },
      });
    } catch (error) {
      console.error("Booking request emails failed; the booking request was still saved.", error);
    }
  }
}

export default PublicSiteBookingRequestService;
