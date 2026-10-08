import { CHANNEL_CHANNEX } from "../utils/channexBookingPollUtils.js";
import {
  CHANNEX_BOOKING_CANCELLED_TRIGGER,
  toBookingAvailabilityBridgeBooking,
} from "../utils/channexBookingRevisionUtils.js";

const ok = (response) => ({ statusCode: 200, response });
const bad = (statusCode, response) => ({ statusCode, response });
const requireStr = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const CHANNEX_CERTIFICATION_CANCEL_ACTION = "certification-cancel-booking";
const CHANNEX_CERTIFICATION_CANCEL_MODE = "admin-certification-no-refund";
const CHANNEX_CERTIFICATION_CANCEL_REFUND_SKIPPED_REASON =
  "Channex certification/admin cancellation does not process guest refunds.";
const CHANNEX_CANCELLED_BOOKING_STATUS = "Cancelled";
const CHANNEX_ADMIN_CANCEL_ACTIVE_STATUSES = new Set(["awaiting payment", "paid"]);
const getDomitsBookingStatus = (booking) => String(booking?.status || "").trim().toLowerCase();
const isActiveDomitsBookingForChannexCancel = (booking) =>
  CHANNEX_ADMIN_CANCEL_ACTIVE_STATUSES.has(getDomitsBookingStatus(booking));
const isCancelledDomitsBooking = (booking) => ["cancelled", "canceled"].includes(getDomitsBookingStatus(booking));

export default class ChannexCertificationService {
  constructor({ externalBookingImportRepository, channexBookingAvailabilityBridge }) {
    this.externalBookingImportRepository = externalBookingImportRepository;
    this.channexBookingAvailabilityBridge = channexBookingAvailabilityBridge;
  }

  buildChannexCertificationCancelSkippedEvidence({ booking, reason }) {
    const bridgeBooking = toBookingAvailabilityBridgeBooking(booking);
    return {
      bookingId: bridgeBooking?.id ?? null,
      trigger: CHANNEX_BOOKING_CANCELLED_TRIGGER,
      syncType: "booking-availability",
      domitsPropertyId: bridgeBooking?.property_id ?? null,
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
      errors: [],
      overallSuccess: false,
      skipped: true,
      reason,
    };
  }

  async cancelChannexCertificationBooking(userId, domitsPropertyId, body = {}) {
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const bookingId = requireStr(body?.bookingId);

    if (!normalizedUserId) {
      return bad(400, { error: "Missing required query param: userId" });
    }

    if (!normalizedDomitsPropertyId) {
      return bad(400, { error: "Missing required query param: domitsPropertyId" });
    }

    if (!bookingId) {
      return bad(400, { error: "Missing bookingId." });
    }

    const bookingBefore = await this.externalBookingImportRepository.getBookingById(bookingId);
    if (!bookingBefore) {
      return bad(404, { error: "Booking not found." });
    }

    if (requireStr(bookingBefore.propertyId) !== normalizedDomitsPropertyId) {
      return bad(403, {
        error: "BOOKING_PROPERTY_MISMATCH",
        message: "Booking does not belong to the requested Domits property.",
      });
    }

    const alreadyCancelled = isCancelledDomitsBooking(bookingBefore);
    const bookingAfter = alreadyCancelled
      ? bookingBefore
      : await this.externalBookingImportRepository.cancelImportedBooking(bookingId);

    if (!bookingAfter) {
      return bad(500, {
        error: "DOMITS_BOOKING_CANCEL_FAILED",
        message: "Domits booking could not be cancelled for the Channex certification admin action.",
      });
    }

    let channexAvailabilitySync = null;
    if (alreadyCancelled) {
      channexAvailabilitySync = this.buildChannexCertificationCancelSkippedEvidence({
        booking: bookingAfter,
        reason: "BOOKING_ALREADY_CANCELLED",
      });
    } else if (isActiveDomitsBookingForChannexCancel(bookingBefore)) {
      channexAvailabilitySync = await this.channexBookingAvailabilityBridge.syncAvailabilityForBookingChange({
        userId: bookingBefore.hostId,
        bookingBefore: toBookingAvailabilityBridgeBooking(bookingBefore),
        bookingAfter: toBookingAvailabilityBridgeBooking(bookingAfter),
        trigger: CHANNEX_BOOKING_CANCELLED_TRIGGER,
      });
    } else {
      channexAvailabilitySync = this.buildChannexCertificationCancelSkippedEvidence({
        booking: bookingAfter,
        reason: "BOOKING_STATUS_NOT_ACTIVE_FOR_CHANNEX_CANCEL",
      });
    }

    return ok({
      channel: CHANNEL_CHANNEX,
      action: CHANNEX_CERTIFICATION_CANCEL_ACTION,
      mode: CHANNEX_CERTIFICATION_CANCEL_MODE,
      bookingId,
      domitsPropertyId: normalizedDomitsPropertyId,
      requestedByUserId: normalizedUserId,
      previousStatus: bookingBefore.status ?? null,
      status: bookingAfter.status ?? CHANNEX_CANCELLED_BOOKING_STATUS,
      alreadyCancelled,
      refundProcessed: false,
      refundSkippedReason: CHANNEX_CERTIFICATION_CANCEL_REFUND_SKIPPED_REASON,
      reason: requireStr(body?.reason),
      booking: bookingAfter,
      channexAvailabilitySync,
    });
  }
}
