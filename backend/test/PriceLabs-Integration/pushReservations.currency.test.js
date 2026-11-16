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

const pushedReservationIds = () => api.pushReservations.mock.calls[0][2].flatMap((listing) => listing.data).map((entry) => entry.reservation_id);

describe("PriceLabsService.pushReservations currency (#3583)", () => {
  beforeEach(() => jest.spyOn(console, "log").mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  // PriceLabs gets every reservation as euros; a booking paid in pounds would arrive as 250 EUR,
  // so it is left out until there is an exchange rate (decision A).
  test("sends euro bookings and leaves a booking in another currency out", async () => {
    const service = createService([booking("b-eur", "EUR"), booking("b-none", null), booking("b-gbp", "GBP")]);

    const result = await service.pushReservations("host-1");

    expect(pushedReservationIds()).toEqual(["b-eur", "b-none"]);
    expect(result.reservations_pushed).toBe(2);
  });
});
