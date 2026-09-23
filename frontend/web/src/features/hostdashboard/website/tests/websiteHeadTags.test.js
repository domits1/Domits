import { placeholderImage, S3_ACCOMMODATION_URL } from "../../../../utils/accommodationImage";
import {
  buildWebsiteHeadTags,
  buildWebsiteHeadTitle,
  truncateWebsiteHeadText,
  WEBSITE_HEAD_DESCRIPTION_MAX_LENGTH,
  WEBSITE_HEAD_OG_TYPE,
  WEBSITE_HEAD_ROBOTS_NOINDEX,
} from "../seo/websiteHeadTags";

const buildModel = (overrides = {}) => ({
  site: {
    title: "Wellness Villa Bisous",
    subtitle: "A serene four bedroom villa with a private pool.",
  },
  hero: {
    description: "Generated hero description.",
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

  it("falls back to the hero description when there is no subtitle", () => {
    const tags = buildWebsiteHeadTags({
      model: buildModel({ site: { title: "Wellness Villa Bisous", subtitle: "" } }),
    });

    expect(tags.metaByName.description).toBe("Generated hero description.");
  });

  it("drops the placeholder image instead of exposing a data url", () => {
    const tags = buildWebsiteHeadTags({
      model: buildModel({ media: { heroImage: placeholderImage, galleryImages: [] } }),
    });

    expect(tags.metaByProperty["og:image"]).toBeUndefined();
    expect(tags.metaByProperty["og:image:alt"]).toBeUndefined();
    expect(JSON.stringify(tags)).not.toContain("data:");
  });

  it("skips the placeholder and takes the first absolute gallery image", () => {
    const tags = buildWebsiteHeadTags({
      model: buildModel({
        media: {
          heroImage: placeholderImage,
          galleryImages: [`${S3_ACCOMMODATION_URL}images/property/second/web.jpg`],
        },
      }),
    });

    expect(tags.metaByProperty["og:image"]).toBe(`${S3_ACCOMMODATION_URL}images/property/second/web.jpg`);
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
      model: buildModel({ site: { title: "Wellness Villa Bisous", subtitle: longDescription } }),
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
      model: buildModel({ site: { title: "Wellness  Villa\nBisous", subtitle: "Serene\n\n  villa." } }),
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
