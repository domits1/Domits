import renderPayload from "../../../../../../../backend/prerender/__fixtures__/renderPayload.json";
import { buildWebsiteTemplateModel } from "../rendering/buildWebsiteTemplateModel";
import {
  buildSitePropertyCards,
  buildSitePropertyStayQuery,
  groupSitePropertySearchResults,
  listSitePropertyCities,
  validateSitePropertySearch,
} from "../rendering/websiteSitePropertySearch";

const MAIN_ID = renderPayload.site.propertyId;
const SEARCH = { checkIn: "2027-01-15", checkOut: "2027-01-22", guests: 4 };
const TODAY = "2026-11-17";

const quoteOf = (propertyId, overrides = {}) => ({
  propertyId,
  checkIn: SEARCH.checkIn,
  checkOut: SEARCH.checkOut,
  guestCount: SEARCH.guests,
  nights: 7,
  priceBreakdown: { currency: "EUR", total: 120000 },
  ...overrides,
});
const cardOf = (propertyId) => ({ propertyId, slug: propertyId, title: propertyId, city: "" });

describe("buildSitePropertyCards", () => {
  it("builds each card from the site model or the property's own snapshot", () => {
    const cards = buildSitePropertyCards({
      siteModel: buildWebsiteTemplateModel({ propertyDetails: renderPayload.propertySnapshot }),
      siteProperties: [
        { propertyId: MAIN_ID, slug: "villa-a", isMainProperty: true },
        {
          propertyId: "property-b",
          slug: "villa-b",
          isMainProperty: false,
          propertySnapshot: {
            property: { id: "property-b", title: "Villa B" },
            location: { city: "Canggu", country: "Indonesia", street: "Jalan Pantai" },
            generalDetails: [{ detail: "Guests", value: 4 }],
            pricing: { roomRate: 300 },
            images: [{ image_id: "image-b", sort_order: 0, status: "READY", web_key: "images/b/web.jpg" }],
          },
        },
        { propertyId: "property-c", slug: "villa-c", isMainProperty: false, propertySnapshot: { property: {} } },
      ],
      contentOverrides: {},
      themeOverrides: {},
      templateKey: "panorama-landing",
    });

    expect(cards).toEqual([
      expect.objectContaining({ propertyId: MAIN_ID, slug: "villa-a", city: "Ubud", location: "Ubud, Indonesia" }),
      {
        propertyId: "property-b",
        slug: "villa-b",
        title: "Villa B",
        imageUrl: expect.stringContaining("images/b/web.jpg"),
        city: "Canggu",
        location: "Canggu, Indonesia",
        guests: 4,
        bedrooms: 0,
      },
      expect.objectContaining({ propertyId: "property-c", imageUrl: "", location: "", guests: 0 }),
    ]);
    expect(cards[0]).toMatchObject({ guests: 8, bedrooms: 4 });
  });
});

describe("listSitePropertyCities", () => {
  it("lists each city once, in the first spelling, and leaves out properties without a city", () => {
    const cards = [{ city: "Ubud" }, { city: "" }, { city: "Canggu" }, { city: "ubud" }];

    expect(listSitePropertyCities(cards)).toEqual([
      { key: "ubud", label: "Ubud" },
      { key: "canggu", label: "Canggu" },
    ]);
  });
});

