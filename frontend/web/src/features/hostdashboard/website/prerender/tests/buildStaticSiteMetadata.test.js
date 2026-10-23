import { buildWebsiteTemplateModel } from "../../rendering/buildWebsiteTemplateModel";
import { applyWebsiteDraftContentOverrides } from "../../rendering/websiteDraftContentOverrides";
import { buildStaticSiteMetadata } from "../buildStaticSiteMetadata";
import { buildPublishedSiteRenderPayload } from "./publishedSiteRenderPayload";

const FIRST_PHOTO = "https://accommodation.s3.eu-north-1.amazonaws.com/images/property/first/web.jpg";
const SECOND_PHOTO = "https://accommodation.s3.eu-north-1.amazonaws.com/images/property/second/web.jpg";
const buildMetadataFor = (payloadOverrides = {}) => {
  const renderPayload = buildPublishedSiteRenderPayload(payloadOverrides);
  const baseModel = buildWebsiteTemplateModel({ propertyDetails: renderPayload.propertySnapshot });
  const model = applyWebsiteDraftContentOverrides(
    baseModel,
    renderPayload.contentOverrides,
    renderPayload.site.templateKey
  );
  return { metadata: buildStaticSiteMetadata({ renderPayload, model }), model };
};

describe("static site metadata for a published direct booking website", () => {
  it("names the listing and its city and country in the title", () => {
    const { metadata } = buildMetadataFor();

    expect(metadata.title).toBe("Wellness Villa Bisous | Ubud, Indonesia");
  });

  it("describes the listing with the published description, within 160 characters", () => {
    const { metadata } = buildMetadataFor();

    expect(metadata.description).toBe(
      "Escape to a serene four-bedroom private villa designed for space, comfort and a peaceful connection with nature."
    );
    expect(metadata.description.length).toBeLessThanOrEqual(160);
  });

  it("shortens a long description at a word boundary instead of mid-word", () => {
    const { metadata } = buildMetadataFor({
      propertySnapshot: {
        property: { title: "Wellness Villa Bisous", description: `${"Beautifully restored villa ".repeat(12)}end.` },
        location: { city: "Ubud", country: "Indonesia" },
      },
    });

    expect(metadata.description.length).toBeLessThanOrEqual(160);
    expect(metadata.description.endsWith("…")).toBe(true);
    expect(metadata.description).not.toMatch(/\s…$/);
    expect(metadata.description.slice(0, -1).split(" ").pop()).toMatch(/^(Beautifully|restored|villa)$/);
  });

  it("never exposes the street, house number or postal code", () => {
    const { metadata } = buildMetadataFor();
    const serialized = JSON.stringify(metadata);

    expect(serialized).not.toContain("Jalan Raya Sayan");
    expect(serialized).not.toContain("80571");
    expect(serialized).not.toMatch(/houseNumber/i);
    expect(serialized).toContain("Ubud");
  });

  it("points the canonical URL at the primary domain of the site", () => {
    const { metadata } = buildMetadataFor();

    expect(metadata.canonicalUrl).toBe("https://wellness-villa-bisous-bf378265.direct.domits.com/");
    expect(metadata.openGraph["og:url"]).toBe(metadata.canonicalUrl);
  });

  it("allows indexing only when the site is published on an active domain", () => {
    expect(buildMetadataFor().metadata.robots).toBe("index, follow");
    expect(buildMetadataFor({ site: { status: "SUSPENDED" } }).metadata).toMatchObject({
      robots: "noindex, nofollow",
      canonicalUrl: "",
      jsonLd: null,
    });
    expect(buildMetadataFor({ domain: { status: "PENDING" } }).metadata.robots).toBe("noindex, nofollow");
  });

  it("follows the reachability the backend resolved, not the stored domain status", () => {
    const renderPayload = buildPublishedSiteRenderPayload();
    const model = buildWebsiteTemplateModel({ propertyDetails: renderPayload.propertySnapshot });

    const reachableWithDisabledRecord = buildStaticSiteMetadata({
      renderPayload: { ...renderPayload, domain: { ...renderPayload.domain, status: "DISABLED" } },
      model,
    });
    const unreachableWithActiveRecord = buildStaticSiteMetadata({
      renderPayload: { ...renderPayload, resolution: { ...renderPayload.resolution, isReachable: false } },
      model,
    });

    expect(reachableWithDisabledRecord.robots).toBe("index, follow");
    expect(unreachableWithActiveRecord.robots).toBe("noindex, nofollow");
    expect(unreachableWithActiveRecord.canonicalUrl).toBe("");
  });

  it("refuses to canonicalise an alias, so no page claims to be the primary domain", () => {
    const { metadata } = buildMetadataFor({ domain: { domain: "alias.example.com", isPrimary: false } });

    expect(metadata.canonicalUrl).toBe("");
    expect(metadata.robots).toBe("noindex, nofollow");
    expect(metadata.openGraph["og:url"]).toBeUndefined();
    expect(JSON.stringify(metadata)).not.toContain("alias.example.com");
  });

  it("keeps the placeholder image out of og:image even though it arrives as an https URL", () => {
    const { metadata, model } = buildMetadataFor({
      propertySnapshot: {
        property: { title: "Wellness Villa Bisous" },
        location: { city: "Ubud", country: "Indonesia" },
        images: [],
      },
    });

    expect(model.media.heroImage).toContain("data:image/svg+xml");
    expect(metadata.openGraph["og:image"]).toBeUndefined();
    expect(metadata.openGraph["og:image:alt"]).toBeUndefined();
    expect(metadata.twitter["twitter:card"]).toBe("summary");
    expect(JSON.stringify(metadata)).not.toContain("data:image");
  });

  it("uses the first gallery photo as the shared image", () => {
    const { metadata } = buildMetadataFor();

    expect(metadata.openGraph["og:image"]).toBe(
      "https://accommodation.s3.eu-north-1.amazonaws.com/images/property/first/web.jpg"
    );
    expect(metadata.openGraph["og:image:alt"]).toBe(metadata.title);
    expect(metadata.twitter["twitter:card"]).toBe("summary_large_image");
  });

  it("describes the stay in JSON-LD without publishing a price", () => {
    const { metadata } = buildMetadataFor();

    expect(metadata.jsonLd).toMatchObject({
      "@context": "https://schema.org",
      "@type": "LodgingBusiness",
      name: "Wellness Villa Bisous",
      url: "https://wellness-villa-bisous-bf378265.direct.domits.com/",
      address: { "@type": "PostalAddress", addressLocality: "Ubud", addressCountry: "Indonesia" },
    });
    expect(metadata.jsonLd).toEqual({
      "@context": "https://schema.org",
      "@type": "LodgingBusiness",
      name: "Wellness Villa Bisous",
      description: metadata.description,
      url: "https://wellness-villa-bisous-bf378265.direct.domits.com/",
      image: [FIRST_PHOTO, SECOND_PHOTO],
      address: { "@type": "PostalAddress", addressLocality: "Ubud", addressCountry: "Indonesia" },
      amenityFeature: [
        { "@type": "LocationFeatureSpecification", name: "Freezer", value: true },
        { "@type": "LocationFeatureSpecification", name: "Oven", value: true },
      ],
      checkinTime: "15:00:00",
      checkoutTime: "11:00:00",
      containsPlace: {
        "@type": "Accommodation",
        occupancy: { "@type": "QuantitativeValue", value: 8 },
        numberOfBedrooms: 4,
        numberOfBathroomsTotal: 3,
      },
    });
    const serializedJsonLd = JSON.stringify(metadata.jsonLd);
    expect(serializedJsonLd).not.toContain("550");
    expect(serializedJsonLd).not.toMatch(/price|offer/i);
  });

  it("claims nothing the page does not show once a host hid the gallery and the amenities", () => {
    const { metadata } = buildMetadataFor({
      contentOverrides: { visibility: { gallerySection: false, amenitiesPanel: false } },
    });

    expect(metadata.jsonLd.image).toEqual([FIRST_PHOTO]);
    expect(metadata.jsonLd.amenityFeature).toBeUndefined();
    expect(metadata.jsonLd.alternateName).toBeUndefined();
    expect(metadata.openGraph["og:image"]).toBe(FIRST_PHOTO);
  });


  it("does not report bedrooms as the total number of rooms", () => {
    const { metadata, model } = buildMetadataFor();

    expect(model.stay.bedrooms).toBe(4);
    expect(metadata.jsonLd.numberOfRooms).toBeUndefined();
    expect(metadata.jsonLd.containsPlace.numberOfRooms).toBeUndefined();
    expect(metadata.jsonLd.containsPlace.numberOfBedrooms).toBe(4);
  });

  it("falls back to the site name when the snapshot carries no listing title", () => {
    const { metadata } = buildMetadataFor({
      propertySnapshot: { property: {}, location: {}, images: [] },
      contentOverrides: {},
    });

    expect(metadata.title).toBe("Wellness Villa Bisous");
    expect(metadata.jsonLd.name).toBe("Wellness Villa Bisous");
    expect(metadata.title).not.toContain("Untitled listing");
  });

  it("only publishes og:locale when the locale carries a territory", () => {
    expect(buildMetadataFor().metadata.openGraph["og:locale"]).toBeUndefined();
    expect(buildMetadataFor({ site: { primaryLocale: "nl_NL" } }).metadata.openGraph["og:locale"]).toBe("nl_NL");
  });

  it("recognises a regional locale however the database stored it", () => {
    ["nl_NL", "nl_nl", "nl-NL", "nl-nl"].forEach((primaryLocale) => {
      expect(buildMetadataFor({ site: { primaryLocale } }).metadata.openGraph["og:locale"]).toBe("nl_NL");
    });
  });
});

