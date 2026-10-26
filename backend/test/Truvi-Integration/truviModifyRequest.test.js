import { describe, expect, it } from "@jest/globals";
import { sameTruviDates, toModifyRequest } from "../../functions/Truvi-Integration/util/truviMapper.js";

describe("toModifyRequest", () => {
  it("sends both dates as yyyy-MM-dd with a fresh echo token", () => {
    const request = toModifyRequest({
      verificationId: "9c1f7a20-5b84-4d6e-8a13-7f0c2b95e4d1",
      reservationId: "RES-88213",
      arrivaldate: Date.UTC(2027, 8, 17),
      departuredate: Date.UTC(2027, 8, 22),
      now: new Date(Date.UTC(2026, 8, 4, 9, 15, 2, 360)),
    });

    expect(request).toEqual({
      metadata: { timeStamp: "2026-09-04T09:15:02.36", echoToken: expect.any(String) },
      verification: { verificationId: "9c1f7a20-5b84-4d6e-8a13-7f0c2b95e4d1" },
      reservation: { reservationId: "RES-88213", checkIn: "2027-09-17", checkOut: "2027-09-22" },
    });
    expect(request.metadata.echoToken).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("refuses a request without both ids", () => {
    expect(() => toModifyRequest({ reservationId: "RES-1", arrivaldate: 0, departuredate: 0 })).toThrow(
      "verificationId and reservationId are required"
    );
  });
});

describe("sameTruviDates", () => {
  it("compares on the date only", () => {
    const sent = { arrivaldate: Date.UTC(2026, 10, 18), departuredate: Date.UTC(2026, 10, 22) };
    expect(sameTruviDates(sent, { arrivaldate: Date.UTC(2026, 10, 18, 14), departuredate: Date.UTC(2026, 10, 22, 10) })).toBe(true);
    expect(sameTruviDates(sent, { arrivaldate: Date.UTC(2026, 10, 19), departuredate: Date.UTC(2026, 10, 22) })).toBe(false);
  });
});
