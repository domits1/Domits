import { describe, it, expect, beforeEach } from "@jest/globals";
import { persistBookingComCanonicalReservation } from "../../functions/General-Bookings-CRUD-Bookings-develop/business/bookingComService.js";
import {
  Channel,
  ReservationStatus,
} from "../../functions/General-Bookings-CRUD-Bookings-develop/business/bookingComCanonicalModel.js";

describe("Booking.com persistence service", () => {
  beforeEach(() => {
    process.env.TEST = "true";
  });

  it("should persist canonical reservation, guest, financial and optional cancellation using a provided manager", async () => {
    const inserts = [];

    const mockManager = {
      createQueryBuilder: () => ({
        insert: () => ({
          into: (table) => ({
            values: (value) => ({
              execute: async () => {
                inserts.push({
                  // In tests we don't rely on TypeORM metadata; just capture the raw value
                  table,
                  value,
                });
              },
            }),
          }),
        }),
      }),
    };

    const canonical = {
      reservation: {
        externalId: "R123",
        channel: Channel.BOOKING_COM,
        version: "1.0",
        propertyId: "prop-1",
        bookingId: null,
        checkInDate: "2025-01-01T00:00:00.000Z",
        checkOutDate: "2025-01-05T00:00:00.000Z",
        status: ReservationStatus.CONFIRMED,
        units: [],
        ratePlan: null,
        availabilityWindows: [],
        createdAt: "2024-12-01T00:00:00.000Z",
        updatedAt: "2024-12-02T00:00:00.000Z",
        meta: { warnings: [] },
      },
      guest: {
        fullName: "John Doe",
        email: "john@example.com",
        phone: "+49123",
        country: "DE",
        raw: { some: "guest" },
      },
      financialTransaction: {
        totalAmount: 100,
        currency: "EUR",
        taxAmount: 10,
        feesAmount: 5,
        multiCurrency: false,
        originalCurrency: null,
        originalAmount: null,
        raw: { some: "financial" },
      },
      cancellation: {
        type: "FULL",
        effectiveDate: "2024-12-31T00:00:00.000Z",
        reason: "Guest cancelled",
        raw: { some: "cancellation" },
      },
      units: [],
      ratePlans: [],
      availabilityWindows: [],
      meta: { warnings: [] },
    };

    const result = await persistBookingComCanonicalReservation(canonical, {
      transactionManager: mockManager,
    });

    expect(result).toHaveProperty("channelReservationId");
    expect(typeof result.channelReservationId).toBe("string");

    const reservationInsert = inserts.find(
      (i) => i.value.externalid === "R123"
    );
    const guestInsert = inserts.find(
      (i) => i.value.fullname === "John Doe"
    );
    const financialInsert = inserts.find(
      (i) => i.value.totalamount === 100
    );
    const cancellationInsert = inserts.find(
      (i) => i.value.type === "FULL"
    );

    expect(reservationInsert).toBeDefined();
    expect(reservationInsert.value.externalid).toBe("R123");
    expect(reservationInsert.value.channel).toBe(Channel.BOOKING_COM);
    expect(reservationInsert.value.property_id).toBe("prop-1");

    expect(guestInsert).toBeDefined();
    expect(guestInsert.value.fullname).toBe("John Doe");
    expect(guestInsert.value.email).toBe("john@example.com");

    expect(financialInsert).toBeDefined();
    expect(financialInsert.value.totalamount).toBe(100);
    expect(financialInsert.value.currency).toBe("EUR");

    expect(cancellationInsert).toBeDefined();
    expect(cancellationInsert.value.type).toBe("FULL");
    expect(cancellationInsert.value.reason).toBe("Guest cancelled");
  });

  it("should not insert cancellation when canonical.cancellation is null", async () => {
    const inserts = [];

    const mockManager = {
      createQueryBuilder: () => ({
        insert: () => ({
          into: (table) => ({
            values: (value) => ({
              execute: async () => {
                inserts.push({
                  table,
                  value,
                });
              },
            }),
          }),
        }),
      }),
    };

    const canonical = {
      reservation: {
        externalId: "R123",
        channel: Channel.BOOKING_COM,
        version: "1.0",
        propertyId: null,
        bookingId: null,
        checkInDate: "2025-01-01T00:00:00.000Z",
        checkOutDate: "2025-01-05T00:00:00.000Z",
        status: ReservationStatus.CONFIRMED,
        units: [],
        ratePlan: null,
        availabilityWindows: [],
        createdAt: "2024-12-01T00:00:00.000Z",
        updatedAt: "2024-12-02T00:00:00.000Z",
        meta: { warnings: [] },
      },
      guest: {
        fullName: "John Doe",
        email: "john@example.com",
        phone: "+49123",
        country: "DE",
        raw: { some: "guest" },
      },
      financialTransaction: {
        totalAmount: 100,
        currency: "EUR",
        taxAmount: 10,
        feesAmount: 5,
        multiCurrency: false,
        originalCurrency: null,
        originalAmount: null,
        raw: { some: "financial" },
      },
      cancellation: null,
      units: [],
      ratePlans: [],
      availabilityWindows: [],
      meta: { warnings: [] },
    };

    await persistBookingComCanonicalReservation(canonical, {
      transactionManager: mockManager,
    });

    const cancellationInsert = inserts.find(
      (i) => i.value && i.value.type === "FULL"
    );
    expect(cancellationInsert).toBeUndefined();
  });
});

