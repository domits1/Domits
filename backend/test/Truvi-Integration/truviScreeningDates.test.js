import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import Database from "database";
import { GuestRiskAssessmentRepository } from "../../functions/Truvi-Integration/data/guestRiskAssessmentRepository.js";
import { TruviBookingScreener } from "../../functions/Truvi-Integration/business/truviBookingScreener.js";
import { TruviBookingModifier } from "../../functions/Truvi-Integration/business/truviBookingModifier.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const D1 = { arrivaldate: Date.UTC(2026, 11, 1), departuredate: Date.UTC(2026, 11, 5) };
const D2 = { arrivaldate: Date.UTC(2026, 11, 3), departuredate: Date.UTC(2026, 11, 8) };
const NOW = Date.UTC(2026, 9, 26, 10, 0, 0);

const candidate = () => ({
  booking: { id: "booking-1", ...D1, createdat: Date.UTC(2026, 9, 6), guestname: "John Doe", guest_email: "john@example.com" },
  property: { id: "property-1", title: "Villa Zon" },
  location: { street: "Kinderhuissingel", housenumber: 6, city: "Haarlem", country: "Netherlands", postalcode: "2013AS" },
  rules: [],
  guestId: "guest-1",
  hostId: "host-1",
  hostName: "Host BV",
  bookingSource: null,
});

const memoryTable = () => {
  const rows = new Map();
  const findOne = jest.fn(async ({ where }) => rows.get(where.id) ?? null);
  const save = jest.fn(async (row) => {
    rows.set(row.id, { ...rows.get(row.id), ...row });
    return row;
  });
  const update = jest.fn(async ({ id }, changes) => rows.set(id, { ...rows.get(id), ...changes }));
  Database.getInstance.mockResolvedValue({ getRepository: jest.fn(() => ({ findOne, save, update })) });
  return rows;
};

const PASSED = { providerAssessmentId: "v-1", status: "PASSED", flaggedReason: null };

const screen = async (assessmentRepository, result = PASSED) => {
  const screener = new TruviBookingScreener({
    bookingRepository: { listBookingsToScreen: jest.fn(async () => [candidate()]) },
    screeningService: { screenBooking: jest.fn(async () => result) },
    assessmentRepository,
    contactLookup: { getGuestEmail: jest.fn(), getHost: jest.fn(async () => ({ name: "Host BV", email: "host@example.com" })) },
    extendedAmount: 1000,
  });
  await screener.run({ now: NOW });
};

describe("screening saves the dates it sent to Truvi", () => {
  beforeEach(() => jest.clearAllMocks());

  it("stores the booking dates of the create request on the new row", async () => {
    const rows = memoryTable();

    await screen(new GuestRiskAssessmentRepository());

    expect(rows.get("truvi:booking-1")).toEqual(
      expect.objectContaining({ providerAssessmentId: "v-1", arrivalDate: D1.arrivaldate, departureDate: D1.departuredate })
    );
  });

  it("stores no dates when no verification was created at Truvi", async () => {
    const rows = memoryTable();

    await screen(new GuestRiskAssessmentRepository(), {
      providerAssessmentId: null,
      status: "ERROR",
      flaggedReason: null,
      error: { status: 400, message: "checkIn must not be in the past." },
    });

    expect(rows.get("truvi:booking-1")).toEqual(expect.objectContaining({ arrivalDate: null, departureDate: null }));
  });

  it("screened with D1, booking now on D2: the first modify run calls Truvi with D2", async () => {
    const rows = memoryTable();
    const assessmentRepository = new GuestRiskAssessmentRepository();
    await screen(assessmentRepository);
    const saved = rows.get("truvi:booking-1");

    const apiClient = { modifyVerification: jest.fn(async () => ({ metadata: {} })) };
    const modifier = new TruviBookingModifier({
      bookingRepository: {
        listVerificationsToModify: jest.fn(async () => [
          {
            bookingId: "booking-1",
            verificationId: saved.providerAssessmentId,
            sent: { arrivaldate: saved.arrivalDate, departuredate: saved.departureDate },
            current: D2,
          },
        ]),
      },
      apiClient,
      assessmentRepository,
    });

    const summary = await modifier.run({ now: NOW });

    expect(apiClient.modifyVerification).toHaveBeenCalledTimes(1);
    expect(apiClient.modifyVerification.mock.calls[0][0].reservation).toEqual({
      reservationId: "booking-1",
      checkIn: "2026-12-03",
      checkOut: "2026-12-08",
    });
    expect(summary).toEqual(expect.objectContaining({ modified: 1, recorded: 0 }));
    expect(rows.get("truvi:booking-1")).toEqual(
      expect.objectContaining({ arrivalDate: D2.arrivaldate, departureDate: D2.departuredate, errorMessage: null })
    );
  });
});
