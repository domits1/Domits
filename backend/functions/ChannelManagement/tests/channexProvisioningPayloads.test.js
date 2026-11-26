import {
  buildChannexPropertyPayload,
  buildChannexRatePlanPayload,
  buildChannexRoomTypePayload,
  channexListingLink,
  listingIdOfChannexWebsite,
  toChannexPropertyType,
} from "../../.shared/channelManagement/utils/channexProvisioningPayloads.js";

// Design note D2 (#506): one Channex property, room type and rate plan per listing.
// Field rules from the Channex API docs (properties, room_types, rate_plans; read 23 Nov 2026).
const listing = () => ({
  propertyId: "listing-1",
  title: "Villa Malee",
  propertyType: "Villa",
  guests: 8,
  location: {
    street: "Soi Ao Yon",
    houseNumber: 12,
    houseNumberExtension: "B",
    postalCode: "83100",
    city: "Phuket",
    country: "Thailand",
    latitude: 7.7855,
    longitude: 98.3921,
  },
  contact: { email: "host@example.com", phone: "+66 81 234 5678" },
});
const place = { countryCode: "TH", timezone: "Asia/Bangkok" };

describe("toChannexPropertyType", () => {
  // Channex bills a property as a hotel unless property_type is a vacation-rental type, so it is never null.
  test.each([
    ["Villa", "villa"],
    ["Apartment", "apartment"],
    ["Boat", "boat"],
    ["House", "holiday_home"],
    ["Cottage", "holiday_home"],
    ["Camper", "holiday_home"],
    [null, "holiday_home"],
  ])("%p becomes %p", (domitsType, channexType) => {
    expect(toChannexPropertyType(domitsType)).toBe(channexType);
  });
});

describe("buildChannexPropertyPayload", () => {
  test("sends the listing as a Channex property in euros, with its country code and timezone", () => {
    expect(buildChannexPropertyPayload(listing(), place)).toEqual({
      property: {
        title: "Villa Malee",
        currency: "EUR",
        property_type: "villa",
        country: "TH",
        timezone: "Asia/Bangkok",
        city: "Phuket",
        address: "Soi Ao Yon 12B",
        zip_code: "83100",
        latitude: "7.7855000",
        longitude: "98.3921000",
        email: "host@example.com",
        phone: "+66 81 234 5678",
        website: "https://www.domits.com/listingdetails?ID=listing-1",
        // Domits pushes availability itself; Channex recommends leaving these off for a PMS.
        settings: {
          allow_availability_autoupdate_on_modification: false,
          allow_availability_autoupdate_on_cancellation: false,
        },
      },
    });
  });

  // All hosts share Domits' Channex key (D8), so titles repeat across hosts. The listing's own page link is
  // unique per listing; look-before-create adopts a property only when this link matches.
  test("the website is the listing's own Domits page, so the property can be told apart from another host's", () => {
    expect(channexListingLink("listing-1")).toBe("https://www.domits.com/listingdetails?ID=listing-1");
    expect(channexListingLink("a&b")).toBe("https://www.domits.com/listingdetails?ID=a%26b");
  });

  // Channex may store the link a little differently from how Domits sent it, so adoption compares the
  // listing id inside the link, not the text. Anything that is not a Domits listing link matches nothing.
  test.each([
    ["the link as sent", "https://www.domits.com/listingdetails?ID=listing-1", "listing-1"],
    ["http instead of https", "http://www.domits.com/listingdetails?ID=listing-1", "listing-1"],
    ["without www", "https://domits.com/listingdetails?ID=listing-1", "listing-1"],
    ["the host in capitals", "https://WWW.Domits.com/listingdetails?ID=listing-1", "listing-1"],
    ["a trailing slash on the path", "https://www.domits.com/listingdetails/?ID=listing-1", "listing-1"],
    ["an encoded id", "https://www.domits.com/listingdetails?ID=a%26b", "a&b"],
    ["a decoded id", "https://www.domits.com/listingdetails?ID=a&b", "a"],
    ["another site", "https://www.example.com/listingdetails?ID=listing-1", null],
    ["a look-alike host", "https://domits.com.example.com/listingdetails?ID=listing-1", null],
    ["another page", "https://www.domits.com/home?ID=listing-1", null],
    ["no ID", "https://www.domits.com/listingdetails", null],
    ["an empty ID", "https://www.domits.com/listingdetails?ID=", null],
    ["not a link", "Villa Malee", null],
    ["no website", null, null],
  ])("%s (%p) gives the listing id %p", (_label, website, listingId) => {
    expect(listingIdOfChannexWebsite(website)).toBe(listingId);
  });

  test("leaves out what Channex would refuse instead of failing the whole property", () => {
    const tooLong = listing();
    tooLong.title = "x".repeat(300);
    tooLong.contact = { email: "", phone: "+".padEnd(40, "1") };
    tooLong.location.latitude = null;

    const { property } = buildChannexPropertyPayload(tooLong, place);

    expect(property.title).toHaveLength(255);
    expect(property.email).toBeNull();
    expect(property.phone).toBeNull();
    expect(property.latitude).toBeNull();
  });

  // Contact details are optional in Channex; a host without them is still provisioned.
  test("a host without contact details gets a property with empty email and phone", () => {
    const withoutContact = { ...listing(), contact: undefined };

    expect(buildChannexPropertyPayload(withoutContact, place).property).toMatchObject({ email: null, phone: null });
  });
});

describe("buildChannexRoomTypePayload", () => {
  test("one unit, sized to the listing's max guests", () => {
    expect(buildChannexRoomTypePayload(listing(), { channexPropertyId: "property-1" })).toEqual({
      room_type: {
        property_id: "property-1",
        title: "Villa Malee",
        count_of_rooms: 1,
        occ_adults: 8,
        occ_children: 0,
        occ_infants: 0,
        default_occupancy: 8,
      },
    });
  });
});

describe("buildChannexRatePlanPayload", () => {
  // A per-room plan has one option, at the maximum occupancy; prices come later through the outbox.
  test("one per-room Standard Rate in euros at the listing's max guests", () => {
    expect(
      buildChannexRatePlanPayload(listing(), { channexPropertyId: "property-1", channexRoomTypeId: "room-1" })
    ).toEqual({
      rate_plan: {
        property_id: "property-1",
        room_type_id: "room-1",
        title: "Standard Rate",
        currency: "EUR",
        sell_mode: "per_room",
        rate_mode: "manual",
        options: [{ occupancy: 8, is_primary: true, rate: 0 }],
      },
    });
  });
});
