import renderPayload from "../../../../../../../backend/prerender/__fixtures__/renderPayload.json";
import { buildWebsiteTemplateModel } from "../rendering/buildWebsiteTemplateModel";
import { applyWebsiteDraftContentOverrides } from "../rendering/websiteDraftContentOverrides";
import {
  buildSitePropertyHref,
  buildSitePropertyModel,
  buildSitePropertyStayQuery,
  isSitePropertyPath,
  normalizeServedSiteProperties,
  parseSitePropertyPath,
  readSitePropertyStayQuery,
  resolveSitePropertyPageTitle,
  resolveSitePropertyRoute,
} from "../rendering/websiteSiteProperties";

const VILLA_B_SNAPSHOT = {
  property: { id: "property-b", title: "Villa B", description: "A quiet garden villa." },
  location: { city: "Ubud", country: "Indonesia" },
  images: [{ image_id: "image-b", status: "READY", web_key: "images/property-b/image-b/web.jpg" }],
  amenities: [{ amenityId: "12" }],
};
const MAIN_ENTRY = { propertyId: "property-a", slug: "villa-a", isMainProperty: true };
const VILLA_B_ENTRY = {
  propertyId: "property-b",
  slug: "villa-b",
  isMainProperty: false,
  propertySnapshot: VILLA_B_SNAPSHOT,
};
const SERVED = [MAIN_ENTRY, VILLA_B_ENTRY];

describe("normalizeServedSiteProperties", () => {
  it("keeps the served entries in their order", () => {
    expect(normalizeServedSiteProperties(SERVED)).toEqual(SERVED);
  });

  it.each([[undefined], [null], ["villa-b"], [{ 0: MAIN_ENTRY, 1: VILLA_B_ENTRY }], [[]], [[MAIN_ENTRY]]])(
    "serves no list for %p",
    (value) => {
      expect(normalizeServedSiteProperties(value)).toEqual([]);
    }
  );

  it.each([
    ["a slug in capitals", { slug: "Villa-C" }],
    ["a slug with an underscore", { slug: "villa_c" }],
    ["a slug over 60 characters", { slug: "a".repeat(61) }],
    ["no property id", { propertyId: " " }],
    ["no snapshot", { propertySnapshot: undefined }],
    ["a snapshot without a property", { propertySnapshot: { images: [] } }],
  ])("drops an entry with %s", (_, change) => {
    const villaC = { ...VILLA_B_ENTRY, propertyId: "property-c", slug: "villa-c", ...change };

    expect(normalizeServedSiteProperties([...SERVED, villaC])).toEqual(SERVED);
  });

  it("keeps the first of two entries with the same slug, the same property or a second main property", () => {
    const repeats = [
      { ...VILLA_B_ENTRY, propertyId: "property-c" },
      { ...VILLA_B_ENTRY, slug: "villa-c" },
      { ...MAIN_ENTRY, propertyId: "property-d", slug: "villa-d" },
    ];

    expect(normalizeServedSiteProperties([...SERVED, ...repeats])).toEqual(SERVED);
  });

  it("serves no list once fewer than two entries are usable", () => {
    expect(normalizeServedSiteProperties([MAIN_ENTRY, { ...VILLA_B_ENTRY, slug: "Villa B" }])).toEqual([]);
  });

  it("keeps only the fields of the contract", () => {
    const [main, villaB] = normalizeServedSiteProperties([
      { ...MAIN_ENTRY, propertySnapshot: VILLA_B_SNAPSHOT, hostId: "host-1" },
      { ...VILLA_B_ENTRY, hostId: "host-1" },
    ]);

    expect(main).toEqual(MAIN_ENTRY);
    expect(villaB).toEqual(VILLA_B_ENTRY);
  });
});

describe("parseSitePropertyPath", () => {
  it.each([
    ["properties/villa-b", "villa-b", "property"],
    ["properties/villa-b/", "villa-b", "property"],
    ["properties/villa-b/photos", "villa-b", "photos"],
    ["properties/villa-b/request/", "villa-b", "request"],
    ["properties/villa-b/sent", "villa-b", "sent"],
    ["Properties/VILLA-B/Photos", "villa-b", "photos"],
    ["properties/constructor", "constructor", "property"],
  ])("reads %s as %s, %s", (sitePath, slug, pageKind) => {
    expect(parseSitePropertyPath(sitePath)).toEqual({ slug, pageKind });
    expect(isSitePropertyPath(sitePath)).toBe(true);
  });

  it.each([
    "",
    "properties",
    "/properties/villa-b",
    "properties//photos",
    "properties/villa-b//",
    "properties/villa-b/reviews",
    "properties/villa-b/photos/1",
    "properties/villa_b",
    "properties/villa-ä",
    "properties/%2E%2E",
    "property/villa-b",
    undefined,
  ])("does not read %p as a property path", (sitePath) => {
    expect(parseSitePropertyPath(sitePath)).toBeNull();
    expect(isSitePropertyPath(sitePath)).toBe(false);
  });
});

