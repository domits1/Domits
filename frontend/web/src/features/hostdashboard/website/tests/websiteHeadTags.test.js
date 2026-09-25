import { normalizeImageUrl, placeholderImage, S3_ACCOMMODATION_URL } from "../../../../utils/accommodationImage";
import { buildWebsiteTemplateModel } from "../rendering/buildWebsiteTemplateModel";
import { applyWebsiteDraftContentOverrides } from "../rendering/websiteDraftContentOverrides";
import { applyWebsiteDraftThemeOverrides } from "../rendering/websiteDraftThemeOverrides";
import {
  buildWebsiteHeadTags,
  buildWebsiteHeadTitle,
  truncateWebsiteHeadText,
  WEBSITE_HEAD_DESCRIPTION_MAX_LENGTH,
  WEBSITE_HEAD_OG_TYPE,
  WEBSITE_HEAD_ROBOTS_NOINDEX,
} from "../seo/websiteHeadTags";

const NORMALIZED_PLACEHOLDER = normalizeImageUrl(placeholderImage);

const buildPublishedModel = (propertySnapshot, contentOverrides = {}) => {
  const baseModel = buildWebsiteTemplateModel({ propertyDetails: propertySnapshot, summaryProperty: null });
  const themedModel = applyWebsiteDraftThemeOverrides(baseModel, {});

  return applyWebsiteDraftContentOverrides(themedModel, contentOverrides, "panorama-landing");
};

const buildModel = (overrides = {}) => ({
  site: {
    title: "Wellness Villa Bisous",
    subtitle: "Subtitle copy that no template renders.",
  },
  hero: {
    description: "A serene four bedroom villa with a private pool.",
  },
  location: {
    city: "Ubud",
    country: "Indonesia",
  },
  media: {
    heroImage: `${S3_ACCOMMODATION_URL}images/property/hero/web.jpg`,
    galleryImages: [`${S3_ACCOMMODATION_URL}images/property/second/web.jpg`],
  },
  ...overrides,
});

