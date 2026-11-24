import { describe, expect, jest, test } from "@jest/globals";
import { SiteMinderMappingService } from "../../functions/SiteMinder-Integration/business/siteMinderMappingService.js";
import { MappingConflictError } from "../../functions/.shared/integrations/repositories/integrationPropertyRepository.js";
import { fakeTables, PMSXTEST1_ROOM_RATES } from "./siteMinderFakeTables.js";

// The shared mapping repository refuses a second in-use mapping for a listing (design note D2, #506).
// SiteMinder has no flow to move a listing to another hotel, so the refusal stays, with its own code
// like the other SiteMinder mapping checks.
describe("SiteMinderMappingService.syncRoomType for a listing already linked to another hotel", () => {
  test("refuses with SITEMINDER_PROPERTY_ALREADY_MAPPED and links no room type", async () => {
    const tables = fakeTables();
    tables.props.upsert = jest.fn(async () => {
      throw new MappingConflictError("OTHER-HOTEL");
    });
    const service = new SiteMinderMappingService({
      ...tables,
      restClient: { getRoomRates: jest.fn(async () => PMSXTEST1_ROOM_RATES) },
      propertyLookup: { getDomitsPropertyContext: jest.fn(async (id) => ({ propertyId: id, hostId: "host-1" })) },
      pmsCode: "PMSXTEST",
      credentialsRef: "domits/siteminder/pmsxchange",
      now: () => 1000,
      newId: () => "account-1",
      logger: { warn: jest.fn() },
    });

    await expect(
      service.syncRoomType({ userId: "host-1", domitsPropertyId: "property-1", hotelCode: "PMSXTEST1", roomTypeCode: "DORM" })
    ).rejects.toMatchObject({ code: "SITEMINDER_PROPERTY_ALREADY_MAPPED" });
    expect(tables.rows.roomTypes).toEqual([]);
  });
});