describe("resolveSitePropertyRoute", () => {
  it.each([
    ["properties/villa-b", VILLA_B_ENTRY, "property"],
    ["properties/villa-a/request", MAIN_ENTRY, "request"],
  ])("finds the served property of %s", (sitePath, property, pageKind) => {
    expect(resolveSitePropertyRoute(sitePath, SERVED)).toEqual({ isFound: true, property, pageKind });
  });

  it.each(["properties/villa-c", "properties/__proto__", "properties/constructor", "properties/villa-b/reviews"])(
    "finds nothing for %s on a site with a list",
    (sitePath) => {
      expect(resolveSitePropertyRoute(sitePath, SERVED)).toEqual({ isFound: false, property: null, pageKind: "" });
    }
  );

  it.each(["", "gallery", "properties", "properties/", "/properties/villa-b", "gallery/properties"])(
    "leaves %p to the site pages",
    (sitePath) => {
      expect(resolveSitePropertyRoute(sitePath, SERVED)).toBeNull();
    }
  );

  it.each([[[]], [undefined], [null]])("routes no property path for a site with the list %p", (siteProperties) => {
    expect(resolveSitePropertyRoute("properties/villa-b", siteProperties)).toBeNull();
  });
});

describe("buildSitePropertyHref", () => {
  it.each([
    ["", "villa-b", "property", "", "/properties/villa-b"],
    ["", "villa-b", "photos", "", "/properties/villa-b/photos"],
    [
      "/website-live/villa.example",
      "villa-b",
      "request",
      "?siteId=site-1",
      "/website-live/villa.example/properties/villa-b/request?siteId=site-1",
    ],
    ["", "villa-b", "reviews", "", "/properties/villa-b"],
    ["", "Villa B", "property", "?siteId=site-1", "/?siteId=site-1"],
    ["", "../admin", "property", "", "/"],
    ["\\evil.example", "villa-b", "property", "?a#b", "/properties/villa-b"],
  ])("builds the link from %p for %s, %s", (basePath, slug, pageKind, search, href) => {
    expect(buildSitePropertyHref(basePath, slug, pageKind, search)).toBe(href);
  });
});

describe("buildSitePropertyModel", () => {
  const CONTENT_OVERRIDES = {
    siteTitle: "",
    heroTitle: "Sea view of Villa A",
    heroImage: "https://images.example/villa-a.jpg",
    galleryImages: ["https://images.example/villa-a-pool.jpg"],
    amenities: [{ id: "96", label: "Pool" }],
    residenceHeadline: "The rice fields of Villa A",
    galleryTitle: "Our photos",
    contactTitle: "Write to us",
    visibility: { chatWidget: false },
    sitePages: { gallery: { enabled: true, navLabel: "Photos" } },
  };
  const buildSiteModel = () =>
    applyWebsiteDraftContentOverrides(
      buildWebsiteTemplateModel({ propertyDetails: renderPayload.propertySnapshot, summaryProperty: null }),
      CONTENT_OVERRIDES,
      "panorama-landing"
    );
  const buildVillaB = (siteModel) =>
    buildSitePropertyModel({
      siteModel,
      property: VILLA_B_ENTRY,
      contentOverrides: CONTENT_OVERRIDES,
      themeOverrides: {},
      templateKey: "panorama-landing",
    });

  it("uses the site's own model for the main property", () => {
    const siteModel = buildSiteModel();

    expect(buildSitePropertyModel({ siteModel, property: MAIN_ENTRY, contentOverrides: CONTENT_OVERRIDES })).toBe(
      siteModel
    );
  });

  it("builds another property from its own snapshot under the site's title and host", () => {
    const siteModel = buildSiteModel();
    const villaB = buildVillaB(siteModel);

    expect(villaB.source.propertyId).toBe("property-b");
    expect(villaB.hero.title).toBe("Villa B");
    expect(villaB.media.heroImage).toContain("images/property-b/image-b/web.jpg");
    expect(villaB.site.title).toBe(siteModel.site.title);
    expect(villaB.host).toBe(siteModel.host);
  });

  it.each([
    ["title", (model) => model.hero.title, CONTENT_OVERRIDES.heroTitle],
    ["hero photo", (model) => model.media.heroImage, CONTENT_OVERRIDES.heroImage],
    ["photos", (model) => model.media.galleryImages[0], CONTENT_OVERRIDES.galleryImages[0]],
    ["amenities", (model) => model.amenities.all[0]?.label, "Pool"],
    ["residence headline", (model) => model.residenceSection.headline, CONTENT_OVERRIDES.residenceHeadline],
  ])("leaves the main property's %s off another property", (_, read, mainValue) => {
    const siteModel = buildSiteModel();

    expect(read(siteModel)).toBe(mainValue);
    expect(read(buildVillaB(siteModel))).not.toBe(mainValue);
  });

  it("keeps the settings of the whole site", () => {
    const villaB = buildVillaB(buildSiteModel());

    expect(villaB.gallerySection.title).toBe("Our photos");
    expect(villaB.contactSection.caption).toBe("Write to us");
    expect(villaB.visibility.chatWidget).toBe(false);
    expect(villaB.sitePages.gallery).toEqual({ enabled: true, navLabel: "Photos" });
  });

  it("titles a property page with the property unless it is the site's own title", () => {
    const siteModel = buildSiteModel();

    expect(resolveSitePropertyPageTitle(buildVillaB(siteModel))).toBe("Villa B");
    expect(resolveSitePropertyPageTitle({ ...siteModel, hero: { title: siteModel.site.title } })).toBe("");
  });
});

