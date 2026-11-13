import { describe, expect, jest, test } from "@jest/globals";
import { SiteMinderMappingService } from "../../functions/SiteMinder-Integration/business/siteMinderMappingService.js";
import { fakeTables, PMSXTEST1_ROOM_RATES } from "./siteMinderFakeTables.js";

const build = ({ roomRates = PMSXTEST1_ROOM_RATES, hostId = "host-1", tables = fakeTables(), logger = { warn: jest.fn() }, accountPrefix = "account" } = {}) => {
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
    newId: () => `${accountPrefix}-${(n += 1)}`,
    logger,
  });
  return { service, tables, restClient, logger };
};

const sync = (service, overrides = {}) =>
  service.syncRoomType({ userId: "host-1", domitsPropertyId: "property-1", hotelCode: "PMSXTEST1", roomTypeCode: "DORM", ...overrides });

const codes = (rows) => rows.map((row) => `${row.domitsPropertyId}:${row.externalRoomTypeId}${row.externalRatePlanId ? `/${row.externalRatePlanId}` : ""}:${row.status}`);

describe("SiteMinderMappingService.syncRoomType", () => {
  test("creates a SITEMINDER account and links one room type and its rate plans to one Domits property", async () => {
    const { service, tables, restClient } = build();

    const result = await sync(service);

    expect(restClient.getRoomRates).toHaveBeenCalledWith("PMSXTEST1");
    expect(tables.rows.accounts).toEqual([
      expect.objectContaining({ id: "account-1", userId: "host-1", channel: "SITEMINDER", externalAccountId: "PMSXTEST", status: "CONNECTED", credentialsRef: "domits/siteminder/pmsxchange" }),
    ]);
    expect(tables.rows.props).toEqual([
      expect.objectContaining({ integrationAccountId: "account-1", domitsPropertyId: "property-1", externalPropertyId: "PMSXTEST1", status: "ACTIVE" }),
    ]);
    expect(codes(tables.rows.roomTypes)).toEqual(["property-1:DORM:ACTIVE"]);
    expect(tables.rows.roomTypes[0].externalRoomTypeName).toBe("Dormitory Room");
    expect(codes(tables.rows.ratePlans)).toEqual(["property-1:DORM/NonRef1:ACTIVE", "property-1:DORM/BAR1:ACTIVE"]);
    expect(result).toEqual({ hotelCode: "PMSXTEST1", roomTypeCode: "DORM", integrationAccountId: "account-1", ratePlans: 2, deactivated: 0 });
  });

  test("links each room of one hotel to its own Domits property, like one villa per property", async () => {
    const tables = fakeTables();
    const { service } = build({ tables });

    await sync(service);
    await sync(service, { domitsPropertyId: "property-2", roomTypeCode: "FAM" });

    expect(tables.rows.accounts).toHaveLength(1);
    expect(codes(tables.rows.roomTypes)).toEqual(["property-1:DORM:ACTIVE", "property-2:FAM:ACTIVE"]);
    expect(tables.rows.props.map((row) => row.domitsPropertyId)).toEqual(["property-1", "property-2"]);
  });

  test("is safe to run again for the same room and property", async () => {
    const tables = fakeTables();
    const { service } = build({ tables });

    await sync(service);
    const result = await sync(service);

    expect(codes(tables.rows.roomTypes)).toEqual(["property-1:DORM:ACTIVE"]);
    expect(tables.rows.ratePlans).toHaveLength(2);
    expect(result.deactivated).toBe(0);
  });

  test("moves a Domits property to another room and switches the old room and its rate plans off", async () => {
    const tables = fakeTables();
    const { service } = build({ tables });
    await sync(service);

    const result = await sync(service, { roomTypeCode: "FAM" });

    expect(codes(tables.rows.roomTypes)).toEqual(["property-1:DORM:INACTIVE", "property-1:FAM:ACTIVE"]);
    expect(codes(tables.rows.ratePlans)).toEqual([
      "property-1:DORM/NonRef1:INACTIVE",
      "property-1:DORM/BAR1:INACTIVE",
      "property-1:FAM/BAR:ACTIVE",
    ]);
    expect(result.deactivated).toBe(3);
  });

  test("switches off a rate plan that SiteMinder no longer returns for the room", async () => {
    const tables = fakeTables();
    await sync(build({ tables }).service);

    const result = await sync(build({ tables, roomRates: [PMSXTEST1_ROOM_RATES[1]] }).service);

    expect(codes(tables.rows.ratePlans)).toEqual(["property-1:DORM/NonRef1:INACTIVE", "property-1:DORM/BAR1:ACTIVE"]);
    expect(result.deactivated).toBe(1);
  });

  test("refuses a room that is already linked to another Domits property, so one villa never gets two calendars", async () => {
    const tables = fakeTables();
    const { service, restClient } = build({ tables });
    await sync(service);
    restClient.getRoomRates.mockClear();

    await expect(sync(service, { domitsPropertyId: "property-2" })).rejects.toMatchObject({ code: "SITEMINDER_ROOM_TYPE_ALREADY_MAPPED" });
    expect(restClient.getRoomRates).not.toHaveBeenCalled();
    expect(codes(tables.rows.roomTypes)).toEqual(["property-1:DORM:ACTIVE"]);
  });

  test("allows a room again once its old link was switched off", async () => {
    const tables = fakeTables();
    const { service } = build({ tables });
    await sync(service);
    await sync(service, { roomTypeCode: "FAM" });

    await sync(service, { domitsPropertyId: "property-2", roomTypeCode: "DORM" });

    expect(codes(tables.rows.roomTypes)).toContain("property-2:DORM:ACTIVE");
  });

  test("refuses a hotel that belongs to another host", async () => {
    const tables = fakeTables();
    await sync(build({ tables }).service);

    const otherHost = build({ tables, hostId: "host-2", accountPrefix: "other" }).service;
    await expect(
      otherHost.syncRoomType({ userId: "host-2", domitsPropertyId: "property-9", hotelCode: "PMSXTEST1", roomTypeCode: "FAM" })
    ).rejects.toMatchObject({ code: "SITEMINDER_HOTEL_ALREADY_MAPPED" });
  });

  test("refuses a room type that SiteMinder does not have for the hotel", async () => {
    const { service, tables } = build();

    await expect(sync(service, { roomTypeCode: "SUITE" })).rejects.toMatchObject({ code: "SITEMINDER_ROOM_TYPE_NOT_FOUND" });
    expect(tables.rows.props).toEqual([]);
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

  test("logs the hotel code when SiteMinder sends room rates without a roomTypeCode", async () => {
    const { service, logger } = build({ roomRates: [...PMSXTEST1_ROOM_RATES, { ratePlanCode: "BAR" }] });

    await sync(service);

    expect(JSON.parse(logger.warn.mock.calls[0][0])).toMatchObject({ event: "SITEMINDER_ROOM_RATES_SKIPPED", hotelCode: "PMSXTEST1", skipped: 1 });
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
    ["roomTypeCode", { roomTypeCode: "" }],
  ])("refuses an empty %s", async (label, overrides) => {
    const { service } = build();

    await expect(sync(service, overrides)).rejects.toThrow(`${label} is required`);
  });
});