describe("the structured data lists the photos the static page shows", () => {
  it("lists the hero photo first and every gallery photo once", () => {
    const { metadata, model } = buildMetadataFor();

    expect(metadata.jsonLd.image).toEqual([FIRST_PHOTO, SECOND_PHOTO]);
    expect(metadata.jsonLd.image[0]).toBe(model.media.heroImage);
    expect(model.media.galleryImages).toEqual([FIRST_PHOTO, SECOND_PHOTO]);
  });

  it("keeps only the hero photo when the host hid the gallery section", () => {
    const { metadata } = buildMetadataFor({ contentOverrides: { visibility: { gallerySection: false } } });

    expect(metadata.jsonLd.image).toEqual([FIRST_PHOTO]);
  });

  it("lists a photo once, however often a gallery repeats it, without using up a slot", () => {
    const photos = ["a", "b", "c", "d", "e", "f", "g"].map(
      (name) => `https://accommodation.s3.eu-north-1.amazonaws.com/images/property/${name}/web.jpg`
    );
    const metadata = buildStaticSiteMetadata({
      renderPayload: buildPublishedSiteRenderPayload(),
      model: {
        site: { title: "Villa" },
        media: { heroImage: photos[0], galleryImages: [photos[0], photos[1], photos[0], photos[1], ...photos.slice(2)] },
      },
    });

    expect(metadata.jsonLd.image).toEqual(photos.slice(0, 6));
  });

  it("stops at the six gallery photos the page renders, even when a model carries more", () => {
    const photos = ["a", "b", "c", "d", "e", "f", "g", "h", "i"].map(
      (name) => `https://accommodation.s3.eu-north-1.amazonaws.com/images/property/${name}/web.jpg`
    );
    const metadata = buildStaticSiteMetadata({
      renderPayload: buildPublishedSiteRenderPayload(),
      model: { site: { title: "Villa" }, media: { heroImage: photos[0], galleryImages: photos } },
    });

    expect(metadata.jsonLd.image).toEqual(photos.slice(0, 6));
  });

  it("lists a hero photo the host picked outside the gallery as an extra image", () => {
    const hostPick = "https://accommodation.s3.eu-north-1.amazonaws.com/images/property/hero-pick/web.jpg";
    const { metadata } = buildMetadataFor({ contentOverrides: { heroImage: hostPick } });

    expect(metadata.jsonLd.image).toEqual([hostPick, FIRST_PHOTO, SECOND_PHOTO]);
  });

  it("claims no image at all rather than the placeholder when the listing has no photo", () => {
    const { metadata, model } = buildMetadataFor({ propertySnapshot: { images: [] } });

    expect(model.media.heroImage).toContain("data:image/svg+xml");
    expect(metadata.jsonLd.image).toBeUndefined();
    expect(JSON.stringify(metadata.jsonLd)).not.toContain("data:image");
  });
});

