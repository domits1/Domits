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

const LISTING = {
  property: { id: "property-1", title: "Cliff House", subtitle: "Sea view", description: "A calm place." },
  images: [
    { key: "props/1/a.jpg", web_key: "props/1/a-web.jpg", thumb_key: "props/1/a-thumb.jpg" },
    { key: "props/1/b.jpg", web_key: "props/1/b-web.jpg", thumb_key: "props/1/b-thumb.jpg" },
  ],
  amenities: [{ amenityId: "wifi" }, { amenityId: "parking" }],
  generalDetails: [
    { detail: "Guests", value: 4 },
    { detail: "Bedrooms", value: 2 },
  ],
  rules: [{ rule: "Smoking", value: false }],
  pricing: { roomRate: 190, cleaning: 50 },
  location: { city: "Porto", country: "Portugal" },
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
      title: "Cliff House",
      subtitle: "Sea view",
      description: "A calm place.",
      images: ["props/1/a.jpg", "props/1/b.jpg"],
      amenities: ["parking", "wifi"],
      generalDetails: ["Bedrooms=2", "Guests=4"],
      rules: ["Smoking=false"],
      pricing: { roomRate: 190, cleaning: 50 },
      location: ["Porto", "Portugal"],
    });
    expect(JSON.stringify(digest)).not.toMatch(/availability|whatsapp|2026-10-10/);
  });
});

describe("hasListingChangedSincePublish", () => {
  it.each([
    ["replaced photos", withChanges({ images: [{ key: "props/1/c.jpg" }, { key: "props/1/b.jpg" }] })],
    ["reordered photos", withChanges({ images: [LISTING.images[1], LISTING.images[0]] })],
    ["a removed photo", withChanges({ images: [LISTING.images[0]] })],
    ["an edited description", withChanges({ property: { ...LISTING.property, description: "Now with a pool." } })],
    ["a changed nightly rate", withChanges({ pricing: { roomRate: 210, cleaning: 50 } })],
    ["a new amenity", withChanges({ amenities: [...LISTING.amenities, { amenityId: "pool" }] })],
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
    const current = withChanges({ images: [{ key: "props/1/new.jpg" }] });

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
