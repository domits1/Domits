import { describe, expect, jest, test } from "@jest/globals";
import { SiteMinderMappingService } from "../../functions/SiteMinder-Integration/business/siteMinderMappingService.js";
import { SiteMinderInventoryService } from "../../functions/SiteMinder-Integration/business/siteMinderInventoryService.js";
import { fakeTables, PMSXTEST1_ROOM_RATES } from "./siteMinderFakeTables.js";

const DATES = { start: "2026-12-01", end: "2026-12-03" };

const build = async ({ mapped = true } = {}) => {
  const tables = fakeTables();
  if (mapped) {
    await new SiteMinderMappingService({
      ...tables,
      restClient: { getRoomRates: async () => PMSXTEST1_ROOM_RATES },
      propertyLookup: { getDomitsPropertyContext: async (id) => ({ propertyId: id, hostId: "host-1" }) },
      pmsCode: "PMSXTEST",
      credentialsRef: "secret",
      now: () => 1,
      newId: () => "account-1",
    }).syncHotel({ userId: "host-1", domitsPropertyId: "property-1", hotelCode: "PMSXTEST1" });
  }
  const pusher = () => ({ push: jest.fn(async () => ({ success: true, echoToken: "e1" })) });
  const pushers = { availabilityPusher: pusher(), restrictionsPusher: pusher(), ratesPusher: pusher() };
  const service = new SiteMinderInventoryService({ ...tables, ...pushers, currency: "EUR" });
  return { service, tables, ...pushers };
};

describe("SiteMinderInventoryService", () => {
  test("sends availability for a mapped room type", async () => {
    const { service, availabilityPusher } = await build();
    const items = [{ roomTypeCode: "DORM", ...DATES, bookingLimit: 1 }];

    await expect(service.pushAvailability({ hotelCode: "PMSXTEST1", items })).resolves.toEqual({ success: true, echoToken: "e1" });
    expect(availabilityPusher.push).toHaveBeenCalledWith({ hotelCode: "PMSXTEST1", items });
  });

  test("sends restrictions for a mapped room rate", async () => {
    const { service, restrictionsPusher } = await build();

    await service.pushRestrictions({ hotelCode: "PMSXTEST1", items: [{ roomTypeCode: "FAM", ratePlanCode: "BAR", ...DATES, stopSell: true }] });

    expect(restrictionsPusher.push).toHaveBeenCalledTimes(1);
  });

  test("sends rates in the configured currency", async () => {
    const { service, ratesPusher } = await build();

    await service.pushRates({ hotelCode: "PMSXTEST1", items: [{ roomTypeCode: "DORM", ratePlanCode: "BAR1", ...DATES, amount: 150 }] });

    expect(ratesPusher.push.mock.calls[0][0].items[0].currency).toBe("EUR");
  });

  test("refuses another currency, which SiteMinder would accept without converting", async () => {
    const { service, ratesPusher } = await build();
    const items = [{ roomTypeCode: "DORM", ratePlanCode: "BAR1", ...DATES, amount: 150, currency: "USD" }];

    await expect(service.pushRates({ hotelCode: "PMSXTEST1", items })).rejects.toMatchObject({ code: "SITEMINDER_WRONG_CURRENCY" });
    expect(ratesPusher.push).not.toHaveBeenCalled();
  });

  test("refuses an unknown room type or rate plan, which SiteMinder would accept and drop", async () => {
    const { service, availabilityPusher, restrictionsPusher } = await build();

    await expect(
      service.pushAvailability({ hotelCode: "PMSXTEST1", items: [{ roomTypeCode: "SGL", ...DATES, bookingLimit: 1 }] })
    ).rejects.toThrow("room type SGL");
    await expect(
      service.pushRestrictions({ hotelCode: "PMSXTEST1", items: [{ roomTypeCode: "FAM", ratePlanCode: "NonRef1", ...DATES, stopSell: true }] })
    ).rejects.toThrow("rate plan FAM/NonRef1");
    expect(availabilityPusher.push).not.toHaveBeenCalled();
    expect(restrictionsPusher.push).not.toHaveBeenCalled();
  });

  test("refuses a deactivated rate plan", async () => {
    const { service, tables } = await build();
    tables.rows.ratePlans.find((row) => row.externalRatePlanId === "BAR1").status = "INACTIVE";

    await expect(
      service.pushRates({ hotelCode: "PMSXTEST1", items: [{ roomTypeCode: "DORM", ratePlanCode: "BAR1", ...DATES, amount: 150 }] })
    ).rejects.toMatchObject({ code: "SITEMINDER_UNKNOWN_CODES" });
  });

  test("refuses a hotel that is not mapped", async () => {
    const { service } = await build({ mapped: false });

    await expect(
      service.pushAvailability({ hotelCode: "PMSXTEST1", items: [{ roomTypeCode: "DORM", ...DATES, bookingLimit: 1 }] })
    ).rejects.toMatchObject({ code: "SITEMINDER_HOTEL_NOT_MAPPED" });
  });

  test("ignores a hotel code that belongs to another channel", async () => {
    const { service, tables } = await build({ mapped: false });
    tables.rows.accounts.push({ id: "channex-1", channel: "CHANNEX" });
    tables.rows.props.push({ id: "p", integrationAccountId: "channex-1", domitsPropertyId: "x", externalPropertyId: "PMSXTEST1", status: "ACTIVE" });

    await expect(
      service.pushAvailability({ hotelCode: "PMSXTEST1", items: [{ roomTypeCode: "DORM", ...DATES, bookingLimit: 1 }] })
    ).rejects.toMatchObject({ code: "SITEMINDER_HOTEL_NOT_MAPPED" });
  });
});
