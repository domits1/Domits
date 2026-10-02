import { buildWebsiteTemplateModel } from "../../rendering/buildWebsiteTemplateModel";
import { applyWebsiteDraftContentOverrides } from "../../rendering/websiteDraftContentOverrides";
import { buildStaticSiteMetadata } from "../buildStaticSiteMetadata";
import { buildPublishedSiteRenderPayload } from "./publishedSiteRenderPayload";

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
      address: { "@type": "PostalAddress", addressLocality: "Ubud", addressCountry: "Indonesia" },
    });
    const serializedJsonLd = JSON.stringify(metadata.jsonLd);
    expect(serializedJsonLd).not.toContain("550");
    expect(serializedJsonLd).not.toMatch(/price|offer/i);
  });

  it("claims no photos and no amenities in the structured data, because a template may hide them", () => {
    const { metadata } = buildMetadataFor();

    expect(metadata.jsonLd.image).toBeUndefined();
    expect(metadata.jsonLd.amenityFeature).toBeUndefined();
    expect(metadata.jsonLd.alternateName).toBeUndefined();
    expect(metadata.openGraph["og:image"]).toContain("first/web.jpg");
  });


  it("does not report bedrooms as the total number of rooms", () => {
    const { metadata, model } = buildMetadataFor();

    expect(model.stay.bedrooms).toBe(4);
    expect(metadata.jsonLd.numberOfRooms).toBeUndefined();
    expect(JSON.stringify(metadata.jsonLd)).not.toContain("4");
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
      domain: { domain: "www.villasensual.nl", domainType: "CUSTOM", status: "ACTIVE", isPrimary: true },
    });

    expect(metadata.canonicalUrl).toBe("https://www.villasensual.nl/");
    expect(metadata.robots).toBe("index, follow");
  });

  it("claims nothing when the fallback domain is not the primary one", () => {
    const { metadata } = buildMetadataFor({
      domain: { domain: "villa-x-12345678.direct.domits.com", domainType: "FALLBACK", status: "ACTIVE", isPrimary: false },
    });

    expect(metadata.canonicalUrl).toBe("");
    expect(metadata.robots).toBe("noindex, nofollow");
  });
});