describe("the structured data names the amenities the static page lists", () => {
  const FEATURE = "LocationFeatureSpecification";

  it("names each listed amenity as a feature the stay has, in the order of the page", () => {
    const { metadata, model } = buildMetadataFor();

    expect(metadata.jsonLd.amenityFeature).toEqual([
      { "@type": FEATURE, name: "Freezer", value: true },
      { "@type": FEATURE, name: "Oven", value: true },
    ]);
    expect(metadata.jsonLd.amenityFeature.map((feature) => feature.name)).toEqual(
      model.amenities.featured.map((amenity) => amenity.label)
    );
  });

  it("claims no amenity when the host hid the amenities panel", () => {
    const { metadata } = buildMetadataFor({ contentOverrides: { visibility: { amenitiesPanel: false } } });

    expect(metadata.jsonLd.amenityFeature).toBeUndefined();
  });

  it("claims no amenity when the listing has none", () => {
    const { metadata } = buildMetadataFor({ propertySnapshot: { amenities: [] } });

    expect(metadata.jsonLd.amenityFeature).toBeUndefined();
  });

  it("follows the amenities a host renamed or added, because the page shows those", () => {
    const { metadata } = buildMetadataFor({
      contentOverrides: { amenities: [{ id: "pool", label: "Heated pool", category: "Outdoor" }] },
    });

    expect(metadata.jsonLd.amenityFeature).toEqual([{ "@type": FEATURE, name: "Heated pool", value: true }]);
  });

  it("leaves an amenity the host never named out of the structured data", () => {
    const { metadata } = buildMetadataFor({
      contentOverrides: { amenities: [{ id: "pool", label: "Heated pool" }, { id: "blank", label: "" }] },
    });

    expect(metadata.jsonLd.amenityFeature).toEqual([{ "@type": FEATURE, name: "Heated pool", value: true }]);
    expect(JSON.stringify(metadata.jsonLd)).not.toContain("New amenity");
  });
});

