import { jest } from "@jest/globals";

jest.mock("../../functions/PriceLabs-Integration/business/service/priceLabsApiClient.js", () => ({
  pushReservations: jest.fn(),
}));
jest.mock("../../functions/PriceLabs-Integration/data/repository.js", () => ({ Repository: jest.fn() }));
jest.mock("../../functions/PriceLabs-Integration/data/systemManagerRepository.js", () => ({
  SystemManagerRepository: jest.fn(),
}));

import * as api from "../../functions/PriceLabs-Integration/business/service/priceLabsApiClient.js";
import { Repository } from "../../functions/PriceLabs-Integration/data/repository.js";
import { SystemManagerRepository } from "../../functions/PriceLabs-Integration/data/systemManagerRepository.js";
import { PriceLabsService } from "../../functions/PriceLabs-Integration/business/service/priceLabsService.js";

const booking = (id, currency) => ({
  id,
  property_id: "prop-1",
  status: "Paid",
  arrivaldate: Date.parse("2026-12-10T00:00:00Z"),
  departuredate: Date.parse("2026-12-12T00:00:00Z"),
  createdat: Date.parse("2026-11-01T00:00:00Z"),
  total_price: 250,
  currency,
});

const createService = (bookings) => {
  Repository.mockImplementation(() => ({
    getConnectionByHost: jest.fn().mockResolvedValue({ is_active: true, last_listings_sync_at: 1 }),
    getBookingsByHost: jest.fn().mockResolvedValue(bookings),
    getPropertiesByHost: jest.fn().mockResolvedValue([{ id: "prop-1", cleaning_fee: null }]),
    updateSyncStatus: jest.fn().mockResolvedValue(undefined),
  }));
  SystemManagerRepository.mockImplementation(() => ({ getParameter: jest.fn().mockResolvedValue("value") }));
  api.pushReservations.mockResolvedValue({ success: [] });
  return new PriceLabsService();
};

const pushedEntries = () => api.pushReservations.mock.calls[0][2].flatMap((listing) => listing.data);
const pushedEntry = (id) => pushedEntries().find((entry) => entry.reservation_id === id);

describe("PriceLabsService.pushReservations currency (#3583)", () => {
  // Clear the recorded calls, so each test reads its own push and not the one of the test before.
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  // Every reservation goes to PriceLabs as euros, so an amount in pounds must not be sent. The booking
  // itself still is: PriceLabs updates reservations by id, so one left out would keep its old entry,
  // also after a cancel. Amount 0 is what PriceLabs received for it before the currency was stored.
  test("sends a booking in another currency with amount 0 and euro bookings with their amount", async () => {
    const service = createService([booking("b-eur", "EUR"), booking("b-none", null), booking("b-gbp", "GBP")]);

    const result = await service.pushReservations("host-1");

    expect(pushedEntries().map((entry) => entry.reservation_id)).toEqual(["b-eur", "b-none", "b-gbp"]);
    expect(pushedEntry("b-eur").total_cost).toBe(250);
    expect(pushedEntry("b-none").total_cost).toBe(250);
    expect(pushedEntry("b-gbp").total_cost).toBe(0);
    expect(result.reservations_pushed).toBe(3);
  });

  test("keeps sending the status of a booking in another currency, so a cancel reaches PriceLabs", async () => {
    const service = createService([{ ...booking("b-gbp", "GBP"), status: "Cancelled" }]);

    await service.pushReservations("host-1");

    expect(pushedEntry("b-gbp")).toEqual(expect.objectContaining({ status: "canceled" }));
  });
});
