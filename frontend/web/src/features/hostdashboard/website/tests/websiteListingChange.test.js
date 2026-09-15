import {
  buildListingDigest,
  formatPublishedAtLabel,
  hasListingChangedSincePublish,
  resolveLiveSiteStaleness,
} from "../services/websiteListingChange";

describe("formatPublishedAtLabel", () => {
  it("formats a timestamp for the notice and returns nothing for an unknown one", () => {
    expect(formatPublishedAtLabel(Date.UTC(2026, 8, 12, 12, 3))).toMatch(/12 Sep/);
    expect(formatPublishedAtLabel(null)).toBe("");
    expect(formatPublishedAtLabel("nope")).toBe("");
  });
});

const PROPERTY_ID = "3b1d6d5e-9d5d-4a3c-8b7e-2f0c8d1a5e11";

const serializedImage = (name) => ({
  property_id: PROPERTY_ID,
  key: `${PROPERTY_ID}/${name}-web.jpg`,
  web_key: `${PROPERTY_ID}/${name}-web.jpg`,
  thumb_key: `${PROPERTY_ID}/${name}-thumb.jpg`,
  original_key: `${PROPERTY_ID}/${name}.jpg`,
  web_width: 1920,
  thumb_width: 600,
});

const LISTING = {
  property: {
    id: PROPERTY_ID,
    hostId: "host-1",
    title: "Cliff House",
    subtitle: "Sea view",
    description: "A calm place.",
    status: "ACTIVE",
    createdAt: 1757000000000,
    updatedAt: 1757500000000,
  },
  images: [serializedImage("a"), serializedImage("b")],
  amenities: [
    { id: "am-1", property_id: PROPERTY_ID, amenityId: "wifi" },
    { id: "am-2", property_id: PROPERTY_ID, amenityId: "parking" },
  ],
  generalDetails: [
    { id: "gd-1", property_id: PROPERTY_ID, detail: "Guests", value: 4 },
    { id: "gd-2", property_id: PROPERTY_ID, detail: "Bedrooms", value: 2 },
  ],
  rules: [{ property_id: PROPERTY_ID, rule: "Smoking", value: false }],
  availabilityRestrictions: [{ id: "ar-1", property_id: PROPERTY_ID, restriction: "MinimumStay", value: 3 }],
  checkIn: {
    property_id: PROPERTY_ID,
    checkIn: { from: "15:00", till: "20:00" },
    checkOut: { from: "08:00", till: "11:00" },
  },
  pricing: { property_id: PROPERTY_ID, roomRate: 190, weekendRate: 190, cleaning: 50 },
  propertyType: { property_id: PROPERTY_ID, property_type: "House", spaceType: "Entire house" },
  location: {
    property_id: PROPERTY_ID,
    country: "Portugal",
    city: "Porto",
    street: "Rua das Flores",
    houseNumber: 12,
    houseNumberExtension: "",
    postalCode: "4050-262",
    latitude: 41.1446,
    longitude: -8.6142,
  },
  availability: [{ availableStartDate: 1, availableEndDate: 2 }],
  calendarAvailability: { unavailableDateKeys: ["2026-10-10"] },
  hostProfile: { name: "Host", whatsapp: { isAvailable: false } },
};

const withChanges = (changes) => ({ ...LISTING, ...changes });
const publishedSummary = (snapshot, overrides = {}) => ({
  site: {
    id: "site-1",
    status: "PUBLISHED",
    publishedAt: 1757600000000,
    publishedPropertySnapshot: snapshot,
    ...overrides,
  },
});

describe("buildListingDigest", () => {
  it("keeps only what the live site renders and ignores volatile fields", () => {
    const digest = buildListingDigest(LISTING);

    expect(digest).toEqual({
      propertyType: "Entire house",
      title: "Cliff House",
      subtitle: "Sea view",
      description: "A calm place.",
      images: [`${PROPERTY_ID}/a-web.jpg`, `${PROPERTY_ID}/b-web.jpg`],
      amenities: ["parking", "wifi"],
      generalDetails: ["Bedrooms=2", "Guests=4"],
      rules: ["Smoking=false"],
      availabilityRestrictions: ["MinimumStay=3"],
      checkIn: ["15:00", "20:00", "08:00", "11:00"],
      pricing: { roomRate: 190 },
      location: ["Porto", "Portugal"],
    });
    expect(JSON.stringify(digest)).not.toMatch(
      /availableStartDate|whatsapp|2026-10-10|cleaning|weekendRate|Rua das Flores/
    );
  });

  it("falls back to the property type when no space type is set", () => {
    expect(buildListingDigest({ propertyType: { property_type: "Boat" } }).propertyType).toBe("Boat");
    expect(buildListingDigest({}).propertyType).toBe("");
  });

  it("resolves image keys in the order the live site uses and keeps legacy and string entries", () => {
    const digest = buildListingDigest({
      images: [
        { web_key: "web.jpg", thumb_key: "thumb.jpg", key: "key.jpg", original_key: "original.jpg" },
        { thumb_key: "thumb.jpg", key: "key.jpg", original_key: "original.jpg" },
        { property_id: PROPERTY_ID, key: "legacy.jpg" },
        " plain.jpg ",
        {},
      ],
    });

    expect(digest.images).toEqual(["web.jpg", "thumb.jpg", "legacy.jpg", "plain.jpg"]);
  });
});