describe("the structured data gives the size of the stay", () => {
  const detail = (name, value) => ({ detail: name, value });

  it("describes the accommodation with its guests, bedrooms and bathrooms", () => {
    const { metadata } = buildMetadataFor();

    expect(metadata.jsonLd.containsPlace).toEqual({
      "@type": "Accommodation",
      occupancy: { "@type": "QuantitativeValue", value: 8 },
      numberOfBedrooms: 4,
      numberOfBathroomsTotal: 3,
    });
  });

  it("leaves out a count the listing does not have", () => {
    const { metadata } = buildMetadataFor({ propertySnapshot: { generalDetails: [detail("Guests", 6)] } });

    expect(metadata.jsonLd.containsPlace).toEqual({
      "@type": "Accommodation",
      occupancy: { "@type": "QuantitativeValue", value: 6 },
    });
  });

  it("leaves the accommodation out when the listing has no counts at all", () => {
    const { metadata } = buildMetadataFor({ propertySnapshot: { generalDetails: [] } });

    expect(metadata.jsonLd.containsPlace).toBeUndefined();
  });

  it("ignores a count that reaches it as a fraction, a string or a boolean", () => {
    const metadata = buildStaticSiteMetadata({
      renderPayload: buildPublishedSiteRenderPayload(),
      model: { site: { title: "Villa" }, stay: { guests: 2.5, bedrooms: "3", bathrooms: true } },
    });

    expect(metadata.jsonLd.containsPlace).toBeUndefined();
  });

  it("follows the counts the model shows: whole numbers, nothing for a missing or negative count", () => {
    const { metadata } = buildMetadataFor({
      propertySnapshot: {
        generalDetails: [detail("Guests", "eight"), detail("Bedrooms", -1), detail("Bathrooms", 2.5), detail("Beds", 4)],
      },
    });

    expect(metadata.jsonLd.containsPlace).toEqual({ "@type": "Accommodation", numberOfBathroomsTotal: 2 });
  });
});

