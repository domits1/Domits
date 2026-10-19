import { describe, expect, it, jest } from "@jest/globals";
import Database from "database";
import { TruviBookingRepository } from "../../functions/Truvi-Integration/data/truviBookingRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

describe("TruviBookingRepository.listVerificationsToCancel", () => {
  it("lists Truvi verifications of cancelled bookings that are not cancelled or refused yet", async () => {
    const query = jest.fn(async () => [{ bookingid: "booking-1", providerassessmentid: "v-1" }]);
    Database.getInstance.mockResolvedValue({ query, options: {} });

    const result = await new TruviBookingRepository().listVerificationsToCancel({ limit: 5 });

    expect(result).toEqual([{ bookingId: "booking-1", verificationId: "v-1" }]);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("test.guest_risk_assessment g");
    expect(sql).toContain("JOIN test.booking b ON b.id = g.bookingid");
    expect(sql).toContain("g.providerassessmentid IS NOT NULL");
    expect(params).toEqual(["truvi", "CANCELLED", "CANCEL_REFUSED", "Cancelled", "Canceled", 5]);
  });

  it("caps the limit and returns an empty list when nothing matches", async () => {
    const query = jest.fn(async () => []);
    Database.getInstance.mockResolvedValue({ query, options: {} });

    const result = await new TruviBookingRepository().listVerificationsToCancel({ limit: 500 });

    expect(result).toEqual([]);
    expect(query.mock.calls[0][1].at(-1)).toBe(50);
  });
});