describe("readSitePropertyStayQuery", () => {
  const TODAY = "2026-11-17";
  const NO_DATES = { checkIn: null, checkOut: null };

  it.each([
    ["?checkIn=2026-12-01&checkOut=2026-12-08&guests=4", { checkIn: "2026-12-01", checkOut: "2026-12-08", guests: 4 }],
    [
      "?siteId=site-1&checkIn=2026-11-17&checkOut=2026-11-18",
      { checkIn: "2026-11-17", checkOut: "2026-11-18", guests: null },
    ],
    [
      "?checkIn=2026-12-01&checkOut=2027-12-01&guests=99",
      { checkIn: "2026-12-01", checkOut: "2027-12-01", guests: 99 },
    ],
    ["?guests=2", { ...NO_DATES, guests: 2 }],
  ])("reads %s", (search, stay) => {
    expect(readSitePropertyStayQuery(search, TODAY)).toEqual(stay);
  });

  it.each([
    ["a check-in in the past", "?checkIn=2026-11-16&checkOut=2026-11-20"],
    ["a check-out before the check-in", "?checkIn=2026-12-08&checkOut=2026-12-01"],
    ["the same day twice", "?checkIn=2026-12-01&checkOut=2026-12-01"],
    ["a day that does not exist", "?checkIn=2027-02-27&checkOut=2027-02-30"],
    ["a year before 100", "?checkIn=0027-02-27&checkOut=0027-03-02"],
    ["another date format", "?checkIn=01-12-2026&checkOut=08-12-2026"],
    ["a stay longer than a year", "?checkIn=2026-12-01&checkOut=2027-12-02"],
    ["one date only", "?checkIn=2026-12-01"],
    ["a date given twice", "?checkIn=2026-12-01&checkIn=2026-12-02&checkOut=2026-12-08"],
  ])("ignores the dates for %s and keeps the guests", (_, search) => {
    expect(readSitePropertyStayQuery(`${search}&guests=3`, TODAY)).toEqual({ ...NO_DATES, guests: 3 });
  });

  it.each(["0", "1.5", "100", "two"])("ignores the guests %p and keeps the dates", (guests) => {
    expect(readSitePropertyStayQuery(`?checkIn=2026-12-01&checkOut=2026-12-08&guests=${guests}`, TODAY)).toEqual({
      checkIn: "2026-12-01",
      checkOut: "2026-12-08",
      guests: null,
    });
  });

  it.each([undefined, "?siteId=site-1"])("reads no stay from %p", (search) => {
    expect(readSitePropertyStayQuery(search, TODAY)).toEqual({ ...NO_DATES, guests: null });
  });
});

describe("buildSitePropertyStayQuery", () => {
  const STAY = { checkIn: "2026-12-01", checkOut: "2026-12-08", guests: 4 };

  it.each([
    ["", STAY, "?checkIn=2026-12-01&checkOut=2026-12-08&guests=4"],
    ["?siteId=site-1", STAY, "?siteId=site-1&checkIn=2026-12-01&checkOut=2026-12-08&guests=4"],
    [
      "?siteId=site-1&checkIn=2026-01-01&guests=9",
      { checkIn: null, checkOut: null, guests: 2 },
      "?siteId=site-1&guests=2",
    ],
    ["?siteId=site-1", { ...STAY, checkIn: "1 Dec", guests: 1.5 }, "?siteId=site-1"],
    ["", undefined, ""],
  ])("builds from %p and %p", (search, stay, query) => {
    expect(buildSitePropertyStayQuery(search, stay)).toBe(query);
  });
});