describe("the structured data gives the check-in and check-out times", () => {
  it("writes the earliest check-in and the latest check-out as schema.org times", () => {
    const { metadata, model } = buildMetadataFor();

    expect(model.stay.checkInLabel).toBe("15:00");
    expect(model.stay.checkOutLabel).toBe("11:00");
    expect(metadata.jsonLd.checkinTime).toBe("15:00:00");
    expect(metadata.jsonLd.checkoutTime).toBe("11:00:00");
  });

  it("accepts the seconds the database stores and keeps them", () => {
    const { metadata } = buildMetadataFor({
      propertySnapshot: { checkIn: { checkIn: { from: "14:30:15" }, checkOut: { from: "08:00:00", till: "10:45:30" } } },
    });

    expect(metadata.jsonLd.checkinTime).toBe("14:30:15");
    expect(metadata.jsonLd.checkoutTime).toBe("10:45:30");
  });

  it("leaves a time out when the listing has none or it is not a time of day", () => {
    [
      { checkIn: {}, checkOut: {} },
      { checkIn: { from: "whenever" }, checkOut: { till: "25:00" } },
      { checkIn: { from: "15:60" }, checkOut: { till: "1100" } },
      { checkIn: { from: 1500 }, checkOut: { till: null } },
    ].forEach((checkIn) => {
      const { metadata } = buildMetadataFor({ propertySnapshot: { checkIn } });

      expect(metadata.jsonLd.checkinTime).toBeUndefined();
      expect(metadata.jsonLd.checkoutTime).toBeUndefined();
    });
    expect(buildMetadataFor({ propertySnapshot: { checkIn: null } }).metadata.jsonLd.checkinTime).toBeUndefined();
  });

  it("keeps one time when only the other is missing", () => {
    const { metadata } = buildMetadataFor({ propertySnapshot: { checkIn: { checkIn: { from: "16:00" }, checkOut: {} } } });

    expect(metadata.jsonLd.checkinTime).toBe("16:00:00");
    expect(metadata.jsonLd.checkoutTime).toBeUndefined();
  });
});

