import { describe, it, expect, beforeEach } from "@jest/globals";
import { persistBookingComCanonicalReservation } from "../../functions/General-Bookings-CRUD-Bookings-develop/business/bookingComService.js";
import {
  Channel,
  ReservationStatus,
} from "../../functions/General-Bookings-CRUD-Bookings-develop/business/bookingComCanonicalModel.js";
import {
  setupServiceTest,
  findInsertByField,
} from "../util/bookingComFixtures.js";

describe("Booking.com persistence service", () => {
  beforeEach(() => {
    process.env.TEST = "true";
  });

  it("should persist canonical reservation, guest, financial and optional cancellation using a provided manager", async () => {
    const { inserts, mockManager, canonical } = setupServiceTest();

    const result = await persistBookingComCanonicalReservation(canonical, {
      transactionManager: mockManager,
    });

    expect(result).toHaveProperty("channelReservationId");
    expect(typeof result.channelReservationId).toBe("string");

    const reservationInsert = findInsertByField(inserts, "externalid", "R123");
    const guestInsert = findInsertByField(inserts, "fullname", "John Doe");
    const financialInsert = findInsertByField(inserts, "totalamount", 100);
    const cancellationInsert = findInsertByField(inserts, "type", "FULL");


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
    const { inserts, mockManager, canonical } = setupServiceTest({
      reservation: { propertyId: null },
      cancellation: null,
    });

    await persistBookingComCanonicalReservation(canonical, {
      transactionManager: mockManager,
    });

    const cancellationInsert = inserts.find(
      (i) => i.value && i.value.type === "FULL"
    );
    expect(cancellationInsert).toBeUndefined();
  });
});
