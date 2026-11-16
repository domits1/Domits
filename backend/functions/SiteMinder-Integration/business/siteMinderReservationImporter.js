import { buildDeterministicBookingId } from "../.shared/channelManagement/repositories/channexExternalBookingImportRepository.js";
import { bookingAvailabilityChange } from "../.shared/channelManagement/utils/channexBookingChange.js";
import { CHANNEX_ARI_OUTBOX_SOURCE } from "../.shared/channelManagement/utils/channexAriOutboxConstants.js";
import { SITEMINDER_CHANNEL } from "../util/siteMinderConfig.js";
import { RESERVATION_ERROR, planReservationBookings } from "../util/reservationBookings.js";

const ACTIVE = "ACTIVE";
const CANCEL = "Cancel";
const LINK_STATUS = Object.freeze({ PAID: "Paid", CANCELLED: "Cancelled" });
const BOOKING_CANCELLED = "Cancelled";

const isActive = (row) => String(row?.status ?? "").toUpperCase() === ACTIVE;

const nightsChange = (propertyId, arrivalMs, departureMs) =>
  bookingAvailabilityChange(propertyId, CHANNEX_ARI_OUTBOX_SOURCE.SITEMINDER_IMPORT, {
    arrivalMs: Number(arrivalMs),
    departureMs: Number(departureMs),
  });

const nightsOfBooking = (booking) => nightsChange(booking.propertyId, booking.arrivalDateMs, booking.departureDateMs);

const roomKeysOf = (link) => {
  try {
    const keys = JSON.parse(link?.rawPayload ?? "null")?.roomKeys;
    return Array.isArray(keys) ? keys.filter((key) => typeof key === "string") : [];
  } catch {
    return [];
  }
};

export class SiteMinderReservationImporter {
  constructor({ props, accounts, roomTypes, bookings, resLinks, currency, now = Date.now }) {
    this.props = props;
    this.accounts = accounts;
    this.roomTypes = roomTypes;
    this.bookings = bookings;
    this.resLinks = resLinks;
    this.currency = currency;
    this.now = now;
  }

  async importReservation(reservation) {
    const account = await this.#siteMinderAccount(reservation.hotelCode);
    if (!account) {
      return { failure: RESERVATION_ERROR.HOTEL_NOT_LINKED };
    }
    const link = await this.resLinks.getByIntegrationAccountIdAndExternalReservation({
      integrationAccountId: account.id,
      channel: SITEMINDER_CHANNEL,
      externalReservationId: reservation.siteMinderId,
    });
    const savedRoomKeys = roomKeysOf(link);
    const bookingIdOf = (key) => buildDeterministicBookingId(SITEMINDER_CHANNEL, account.id, key);

    if (reservation.status === CANCEL) {
      await this.#cancelRooms(savedRoomKeys.map(bookingIdOf));
      await this.#saveLink(account, reservation, { link, roomKeys: savedRoomKeys, status: LINK_STATUS.CANCELLED });
      return this.#confirmation(reservation, bookingIdOf(savedRoomKeys[0] ?? reservation.siteMinderId));
    }

    const plan = await this.#plan(account, reservation);
    if (plan.error) {
      return { failure: plan.error };
    }
    for (const booking of plan.bookings) {
      await this.#saveRoom(bookingIdOf(booking.roomKey), booking);
    }
    const plannedKeys = new Set(plan.bookings.map((booking) => booking.roomKey));
    await this.#cancelRooms(savedRoomKeys.filter((key) => !plannedKeys.has(key)).map(bookingIdOf));
    await this.#saveLink(account, reservation, { bookings: plan.bookings, status: LINK_STATUS.PAID });
    return this.#confirmation(reservation, bookingIdOf(plan.bookings[0].roomKey));
  }

  async #siteMinderAccount(hotelCode) {
    const rows = await this.props.findByExternalPropertyId(hotelCode);
    for (const row of rows.filter(isActive)) {
      const account = await this.accounts.getById(row.integrationAccountId);
      if (account?.channel === SITEMINDER_CHANNEL) {
        return account;
      }
    }
    return null;
  }

  async #plan(account, reservation) {
    const roomTypeToProperty = new Map(
      (await this.roomTypes.listByAccountId(account.id))
        .filter((row) => row.externalPropertyId === reservation.hotelCode && isActive(row))
        .map((row) => [row.externalRoomTypeId, row.domitsPropertyId])
    );
    const plan = planReservationBookings(reservation, { roomTypeToProperty, currency: this.currency });
    if (plan.error) {
      return plan;
    }
    const bookings = [];
    for (const booking of plan.bookings) {
      const property = await this.bookings.getDomitsPropertyContext(booking.domitsPropertyId);
      if (!property?.hostId) {
        return { error: RESERVATION_ERROR.ROOM_TYPE_NOT_LINKED };
      }
      bookings.push({ ...booking, hostId: property.hostId });
    }
    return { bookings };
  }

  async #saveRoom(bookingId, booking) {
    const stay = {
      guestName: booking.guestName,
      arrivalDateMs: booking.arrivalDateMs,
      departureDateMs: booking.departureDateMs,
      totalPrice: booking.totalPrice,
      guestCount: booking.guestCount,
    };
    const newNights = nightsChange(booking.domitsPropertyId, booking.arrivalDateMs, booking.departureDateMs);
    const existing = await this.bookings.getBookingById(bookingId);
    if (existing) {
      await this.bookings.updateImportedBooking({
        bookingId,
        ...stay,
        channexChanges: [nightsOfBooking(existing), newNights],
      });
      return;
    }
    await this.bookings.createExternalBooking({
      bookingId,
      propertyId: booking.domitsPropertyId,
      hostId: booking.hostId,
      externalReservationId: booking.roomKey,
      ...stay,
      bookingSource: booking.bookingSource,
      channexChanges: [newNights],
    });
  }

  async #cancelRooms(bookingIds) {
    for (const bookingId of bookingIds) {
      const booking = await this.bookings.getBookingById(bookingId);
      if (booking && booking.status !== BOOKING_CANCELLED) {
        await this.bookings.cancelImportedBooking(bookingId, [nightsOfBooking(booking)], this.now());
      }
    }
  }

  async #saveLink(account, reservation, { link = null, bookings = [], roomKeys, status }) {
    if (status === LINK_STATUS.CANCELLED && !link) {
      return;
    }
    const first = bookings[0];
    await this.resLinks.upsert({
      integrationAccountId: account.id,
      channel: SITEMINDER_CHANNEL,
      externalReservationId: reservation.siteMinderId,
      domitsPropertyId: first?.domitsPropertyId,
      guestName: first?.guestName ?? undefined,
      checkInAt: bookings.length ? Math.min(...bookings.map((booking) => booking.arrivalDateMs)) : undefined,
      checkOutAt: bookings.length ? Math.max(...bookings.map((booking) => booking.departureDateMs)) : undefined,
      reservationStatus: status,
      rawPayload: JSON.stringify({ roomKeys: roomKeys ?? bookings.map((booking) => booking.roomKey) }),
    });
  }

  #confirmation(reservation, bookingId) {
    return {
      confirmation: {
        status: reservation.status,
        messageId: reservation.messageId,
        bookingId,
        processedAt: new Date(this.now()).toISOString(),
      },
    };
  }
}

export default SiteMinderReservationImporter;