describe("the boundary of the structured data", () => {
  const ALLOWED_KEYS = {
    LodgingBusiness: [
      "@context",
      "@type",
      "name",
      "description",
      "url",
      "image",
      "address",
      "amenityFeature",
      "checkinTime",
      "checkoutTime",
      "containsPlace",
    ],
    PostalAddress: ["@type", "addressLocality", "addressCountry"],
    LocationFeatureSpecification: ["@type", "name", "value"],
    Accommodation: ["@type", "occupancy", "numberOfBedrooms", "numberOfBathroomsTotal"],
    QuantitativeValue: ["@type", "value"],
  };

  const collectNodes = (value, nodes = []) => {
    if (Array.isArray(value)) {
      value.forEach((item) => collectNodes(item, nodes));
    } else if (value && typeof value === "object") {
      nodes.push(value);
      Object.values(value).forEach((item) => collectNodes(item, nodes));
    }
    return nodes;
  };

  it("uses only schema.org properties that belong to the type they sit on", () => {
    const nodes = collectNodes(buildMetadataFor().metadata.jsonLd);

    expect(nodes.map((node) => node["@type"])).toEqual([
      "LodgingBusiness",
      "PostalAddress",
      "LocationFeatureSpecification",
      "LocationFeatureSpecification",
      "Accommodation",
      "QuantitativeValue",
    ]);
    nodes.forEach((node) => {
      Object.keys(node).forEach((key) => expect(ALLOWED_KEYS[node["@type"]]).toContain(key));
    });
  });

  it("never writes a phone number, coordinates, a street or an e-mail address into the structured data", () => {
    const { metadata } = buildMetadataFor({
      propertySnapshot: {
        location: {
          country: "Indonesia",
          city: "Ubud",
          street: "Jalan Raya Sayan",
          houseNumber: "17",
          postalCode: "80571",
          latitude: -8.5069,
          longitude: 115.2625,
        },
        hostProfile: {
          givenName: "Amara",
          email: "amara@example.com",
          whatsapp: {
            isAvailable: true,
            connected: true,
            displayName: "Amara",
            phoneNumber: "+62 812 3456 7890",
            phoneNumberDigits: "6281234567890",
          },
        },
      },
    });
    const serialized = JSON.stringify(metadata.jsonLd);

    ["telephone", "faxNumber", "email", "geo", "latitude", "longitude", "streetAddress", "postalCode"].forEach((key) =>
      expect(serialized).not.toContain(`"${key}"`)
    );
    ["3456", "6281234567890", "Jalan Raya Sayan", "80571", "115.26", "8.5069", "example.com"].forEach((value) =>
      expect(serialized).not.toContain(value)
    );
    expect(metadata.jsonLd.address).toEqual({ "@type": "PostalAddress", addressLocality: "Ubud", addressCountry: "Indonesia" });
  });

  it("skips an amenity name that carries a phone number, an e-mail address, coordinates or a link", () => {
    const { metadata } = buildMetadataFor({
      contentOverrides: {
        amenities: [
          { id: "pool", label: "Heated pool" },
          { id: "tv", label: "55-inch TV" },
          { id: "phone", label: "WhatsApp +62 812 3456 7890" },
          { id: "mail", label: "Mail amara@example.com" },
          { id: "geo", label: "Pool at -8.5069, 115.2625" },
          { id: "long", label: "A".repeat(81) },
        ],
      },
    });
    const linked = buildMetadataFor({
      contentOverrides: {
        amenities: [
          { id: "sauna", label: "Sauna & jacuzzi (heated), 2 towels" },
          { id: "link", label: "See www.example.com" },
          { id: "url", label: "https://example.com/villa" },
          { id: "short-link", label: "Bekijk maps.app.goo.gl/AbCdEf" },
          { id: "comma-decimal", label: "Breedtegraad 52,1234" },
          { id: "spaced-phone", label: "Tel 06 12 34 56 78" },
        ],
      },
    });

    expect(metadata.jsonLd.amenityFeature.map((feature) => feature.name)).toEqual(["Heated pool", "55-inch TV"]);
    const serialized = JSON.stringify(metadata.jsonLd);
    ["3456", "example.com", "115.2625", "AAAA"].forEach((value) => expect(serialized).not.toContain(value));
    expect(linked.metadata.jsonLd.amenityFeature.map((feature) => feature.name)).toEqual([
      "Sauna & jacuzzi (heated), 2 towels",
    ]);
  });

  it("lists only photos from the accommodation bucket, so a photo address cannot carry text", () => {
    const bucket = "https://accommodation.s3.eu-north-1.amazonaws.com/images/";
    const metadata = buildStaticSiteMetadata({
      renderPayload: buildPublishedSiteRenderPayload(),
      model: {
        site: { title: "Villa" },
        media: {
          heroImage: `${bucket}ecd926d9-67dc-4d0a-9b40-2884d0838406/0a1b2c3d/web.jpg`,
          galleryImages: [
            "https://photos.example.com/amara@example.com/pool.jpg",
            `${bucket}p/amara@example.com/web.jpg`,
            `${bucket}p/0612345678 pool/web.jpg`,
            "https://accommodation.s3.eu-north-1.amazonaws.com.evil.example/images/p/web.jpg",
            `${bucket}p/second/web.jpg`,
          ],
        },
      },
    });

    expect(metadata.jsonLd.image).toEqual([
      `${bucket}ecd926d9-67dc-4d0a-9b40-2884d0838406/0a1b2c3d/web.jpg`,
      `${bucket}p/second/web.jpg`,
    ]);
  });

  it("lists no photo whose address carries a query string or a fragment", () => {
    const tracked = "https://accommodation.s3.eu-north-1.amazonaws.com/images/property/x/web.jpg?phone=6281234567890";
    const { metadata } = buildMetadataFor({
      contentOverrides: {
        heroImage: tracked,
        galleryImages: [FIRST_PHOTO, "https://accommodation.s3.eu-north-1.amazonaws.com/images/property/y/web.jpg#tel"],
      },
    });

    expect(metadata.jsonLd.image).toEqual([FIRST_PHOTO]);
    expect(JSON.stringify(metadata.jsonLd)).not.toContain("6281234567890");
  });

  it("claims no rating, because the published snapshot carries no reviews", () => {
    const { metadata } = buildMetadataFor();

    expect(metadata.jsonLd.aggregateRating).toBeUndefined();
    expect(metadata.jsonLd.review).toBeUndefined();
    expect(JSON.stringify(metadata.jsonLd)).not.toMatch(/rating|review/i);
  });

  it("still publishes no price", () => {
    const serialized = JSON.stringify(buildMetadataFor().metadata.jsonLd);

    expect(serialized).not.toContain("550");
    expect(serialized).not.toMatch(/price|offer/i);
  });
});

