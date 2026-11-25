import { describe, expect, jest, test } from "@jest/globals";
import { createSiteMinderServices } from "../../functions/SiteMinder-Integration/business/createSiteMinderServices.js";
import { SiteMinderReservationsReader } from "../../functions/SiteMinder-Integration/business/siteMinderReservationsReader.js";
import { SiteMinderReservationSync } from "../../functions/SiteMinder-Integration/business/siteMinderReservationSync.js";
import { SITEMINDER_BOOKING_PROFILE } from "../../functions/SiteMinder-Integration/util/reservationBookings.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

describe("createSiteMinderServices", () => {
  test("gives a reservations reader that logs in with the PMS code and the secret", async () => {
    const secretRepository = { getCredentials: jest.fn(async () => ({ username: "user", password: "pass" })) };

    const services = await createSiteMinderServices({ env: { SITEMINDER_PMS_CODE: "PMSXTEST" }, secretRepository });

    expect(services.reservations).toBeInstanceOf(SiteMinderReservationsReader);
    expect(services.reservations.soapClient).toMatchObject({ pmsCode: "PMSXTEST", username: "user", password: "pass" });
  });

  test("gives a reservation sync that saves bookings with the SiteMinder profile in the configured currency", async () => {
    const secretRepository = { getCredentials: jest.fn(async () => ({ username: "user", password: "pass" })) };

    const services = await createSiteMinderServices({
      env: { SITEMINDER_PMS_CODE: "PMSXTEST", SITEMINDER_CURRENCY: "USD" },
      secretRepository,
    });

    expect(services.reservationSync).toBeInstanceOf(SiteMinderReservationSync);
    expect(services.reservationSync.reader).toBe(services.reservations);
    expect(services.reservationSync.importer.bookings.profile).toBe(SITEMINDER_BOOKING_PROFILE);
    expect(services.reservationSync.importer.currency).toBe("USD");
  });
});
