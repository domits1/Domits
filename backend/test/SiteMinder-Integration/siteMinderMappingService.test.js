import { describe, expect, jest, test } from "@jest/globals";
import { SiteMinderMappingService } from "../../functions/SiteMinder-Integration/business/siteMinderMappingService.js";
import { fakeTables, PMSXTEST1_ROOM_RATES } from "./siteMinderFakeTables.js";

const build = ({ roomRates = PMSXTEST1_ROOM_RATES, hostId = "host-1", tables = fakeTables() } = {}) => {
  const restClient = { getRoomRates: jest.fn(async () => roomRates) };
  const propertyLookup = { getDomitsPropertyContext: jest.fn(async (id) => (id === "missing" ? null : { propertyId: id, hostId })) };
  let n = 0;
  const service = new SiteMinderMappingService({
    ...tables,
    restClient,
    propertyLookup,
    pmsCode: "PMSXTEST",
    credentialsRef: "domits/siteminder/pmsxchange",
    now: () => 1000,
    newId: () => `account-${(n += 1)}`,
  });
  return { service, tables, restClient };
};

const sync = (service, overrides = {}) => service.syncHotel({ userId: "host-1", domitsPropertyId: "property-1", hotelCode: "PMSXTEST1", ...overrides });

describe("SiteMinderMappingService.syncHotel", () => {
  test("creates a SITEMINDER account and stores the hotel, its room types and rate plans", async () => {
    const { service, tables, restClient } = build();

    const result = await sync(service);

    expect(restClient.getRoomRates).toHaveBeenCalledWith("PMSXTEST1");
    expect(tables.rows.accounts).toEqual([
      expect.objectContaining({ id: "account-1", userId: "host-1", channel: "SITEMINDER", externalAccountId: "PMSXTEST", status: "CONNECTED", credentialsRef: "domits/siteminder/pmsxchange" }),
    ]);
    expect(tables.rows.props).toEqual([
      expect.objectContaining({ integrationAccountId: "account-1", domitsPropertyId: "property-1", externalPropertyId: "PMSXTEST1", status: "ACTIVE" }),
    ]);
    expect(tables.rows.roomTypes.map((row) => [row.externalRoomTypeId, row.externalRoomTypeName])).toEqual([
      ["DORM", "Dormitory Room"],
      ["FAM", "Family Room"],
    ]);
    expect(tables.rows.ratePlans.map((row) => `${row.externalRoomTypeId}/${row.externalRatePlanId}`)).toEqual(["DORM/NonRef1", "DORM/BAR1", "FAM/BAR"]);
    expect(result).toEqual({ hotelCode: "PMSXTEST1", integrationAccountId: "account-1", roomTypes: 2, ratePlans: 3, deactivated: 0 });
  });

  test("reuses the host's SiteMinder account on a second sync", async () => {
    const { service, tables } = build();

    await sync(service);
    await sync(service);

    expect(tables.rows.accounts).toHaveLength(1);
    expect(tables.rows.ratePlans).toHaveLength(3);
  });

  test("deactivates room types and rate plans that SiteMinder no longer returns", async () => {
    const tables = fakeTables();
    await sync(build({ tables }).service);

    const result = await sync(build({ tables, roomRates: [PMSXTEST1_ROOM_RATES[1]] }).service);

    const status = (rows, code) => rows.filter((row) => `${row.externalRoomTypeId}/${row.externalRatePlanId ?? ""}`.startsWith(code)).map((row) => row.status);
    expect(status(tables.rows.roomTypes, "FAM")).toEqual(["INACTIVE"]);
    expect(status(tables.rows.ratePlans, "DORM/NonRef1")).toEqual(["INACTIVE"]);
    expect(status(tables.rows.ratePlans, "DORM/BAR1")).toEqual(["ACTIVE"]);
    expect(result.deactivated).toBe(3);
  });

  test("refuses a property the user does not own, without calling SiteMinder", async () => {
    const { service, restClient } = build({ hostId: "someone-else" });

    await expect(sync(service)).rejects.toMatchObject({ code: "SITEMINDER_MAPPING_PROPERTY_NOT_OWNED" });
    expect(restClient.getRoomRates).not.toHaveBeenCalled();
  });

  test("refuses a property that does not exist", async () => {
    const { service } = build();

    await expect(sync(service, { domitsPropertyId: "missing" })).rejects.toMatchObject({ code: "SITEMINDER_MAPPING_PROPERTY_NOT_FOUND" });
  });

  test("refuses a hotel that is already mapped to another Domits property", async () => {
    const tables = fakeTables();
    await sync(build({ tables }).service);

    const second = build({ tables }).service;
    await expect(sync(second, { domitsPropertyId: "property-2" })).rejects.toMatchObject({ code: "SITEMINDER_HOTEL_ALREADY_MAPPED" });
  });

  test("stores nothing when SiteMinder returns no room rates for the hotel", async () => {
    const { service, tables } = build({ roomRates: [] });

    await expect(sync(service)).rejects.toMatchObject({ code: "SITEMINDER_HOTEL_HAS_NO_ROOM_RATES" });
    expect(tables.rows.props).toEqual([]);
  });

  test.each([
    ["userId", { userId: "" }],
    ["domitsPropertyId", { domitsPropertyId: " " }],
    ["hotelCode", { hotelCode: undefined }],
  ])("refuses an empty %s", async (label, overrides) => {
    const { service } = build();

    await expect(sync(service, overrides)).rejects.toThrow(`${label} is required`);
  });
});