describe("what happens when the input is missing or malformed", () => {
  it("returns a safe, non indexable result for nothing at all", () => {
    [undefined, {}, { renderPayload: null, model: null }].forEach((input) => {
      const metadata = buildStaticSiteMetadata(input || {});

      expect(metadata.robots).toBe("noindex, nofollow");
      expect(metadata.canonicalUrl).toBe("");
      expect(metadata.jsonLd).toBeNull();
      expect(metadata.title).toBe("Direct booking website");
      expect(metadata.openGraph["og:image"]).toBeUndefined();
    });
  });

  it("does not crash when the model carries the wrong types", () => {
    const model = {
      site: { title: 42 },
      location: { city: [], country: {} },
      amenities: { all: "not an array" },
      media: { heroImage: 7, galleryImages: "not an array" },
      hero: { description: null },
      visibility: "not an object",
    };

    const metadata = buildStaticSiteMetadata({ renderPayload: { site: {}, domain: "not an object" }, model });

    expect(metadata.robots).toBe("noindex, nofollow");
    expect(metadata.title).toBe("42");
    expect(metadata.openGraph["og:image"]).toBeUndefined();
    expect(metadata.jsonLd).toBeNull();
  });

  it("does not crash when the payload carries the wrong types", () => {
    const renderPayload = { resolution: "nope", site: 5, domain: ["also nope"] };

    expect(() => buildStaticSiteMetadata({ renderPayload, model: {} })).not.toThrow();
    expect(buildStaticSiteMetadata({ renderPayload, model: {} }).canonicalUrl).toBe("");
  });

  it("refuses a domain that is not a hostname", () => {
    ["", "not a hostname", "http://example.com", "example", "..", "a..b", "-bad.example.com"].forEach((domain) => {
      const metadata = buildStaticSiteMetadata({
        renderPayload: buildPublishedSiteRenderPayload({ domain: { domain, isPrimary: true, status: "ACTIVE" } }),
        model: {},
      });

      expect(metadata.canonicalUrl).toBe("");
      expect(metadata.robots).toBe("noindex, nofollow");
    });
  });
});

describe("the boundary of the privacy rules", () => {
  it("never puts the street, house number or postal code in a field it composes itself", () => {
    const { metadata } = buildMetadataFor();
    const composed = JSON.stringify([metadata.title, metadata.canonicalUrl, metadata.openGraph, metadata.jsonLd]);

    expect(composed).not.toContain("Jalan Raya Sayan");
    expect(composed).not.toContain("80571");
    expect(composed).not.toContain('"17"');
    expect(metadata.jsonLd.address).toEqual({
      "@type": "PostalAddress",
      addressLocality: "Ubud",
      addressCountry: "Indonesia",
    });
  });

  it("passes the description the host published through unchanged, because it is already public", () => {
    const hostWrote = "Our villa on Jalan Raya Sayan 17, from EUR 550 per night.";
    const { metadata } = buildMetadataFor({
      propertySnapshot: { property: { title: "Wellness Villa Bisous", description: hostWrote } },
    });

    expect(metadata.description).toBe(hostWrote);
  });
});

describe("calling it with no argument at all", () => {
  it("does not crash and produces a non indexable result", () => {
    [
      () => buildStaticSiteMetadata(),
      () => buildStaticSiteMetadata(null),
      () => buildStaticSiteMetadata({}),
    ].forEach((call) => {
      expect(call).not.toThrow();
      expect(call().robots).toBe("noindex, nofollow");
      expect(call().jsonLd).toBeNull();
    });
  });

  it("survives a value that cannot be turned into text", () => {
    const hostile = { toString: 0 };

    expect(() =>
      buildStaticSiteMetadata({
        renderPayload: buildPublishedSiteRenderPayload({ site: { siteName: hostile } }),
        model: { location: { city: hostile, country: hostile }, site: { title: hostile } },
      })
    ).not.toThrow();
  });

  it("never writes an object into the structured data", () => {
    const metadata = buildStaticSiteMetadata({
      renderPayload: buildPublishedSiteRenderPayload(),
      model: { site: { title: "Villa" }, location: { city: { nope: true }, country: ["nope"] } },
    });

    expect(JSON.stringify(metadata.jsonLd)).not.toContain("[object Object]");
    expect(metadata.jsonLd.address).toBeUndefined();
  });
});

describe("the canonical never drifts to another domain", () => {
  it("accepts a custom domain when it is the primary one", () => {
    const { metadata } = buildMetadataFor({
      domain: { domain: "www.villasensual.nl", status: "ACTIVE", isPrimary: true },
    });

    expect(metadata.canonicalUrl).toBe("https://www.villasensual.nl/");
    expect(metadata.robots).toBe("index, follow");
  });

  it("claims nothing when the fallback domain is not the primary one", () => {
    const { metadata } = buildMetadataFor({
      domain: { domain: "villa-x-12345678.direct.domits.com", status: "ACTIVE", isPrimary: false },
    });

    expect(metadata.canonicalUrl).toBe("");
    expect(metadata.robots).toBe("noindex, nofollow");
  });
});
