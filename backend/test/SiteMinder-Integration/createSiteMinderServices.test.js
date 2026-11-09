import { describe, expect, jest, test } from "@jest/globals";
import { createSiteMinderServices } from "../../functions/SiteMinder-Integration/business/createSiteMinderServices.js";
import { SiteMinderReservationsReader } from "../../functions/SiteMinder-Integration/business/siteMinderReservationsReader.js";

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
});
