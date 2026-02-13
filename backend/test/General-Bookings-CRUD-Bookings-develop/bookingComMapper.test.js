import { describe, it, expect } from "@jest/globals";
import {
  normalizeBookingComStatus,
  mapBookingComPayloadToCanonical,
} from "../../functions/General-Bookings-CRUD-Bookings-develop/util/mapping/bookingComMapper.js";
import {
  ReservationStatus,
  CancellationType,
  Channel,
} from "../../functions/General-Bookings-CRUD-Bookings-develop/business/bookingComCanonicalModel.js";
import { validateBookingComPayload } from "../../functions/General-Bookings-CRUD-Bookings-develop/business/bookingComValidation.js";
import TypeException from "../../functions/General-Bookings-CRUD-Bookings-develop/util/exception/TypeException.js";

describe("Booking.com mapper - status normalization", () => {
  it("should normalize known statuses", () => {
    expect(normalizeBookingComStatus("BOOKED")).toBe(ReservationStatus.CONFIRMED);
    expect(normalizeBookingComStatus("CANCELLED_BY_GUEST")).toBe(ReservationStatus.CANCELLED);
    expect(normalizeBookingComStatus("NO_SHOW")).toBe(ReservationStatus.NO_SHOW);
    expect(normalizeBookingComStatus("PENDING")).toBe(ReservationStatus.PENDING);
  });

  it("should fall back to UNKNOWN for unexpected statuses", () => {
    expect(normalizeBookingComStatus("SOMETHING_ELSE")).toBe(ReservationStatus.UNKNOWN);
    expect(normalizeBookingComStatus(undefined)).toBe(ReservationStatus.UNKNOWN);
  });
});

describe("Booking.com mapper - happy path", () => {
  const basePayload = {
    reservation_id: "R123",
    arrival_date: "2025-01-01",
    departure_date: "2025-01-05",
    status: "BOOKED",
    total_price: "150.00",
    currency_code: "EUR",
    guest_name: "John Doe",
    guest_email: "john@example.com",
    guest_phone: "+4912345",
    guest_country: "DE",
    rooms: [
      {
        id: "ROOM1",
        name: "Standard Room",
        occupancy: 2,
      },
    ],
    rate_plans: [
      {
        id: "RP1",
        name: "Standard Rate",
        type: "STANDARD",
      },
    ],
  };

  it("should map a full Booking.com payload to canonical mapping", () => {
    const validated = validateBookingComPayload(basePayload);
    const canonical = mapBookingComPayloadToCanonical(validated);

    expect(canonical.reservation.externalId).toBe("R123");
    expect(canonical.reservation.channel).toBe(Channel.BOOKING_COM);
    expect(canonical.reservation.status).toBe(ReservationStatus.CONFIRMED);
    expect(canonical.reservation.checkInDate).toContain("2025-01-01");
    expect(canonical.reservation.checkOutDate).toContain("2025-01-05");

    expect(canonical.guest.fullName).toBe("John Doe");
    expect(canonical.guest.email).toBe("john@example.com");
    expect(canonical.guest.phone).toBe("+4912345");
    expect(canonical.guest.country).toBe("DE");

    expect(canonical.financialTransaction.totalAmount).toBe(150);
    expect(canonical.financialTransaction.currency).toBe("EUR");
    expect(canonical.financialTransaction.multiCurrency).toBe(false);

    expect(canonical.units).toHaveLength(1);
    expect(canonical.units[0].externalId).toBe("ROOM1");
    expect(canonical.ratePlans).toHaveLength(1);
    expect(canonical.reservation.ratePlan.externalId).toBe("RP1");

    expect(Array.isArray(canonical.availabilityWindows)).toBe(true);
    expect(canonical.meta.warnings).toEqual([]);
  });
});

describe("Booking.com mapper - edge cases", () => {
  it("should handle missing guest information", () => {
    const payload = {
      reservation_id: "R123",
      arrival_date: "2025-01-01",
      departure_date: "2025-01-05",
      status: "BOOKED",
      total_price: "100",
      currency_code: "USD",
    };

    const validated = validateBookingComPayload(payload);
    const canonical = mapBookingComPayloadToCanonical(validated);

    expect(canonical.guest.fullName).toBe("Unknown Guest");
    expect(canonical.meta.warnings.some((w) => w.includes("Unknown Guest"))).toBe(true);
  });

  it("should detect multi-currency reservations", () => {
    const payload = {
      reservation_id: "R123",
      arrival_date: "2025-01-01",
      departure_date: "2025-01-05",
      status: "BOOKED",
      total_price: "200",
      currency_code: "USD",
      original_currency: "EUR",
      original_amount: "180",
    };

    const validated = validateBookingComPayload(payload);
    const canonical = mapBookingComPayloadToCanonical(validated);

      expect(canonical.financialTransaction.multiCurrency).toBe(true);
      expect(canonical.financialTransaction.originalCurrency).toBe("EUR");
      expect(canonical.meta.warnings.some((w) => w.toLowerCase().includes("multi-currency"))).toBe(true);
  });

  it("should detect partial cancellations without flipping status", () => {
    const payload = {
      reservation_id: "R123",
      arrival_date: "2025-01-01",
      departure_date: "2025-01-05",
      status: "BOOKED",
      total_price: "100",
      currency_code: "USD",
      cancellation: {
        partial: true,
        effective_date: "2024-12-31T00:00:00.000Z",
        reason: "Partial room cancellation",
      },
    };

    const validated = validateBookingComPayload(payload);
    const canonical = mapBookingComPayloadToCanonical(validated);

    expect(canonical.cancellation).not.toBeNull();
    expect(canonical.cancellation.type).toBe(CancellationType.PARTIAL);
    expect(canonical.reservation.status).toBe(ReservationStatus.CONFIRMED);
  });
});

describe("Booking.com validation - enum & date validation", () => {
  it("should coerce invalid status to UNKNOWN in mapper", () => {
    const payload = {
      reservation_id: "R123",
      arrival_date: "2025-01-01",
      departure_date: "2025-01-05",
      status: "WEIRD_STATUS",
      total_price: "100",
      currency_code: "USD",
    };

    const validated = validateBookingComPayload(payload);
    const canonical = mapBookingComPayloadToCanonical(validated);

    expect(canonical.reservation.status).toBe(ReservationStatus.UNKNOWN);
  });

  it("should throw when arrival_date >= departure_date", () => {
    const payload = {
      reservation_id: "R123",
      arrival_date: "2025-01-05",
      departure_date: "2025-01-05",
      status: "BOOKED",
      total_price: "100",
      currency_code: "USD",
    };

    expect(() => validateBookingComPayload(payload)).toThrow(TypeException);
  });

  it("should throw when dates are invalid", () => {
    const payload = {
      reservation_id: "R123",
      arrival_date: "invalid-date",
      departure_date: "also-invalid",
      status: "BOOKED",
      total_price: "100",
      currency_code: "USD",
    };

    expect(() => validateBookingComPayload(payload)).toThrow(TypeException);
  });

  it("should throw when currency is invalid", () => {
    const payload = {
      reservation_id: "R123",
      arrival_date: "2025-01-01",
      departure_date: "2025-01-05",
      status: "BOOKED",
      total_price: "100",
      currency_code: "BADCURR",
    };

    expect(() => validateBookingComPayload(payload)).toThrow(TypeException);
  });
});