describe("buildWebsiteHeadTags", () => {
  it("builds the title, description and open graph tags from the resolved model", () => {
    const tags = buildWebsiteHeadTags({ model: buildModel() });

    expect(tags.title).toBe("Wellness Villa Bisous | Ubud, Indonesia");
    expect(tags.metaByName.description).toBe("A serene four bedroom villa with a private pool.");
    expect(tags.metaByProperty).toEqual({
      "og:type": WEBSITE_HEAD_OG_TYPE,
      "og:title": "Wellness Villa Bisous | Ubud, Indonesia",
      "og:description": "A serene four bedroom villa with a private pool.",
      "og:image": `${S3_ACCOMMODATION_URL}images/property/hero/web.jpg`,
      "og:image:alt": "Wellness Villa Bisous | Ubud, Indonesia",
    });
    expect(tags.metaByName.robots).toBeUndefined();
  });

  it("never exposes the street, house number or postal code", () => {
    const model = buildModel({
      location: {
        city: "Ubud",
        country: "Indonesia",
        street: "Jl. Ir. Sutami, Kemenuh",
        houseNumber: 1,
        postalCode: "80581",
      },
      property: {
        location: {
          street: "Jl. Ir. Sutami, Kemenuh",
          postalCode: "80581",
        },
      },
    });

    const serializedTags = JSON.stringify(buildWebsiteHeadTags({ model }));

    expect(serializedTags).not.toContain("Sutami");
    expect(serializedTags).not.toContain("80581");
    expect(serializedTags).not.toContain("Kemenuh");
  });

  it("omits the separator when the city is missing", () => {
    const tags = buildWebsiteHeadTags({
      model: buildModel({ location: { city: "", country: "Indonesia" } }),
    });

    expect(tags.title).toBe("Wellness Villa Bisous | Indonesia");
  });

  it("uses the bare title when both the city and the country are missing", () => {
    const tags = buildWebsiteHeadTags({
      model: buildModel({ location: { city: "", country: "" } }),
    });

    expect(tags.title).toBe("Wellness Villa Bisous");
    expect(tags.title).not.toContain("|");
    expect(tags.title).not.toContain(",");
  });

  it("omits the description when there is no text", () => {
    const tags = buildWebsiteHeadTags({
      model: buildModel({ site: { title: "Wellness Villa Bisous", subtitle: "   " }, hero: { description: "" } }),
    });

    expect(tags.metaByName.description).toBeUndefined();
    expect(tags.metaByProperty["og:description"]).toBeUndefined();
    expect(tags.metaByProperty["og:title"]).toBe("Wellness Villa Bisous | Ubud, Indonesia");
  });

  it("prefers the hero description that the guest actually reads", () => {
    const tags = buildWebsiteHeadTags({ model: buildModel() });

    expect(tags.metaByName.description).toBe("A serene four bedroom villa with a private pool.");
    expect(tags.metaByName.description).not.toContain("no template renders");
  });

  it("falls back to the subtitle when the model carries no hero description", () => {
    const tags = buildWebsiteHeadTags({
      model: buildModel({ hero: { description: "" } }),
    });

    expect(tags.metaByName.description).toBe("Subtitle copy that no template renders.");
  });

  it("drops the placeholder in the shape the model builder produces it", () => {
    const tags = buildWebsiteHeadTags({
      model: buildModel({ media: { heroImage: NORMALIZED_PLACEHOLDER, galleryImages: [NORMALIZED_PLACEHOLDER] } }),
    });

    expect(NORMALIZED_PLACEHOLDER).toMatch(/^https:\/\//);
    expect(tags.metaByProperty["og:image"]).toBeUndefined();
    expect(tags.metaByProperty["og:image:alt"]).toBeUndefined();
    expect(JSON.stringify(tags)).not.toContain("data:");
  });

  it("skips the normalized placeholder and takes the next real image", () => {
    const tags = buildWebsiteHeadTags({
      model: buildModel({
        media: {
          heroImage: NORMALIZED_PLACEHOLDER,
          galleryImages: [NORMALIZED_PLACEHOLDER, `${S3_ACCOMMODATION_URL}images/property/second/web.jpg`],
        },
      }),
    });

    expect(tags.metaByProperty["og:image"]).toBe(`${S3_ACCOMMODATION_URL}images/property/second/web.jpg`);
    expect(tags.metaByProperty["og:image:alt"]).toBe("Wellness Villa Bisous | Ubud, Indonesia");
  });

  it("keeps a storage key that merely contains the word data", () => {
    const tags = buildWebsiteHeadTags({
      model: buildModel({ media: { heroImage: "images/userdata:1/web.jpg", galleryImages: [] } }),
    });

    expect(tags.metaByProperty["og:image"]).toBe(`${S3_ACCOMMODATION_URL}images/userdata:1/web.jpg`);
  });

  it("resolves a bare storage key into an absolute url", () => {
    const tags = buildWebsiteHeadTags({
      model: buildModel({ media: { heroImage: "images/property/hero/web.jpg", galleryImages: [] } }),
    });

    expect(tags.metaByProperty["og:image"]).toBe(`${S3_ACCOMMODATION_URL}images/property/hero/web.jpg`);
  });

  it("normalizes whitespace and shortens the description on a word boundary", () => {
    const longDescription = `${"detail ".repeat(60)}end`;
    const tags = buildWebsiteHeadTags({
      model: buildModel({ hero: { description: longDescription } }),
    });
    const description = tags.metaByName.description;

    expect(description.length).toBeLessThanOrEqual(WEBSITE_HEAD_DESCRIPTION_MAX_LENGTH + 1);
    expect(description).toMatch(/…$/);
    expect(description).not.toMatch(/\s…$/);
    expect(description).not.toMatch(/ {2}/);
    expect(description.replace(/…$/, "").split(" ").pop()).toBe("detail");
  });

  it("collapses newlines and repeated spaces", () => {
    const tags = buildWebsiteHeadTags({
      model: buildModel({
        site: { title: "Wellness  Villa\nBisous", subtitle: "" },
        hero: { description: "Serene\n\n  villa." },
      }),
    });

    expect(tags.title).toBe("Wellness Villa Bisous | Ubud, Indonesia");
    expect(tags.metaByName.description).toBe("Serene villa.");
  });

  it("marks a marketplace surface as noindex without open graph tags", () => {
    const tags = buildWebsiteHeadTags({ model: buildModel(), isDirectBookingHost: false });

    expect(tags.metaByName).toEqual({ robots: WEBSITE_HEAD_ROBOTS_NOINDEX });
    expect(tags.metaByProperty).toEqual({});
    expect(tags.title).toBe("Wellness Villa Bisous | Ubud, Indonesia");
  });

  it("leaves the marketplace title empty until the model is there", () => {
    const tags = buildWebsiteHeadTags({ isDirectBookingHost: false });

    expect(tags.title).toBe("");
    expect(tags.metaByName).toEqual({ robots: WEBSITE_HEAD_ROBOTS_NOINDEX });
  });

  it("marks a missing published website as noindex", () => {
    const tags = buildWebsiteHeadTags({
      fallbackTitle: "Wellness Villa Bisous",
      isUnavailable: true,
      isMissing: true,
    });

    expect(tags.metaByName).toEqual({ robots: WEBSITE_HEAD_ROBOTS_NOINDEX });
    expect(tags.metaByProperty).toEqual({});
    expect(tags.title).toBe("Wellness Villa Bisous");
  });

  it("leaves an unavailable website indexable when the failure is not a missing site", () => {
    const tags = buildWebsiteHeadTags({
      fallbackTitle: "Wellness Villa Bisous",
      isUnavailable: true,
      isMissing: false,
    });

    expect(tags.metaByName).toEqual({});
    expect(tags.metaByProperty).toEqual({});
  });
});

describe("buildWebsiteHeadTags through the real model builder", () => {
  const propertySnapshot = {
    property: {
      id: "property-1",
      title: "Wellness Villa Bisous",
      subtitle: "Subtitle copy that no template renders.",
      description: "Imported description copy.",
    },
    location: {
      city: "Ubud",
      country: "Indonesia",
      street: "Jl. Ir. Sutami, Kemenuh",
      houseNumber: 1,
      postalCode: "80581",
    },
    images: [{ image_id: "image-1", key: "images/property-1/image-1/web.jpg", status: "READY" }],
  };

  it("uses the heroDescription override the host published", () => {
    const model = buildPublishedModel(propertySnapshot, { heroDescription: "Wake up to the rice fields." });

    const tags = buildWebsiteHeadTags({ model });

    expect(model.hero.description).toBe("Wake up to the rice fields.");
    expect(tags.metaByName.description).toBe("Wake up to the rice fields.");
    expect(tags.metaByProperty["og:description"]).toBe("Wake up to the rice fields.");
  });

  it("uses the generated hero sentence when the property has no description of its own", () => {
    const model = buildPublishedModel({
      ...propertySnapshot,
      property: { ...propertySnapshot.property, description: "" },
    });

    const tags = buildWebsiteHeadTags({ model });

    expect(tags.metaByName.description).toBe(model.hero.description);
    expect(tags.metaByName.description).not.toBe("Subtitle copy that no template renders.");
  });

  it("emits no og:image and no og:image:alt for a published snapshot without images", () => {
    const model = buildPublishedModel({ ...propertySnapshot, images: [] });

    const tags = buildWebsiteHeadTags({ model });

    expect(model.media.heroImage).toContain("data:");
    expect(tags.metaByProperty["og:image"]).toBeUndefined();
    expect(tags.metaByProperty["og:image:alt"]).toBeUndefined();
    expect(JSON.stringify(tags)).not.toContain("data:");
  });

  it("emits the real image for a published snapshot that has one", () => {
    const model = buildPublishedModel(propertySnapshot);

    const tags = buildWebsiteHeadTags({ model });

    expect(tags.metaByProperty["og:image"]).toBe(`${S3_ACCOMMODATION_URL}images/property-1/image-1/web.jpg`);
    expect(tags.metaByProperty["og:image:alt"]).toBe("Wellness Villa Bisous | Ubud, Indonesia");
  });
});

describe("buildWebsiteHeadTitle", () => {
  it("returns an empty title when there is no name", () => {
    expect(buildWebsiteHeadTitle({ title: "  ", city: "Ubud", country: "Indonesia" })).toBe("");
  });
});

describe("truncateWebsiteHeadText", () => {
  it("leaves short text untouched", () => {
    expect(truncateWebsiteHeadText("Short description.")).toBe("Short description.");
  });

  it("hard cuts a single word that exceeds the limit", () => {
    const truncated = truncateWebsiteHeadText("a".repeat(200), 10);

    expect(truncated).toBe(`${"a".repeat(10)}…`);
  });

  it("strips trailing punctuation before the ellipsis", () => {
    const truncated = truncateWebsiteHeadText("alpha beta, gamma delta", 12);

    expect(truncated).toBe("alpha beta…");
  });
});