describe("validateSitePropertySearch", () => {
  it.each([
    [{ ...SEARCH, checkIn: "" }, "Choose a check-in and a check-out date."],
    [{ ...SEARCH, checkOut: "22-01-2027" }, "Choose a check-in and a check-out date."],
    [{ ...SEARCH, checkIn: "2026-11-16" }, "Check-in can't be in the past."],
    [{ ...SEARCH, checkOut: SEARCH.checkIn }, "Check-out must be after check-in."],
    [{ ...SEARCH, checkOut: "2027-01-14" }, "Check-out must be after check-in."],
    [{ ...SEARCH, checkOut: "2028-01-17" }, "A stay can be at most 366 nights."],
    [{ ...SEARCH, checkOut: "9999-12-31" }, "A stay can be at most 366 nights."],
    [{ ...SEARCH, guests: 0 }, "Choose 1 to 50 guests."],
    [{ ...SEARCH, guests: 51 }, "Choose 1 to 50 guests."],
    [{ ...SEARCH, guests: 2.5 }, "Choose 1 to 50 guests."],
    [{ ...SEARCH, guests: Number.NaN }, "Choose 1 to 50 guests."],
  ])("refuses %p", (search, message) => {
    expect(validateSitePropertySearch(search, TODAY)).toBe(message);
  });

  it.each([
    [{ ...SEARCH, checkIn: TODAY, checkOut: "2026-11-18" }],
    [{ ...SEARCH, checkOut: "2028-01-16" }],
    [{ ...SEARCH, guests: 1 }],
    [{ ...SEARCH, guests: 50 }],
  ])("accepts %p", (search) => {
    expect(validateSitePropertySearch(search, TODAY)).toBe("");
  });
});

describe("groupSitePropertySearchResults", () => {
  const CARDS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map(cardOf);
  const ANSWERS = new Map([
    ["j", { error: { code: "invalid_guest_count", message: "This property sleeps at most 2 guests." } }],
    ["i", { error: { code: "invalid_guest_count", message: "" } }],
    [
      "h",
      { error: { code: "stay_restriction_violation", message: "This property requires a stay of at least 9 nights." } },
    ],
    ["g", { error: { code: "unavailable_dates", message: "The selected dates are not available." } }],
    ["f", { error: { code: "pricing_service_unavailable", message: "Try again." } }],
    ["e", { error: { code: "internal_error", message: "" } }],
    ["d", { quote: quoteOf("d", { guestCount: 2 }) }],
    ["c", { error: { code: "property_not_found", message: "No property was found for this website." } }],
    ["a", { quote: quoteOf("a") }],
    ["z", { quote: quoteOf("z") }],
  ]);

  it("reads each answer by property id, in the order of the page", () => {
    const groups = groupSitePropertySearchResults(CARDS, ANSWERS, SEARCH);

    expect(groups.free).toEqual([{ card: CARDS[0], quote: quoteOf("a") }]);
    expect(groups.notFree).toEqual([
      { card: CARDS[6], reason: "Not free on these dates." },
      { card: CARDS[7], reason: "This property requires a stay of at least 9 nights." },
      { card: CARDS[8], reason: "This property can't host this many guests." },
      { card: CARDS[9], reason: "This property sleeps at most 2 guests." },
    ]);
    expect(groups.failed).toEqual([CARDS[1], CARDS[3], CARDS[4], CARDS[5]]);
  });

  it.each([
    ["quote_unavailable", "This property can't be booked online right now."],
    ["invalid_date_range", "These dates can't be booked."],
  ])("gives %s its own reason instead of the server message", (code, reason) => {
    const answers = new Map([["a", { error: { code, message: "checkIn must not be in the past." } }]]);

    expect(groupSitePropertySearchResults([cardOf("a")], answers, SEARCH).notFree).toEqual([
      { card: cardOf("a"), reason },
    ]);
  });

  it.each(["__proto__", "constructor", "rate_limited"])(
    "counts the code %s as a price that could not be loaded",
    (code) => {
      const answers = new Map([["a", { error: { code, message: "" } }]]);

      expect(groupSitePropertySearchResults([cardOf("a")], answers, SEARCH).failed).toEqual([cardOf("a")]);
    }
  );
});

describe("buildSitePropertyStayQuery", () => {
  it("adds the stay to the live view's own query", () => {
    expect(buildSitePropertyStayQuery("?siteId=site-1", SEARCH)).toBe(
      "?siteId=site-1&checkIn=2027-01-15&checkOut=2027-01-22&guests=4"
    );
  });

  it("starts the query on the host's own domain", () => {
    expect(buildSitePropertyStayQuery("", SEARCH)).toBe("?checkIn=2027-01-15&checkOut=2027-01-22&guests=4");
  });
});