describe("hasListingChangedSincePublish", () => {
  it.each([
    ["replaced photos", withChanges({ images: [serializedImage("c"), serializedImage("b")] })],
    ["reordered photos", withChanges({ images: [LISTING.images[1], LISTING.images[0]] })],
    ["a removed photo", withChanges({ images: [LISTING.images[0]] })],
    [
      "a regenerated web variant of the same photo",
      withChanges({ images: [{ ...LISTING.images[0], web_key: `${PROPERTY_ID}/a-web-v2.jpg` }, LISTING.images[1]] }),
    ],
    ["an edited description", withChanges({ property: { ...LISTING.property, description: "Now with a pool." } })],
    ["a changed nightly rate", withChanges({ pricing: { ...LISTING.pricing, roomRate: 210 } })],
    ["a new amenity", withChanges({ amenities: [...LISTING.amenities, { amenityId: "pool" }] })],
    ["a changed property type", withChanges({ propertyType: { ...LISTING.propertyType, spaceType: "Private room" } })],
    [
      "a changed minimum stay",
      withChanges({ availabilityRestrictions: [{ ...LISTING.availabilityRestrictions[0], value: 5 }] }),
    ],
    [
      "a changed check-in time",
      withChanges({ checkIn: { ...LISTING.checkIn, checkIn: { from: "16:00", till: "20:00" } } }),
    ],
    [
      "a changed check-out time",
      withChanges({ checkIn: { ...LISTING.checkIn, checkOut: { from: "08:00", till: "10:00" } } }),
    ],
  ])("is stale after %s", (_label, current) => {
    expect(hasListingChangedSincePublish(LISTING, current)).toBe(true);
  });

  it.each([
    ["the same listing", LISTING],
    ["a listing whose availability moved on", withChanges({ availability: [], calendarAvailability: {} })],
    [
      "a listing whose host profile was enriched",
      withChanges({ hostProfile: { name: "Other", whatsapp: { isAvailable: true } } }),
    ],
    ["amenities listed in another order", withChanges({ amenities: [...LISTING.amenities].reverse() })],
    ["extra whitespace in copy", withChanges({ property: { ...LISTING.property, description: "  A calm   place. " } })],
    ["a changed cleaning fee", withChanges({ pricing: { ...LISTING.pricing, cleaning: 80 } })],
    ["a changed weekend rate", withChanges({ pricing: { ...LISTING.pricing, weekendRate: 240 } })],
    [
      "a regenerated original that the site does not render",
      withChanges({ images: [{ ...LISTING.images[0], original_key: `${PROPERTY_ID}/a-v2.jpg` }, LISTING.images[1]] }),
    ],
    [
      "new row identifiers and timestamps",
      withChanges({
        property: { ...LISTING.property, updatedAt: 1757900000000 },
        amenities: LISTING.amenities.map((amenity, index) => ({ ...amenity, id: `am-new-${index}` })),
        location: { ...LISTING.location, latitude: 41.15, longitude: -8.61 },
      }),
    ],
  ])("is not stale for %s", (_label, current) => {
    expect(hasListingChangedSincePublish(LISTING, current)).toBe(false);
  });

  it("is never stale without a snapshot or without current details", () => {
    expect(hasListingChangedSincePublish({}, LISTING)).toBe(false);
    expect(hasListingChangedSincePublish(null, LISTING)).toBe(false);
    expect(hasListingChangedSincePublish(LISTING, null)).toBe(false);
  });
});

describe("resolveLiveSiteStaleness", () => {
  it("flags a published site whose listing changed and reports when it was published", () => {
    const current = withChanges({ images: [serializedImage("new")] });

    expect(resolveLiveSiteStaleness(publishedSummary(LISTING), current)).toEqual({
      isStale: true,
      publishedAt: 1757600000000,
    });
  });

  it("is quiet for an unchanged listing", () => {
    expect(resolveLiveSiteStaleness(publishedSummary(LISTING), LISTING)).toEqual({
      isStale: false,
      publishedAt: 1757600000000,
    });
  });

  it("is quiet for sites that are not published", () => {
    expect(resolveLiveSiteStaleness(publishedSummary(LISTING, { status: "PREVIEW" }), withChanges({}))).toEqual({
      isStale: false,
      publishedAt: null,
    });
    expect(resolveLiveSiteStaleness(null, LISTING)).toEqual({ isStale: false, publishedAt: null });
  });
});
