jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import Database from "../../.shared/integrations/ORM/index.js";
import ListingDistributionRepository from "../../.shared/channelManagement/repositories/listingDistributionRepository.js";
import {
  buildChannexPropertyPayload,
  buildChannexRoomTypePayload,
} from "../../.shared/channelManagement/utils/channexProvisioningPayloads.js";

// The payload tests use a hand-made listing. This test goes through the stored row the database returns,
// so a field findListing stops loading (title, type, address) fails here instead of in a real Channex create.
const storedRow = {
  id: "property-1",
  hostid: "host-1",
  status: "ACTIVE",
  title: "Villa Malee",
  type: "Villa",
  country: "Thailand",
  city: "Phuket",
  street: "Soi Ao Yon",
  housenumber: 12,
  housenumberextension: null,
  postalcode: "83100",
  latitude: "7.7855",
  longitude: "98.3921",
  guests: 8,
  roomrate: 550,
};

describe("Channex payloads built from a stored listing", () => {
  test("carry everything Channex needs from the database row", async () => {
    Database.getInstance.mockResolvedValue({ options: { schema: "main" }, query: jest.fn().mockResolvedValue([storedRow]) });
    const listing = await new ListingDistributionRepository().findListing("property-1");

    const { property } = buildChannexPropertyPayload(listing, { countryCode: "TH", timezone: "Asia/Bangkok" });
    const { room_type: roomType } = buildChannexRoomTypePayload(listing, { channexPropertyId: "channex-1" });

    expect(property).toMatchObject({
      title: "Villa Malee",
      property_type: "villa",
      city: "Phuket",
      address: "Soi Ao Yon 12",
      zip_code: "83100",
      latitude: "7.7855000",
      longitude: "98.3921000",
    });
    expect(roomType).toMatchObject({ title: "Villa Malee", occ_adults: 8, default_occupancy: 8 });
  });
});
