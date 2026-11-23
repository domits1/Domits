import { describe, expect, it, jest } from "@jest/globals";
import Database from "database";
import { TruviBookingRepository } from "../../functions/Truvi-Integration/data/truviBookingRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

describe("TruviBookingRepository.listVerificationsToModify", () => {
  it("lists Truvi verifications whose booking dates differ from the dates Truvi has", async () => {
    const query = jest.fn(async () => [
      {
        bookingid: "booking-1",
        providerassessmentid: "v-1",
        sent_arrivaldate: "1000",
        sent_departuredate: null,
        arrivaldate: "2000",
        departuredate: "3000",
      },
    ]);
    Database.getInstance.mockResolvedValue({ query, options: {} });

    const result = await new TruviBookingRepository().listVerificationsToModify({ now: 500, limit: 5 });

    expect(result).toEqual([
      {
        bookingId: "booking-1",
        verificationId: "v-1",
        sent: { arrivaldate: 1000, departuredate: null },
        current: { arrivaldate: 2000, departuredate: 3000 },
      },
    ]);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("FROM test.guest_risk_assessment g");
    expect(sql).toContain("b.departuredate > $7");
    expect(sql).toContain("g.arrivaldate <> b.arrivaldate OR g.departuredate <> b.departuredate");
    expect(params).toEqual(["truvi", "PASSED", "FLAGGED", "FAILED", "Cancelled", "Canceled", 500, 5]);
  });
});
