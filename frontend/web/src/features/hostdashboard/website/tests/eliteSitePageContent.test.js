import { placeholderImage } from "../../../../utils/accommodationImage";
import { buildWebsiteTemplateModel } from "../rendering/buildWebsiteTemplateModel";
import { MAIN_SITE_PAGE_KEY, SITE_PAGE_DEFINITIONS } from "../rendering/websitePages";
import {
  ELITE_LEAD_MAX_LENGTH,
  TEMPLATE_GALLERY_INTRO,
  buildEliteDescription,
  buildEliteFacts,
  buildElitePrice,
  formatEliteClockTime,
  formatEliteNightlyPrice,
  hasEliteGalleryPhotos,
  hasEliteHeaderPhoto,
  isEliteRestyledPage,
  listEliteHighlights,
  listEliteHouseRules,
  resolveEliteGalleryIntro,
  resolveEliteGalleryLayout,
  resolveEliteAvailabilityLabel,
  resolveEliteHeaderTone,
  resolveEliteLocation,
  selectEliteAccommodationPhotos,
  selectEliteGallerySlots,
} from "../rendering/templates/elite/eliteSitePageContent";

const FULL_STAY = {
  guests: 6,
  bedrooms: 3,
  bathrooms: 3,
  checkInLabel: "15:00:00",
  checkOutLabel: "11:00:00",
  minimumStay: 7,
  nightlyRate: 2733,
};

describe("clock times on Elite site pages", () => {
  it.each([
    ["15:00:00", "15:00"],
    ["11:00", "11:00"],
    ["9:30", "09:30"],
    ["15:00:00.000", "15:00"],
    [" 15:00:00 ", "15:00"],
  ])("shows %p as %p", (value, expected) => {
    expect(formatEliteClockTime(value)).toBe(expected);
  });

  it.each([["Flexible"], ["25:00"], ["12:60"], ["15h00"]])("keeps %p as the host wrote it", (value) => {
    expect(formatEliteClockTime(value)).toBe(value);
  });

  it.each([[""], [null], [undefined], [{}]])("shows nothing for %p", (value) => {
    expect(formatEliteClockTime(value)).toBe("");
  });
});

describe("the nightly price on Elite site pages", () => {
  it("reads as euros with a thousands separator", () => {
    expect(formatEliteNightlyPrice(2733)).toBe("€2,733");
    expect(formatEliteNightlyPrice(1250000)).toBe("€1,250,000");
    expect(formatEliteNightlyPrice(95)).toBe("€95");
  });

  it.each([[0], [-5], ["abc"], [null], [undefined]])("is left out for %p", (value) => {
    expect(formatEliteNightlyPrice(value)).toBe("");
  });

  it("comes with the minimum stay note", () => {
    expect(buildElitePrice(FULL_STAY)).toEqual({ amount: "€2,733", minimumStayNote: "Minimum stay 7 nights." });
    expect(buildElitePrice({ nightlyRate: 120, minimumStay: 1 })).toEqual({
      amount: "€120",
      minimumStayNote: "Minimum stay 1 night.",
    });
  });

  it("leaves out what the listing does not have", () => {
    expect(buildElitePrice({})).toEqual({ amount: "", minimumStayNote: "" });
    expect(buildElitePrice()).toEqual({ amount: "", minimumStayNote: "" });
  });
});

describe("the facts row on Elite site pages", () => {
  it("shows every fact the listing has, with short times", () => {
    expect(buildEliteFacts(FULL_STAY)).toEqual([
      { id: "guests", label: "Guests", value: "Up to 6" },
      { id: "bedrooms", label: "Bedrooms", value: "3" },
      { id: "bathrooms", label: "Bathrooms", value: "3" },
      { id: "arrival", label: "Check-in / out", value: "15:00 · 11:00" },
      { id: "minimum-stay", label: "Minimum stay", value: "7 nights" },
    ]);
  });

  it("leaves out each missing fact", () => {
    expect(buildEliteFacts({ guests: 1, bathrooms: 0, minimumStay: 1 })).toEqual([
      { id: "guests", label: "Guests", value: "1" },
      { id: "minimum-stay", label: "Minimum stay", value: "1 night" },
    ]);
    expect(buildEliteFacts({})).toEqual([]);
    expect(buildEliteFacts(null)).toEqual([]);
  });

  it("shows check-in or check-out alone when only one is set", () => {
    expect(buildEliteFacts({ checkInLabel: "15:00:00" })).toEqual([
      { id: "arrival", label: "Check-in", value: "15:00" },
    ]);
    expect(buildEliteFacts({ checkOutLabel: "10:00:00" })).toEqual([
      { id: "arrival", label: "Check-out", value: "10:00" },
    ]);
  });
});

describe("the description on Elite site pages", () => {
  it("is left out when the template wrote it or the listing has none", () => {
    expect(buildEliteDescription({ description: "Villa in Cape Town for 6 guests.", isDescriptionGenerated: true })).toBe(
      null
    );
    expect(buildEliteDescription({ description: "   " })).toBe(null);
    expect(buildEliteDescription({})).toBe(null);
    expect(buildEliteDescription()).toBe(null);
  });

  it("opens with the first sentence and splits the rest into short paragraphs", () => {
    const description = [
      "A contemporary villa on the lower cliffs of Camps Bay.",
      "Concrete and timber shape the bold exterior and carry on inside, where the open-plan kitchen, living and dining areas are finished with refined furnishings.",
      "Signature art pieces and accents of marble, copper and glass complete the rooms.",
      "The upper level holds the main suite with a king-size bed and panoramic ocean views, and a second suite that opens onto a courtyard.",
      "The third bedroom is on the lower level.",
    ].join(" ");

    expect(buildEliteDescription({ description, isDescriptionGenerated: false })).toEqual({
      lead: "A contemporary villa on the lower cliffs of Camps Bay.",
      paragraphs: [
        "Concrete and timber shape the bold exterior and carry on inside, where the open-plan kitchen, living and dining areas are finished with refined furnishings. Signature art pieces and accents of marble, copper and glass complete the rooms.",
        "The upper level holds the main suite with a king-size bed and panoramic ocean views, and a second suite that opens onto a courtyard. The third bedroom is on the lower level.",
      ],
      moreParagraphs: [],
    });
  });

  it("does not break a sentence at a decimal, an abbreviation or a lower case word", () => {
    const description = "The beach is 3.5 km away, e.g. a short drive. It has a pool.";

    expect(buildEliteDescription({ description })).toEqual({
      lead: "The beach is 3.5 km away, e.g. a short drive.",
      paragraphs: ["It has a pool."],
      moreParagraphs: [],
    });
  });

  it("keeps a single short sentence as the lead only", () => {
    expect(buildEliteDescription({ description: "A quiet cabin." })).toEqual({
      lead: "A quiet cabin.",
      paragraphs: [],
      moreParagraphs: [],
    });
  });

  it("does not use a long first sentence as the lead", () => {
    const longSentence = `${"word ".repeat(ELITE_LEAD_MAX_LENGTH / 4).trim()}.`;

    expect(buildEliteDescription({ description: `${longSentence} Short.` })).toEqual({
      lead: "",
      paragraphs: [`${longSentence} Short.`],
      moreParagraphs: [],
    });
  });

  it("puts the paragraphs after the second one behind Read more", () => {
    const sentence = `Sentence ${"x".repeat(270)}.`;
    const description = ["Lead.", sentence, sentence, sentence, sentence].join(" ");

    expect(buildEliteDescription({ description })).toEqual({
      lead: "Lead.",
      paragraphs: [sentence, sentence],
      moreParagraphs: [sentence, sentence],
    });
  });

  it("keeps text without spaces or full stops as one paragraph", () => {
    const longWord = "y".repeat(3000);

    expect(buildEliteDescription({ description: longWord })).toEqual({
      lead: "",
      paragraphs: [longWord],
      moreParagraphs: [],
    });
  });
});

describe("the highlights and house rules on Elite site pages", () => {
  it("lists each amenity label once", () => {
    expect(
      listEliteHighlights([{ label: "Pool" }, { label: " pool " }, { label: "" }, { label: "Sea view" }, null])
    ).toEqual(["Pool", "Sea view"]);
    expect(listEliteHighlights(undefined)).toEqual([]);
  });

  it("lists every house rule with the rule it comes from", () => {
    expect(
      listEliteHouseRules({
        featured: ["No smoking"],
        all: ["No smoking", "No pets", "No parties or events", "Quiet Hours", "no pets"],
      })
    ).toEqual([
      { label: "No smoking", rule: "SmokingAllowed" },
      { label: "No pets", rule: "PetsAllowed" },
      { label: "No parties or events", rule: "Parties/EventsAllowed" },
      { label: "Quiet Hours", rule: "" },
    ]);
  });

  it("falls back to the featured rules and to none", () => {
    expect(listEliteHouseRules({ featured: ["No pets"] })).toEqual([{ label: "No pets", rule: "PetsAllowed" }]);
    expect(listEliteHouseRules({})).toEqual([]);
    expect(listEliteHouseRules(null)).toEqual([]);
  });
});

describe("the photos on Elite site pages", () => {
  it("uses a header photo only when the listing has one", () => {
    expect(hasEliteHeaderPhoto({ heroImage: "https://images/one.webp" })).toBe(true);
    expect(hasEliteHeaderPhoto({ heroImage: placeholderImage })).toBe(false);
    expect(hasEliteHeaderPhoto({ heroImage: " " })).toBe(false);
    expect(hasEliteHeaderPhoto(undefined)).toBe(false);
  });

  it("picks two photos for the accommodation page that are not the header photo", () => {
    expect(
      selectEliteAccommodationPhotos({
        heroImage: "a",
        residenceImage: "b",
        galleryImages: ["a", "b", "c", "d"],
      })
    ).toEqual([{ kind: "residence" }, { kind: "gallery", index: 2, sectionId: "gallery" }]);
  });

  it("picks fewer photos when the listing has few", () => {
    expect(selectEliteAccommodationPhotos({ heroImage: "a", residenceImage: "b", galleryImages: ["a", "b"] })).toEqual([
      { kind: "residence" },
    ]);
    expect(selectEliteAccommodationPhotos({ heroImage: "a", residenceImage: "a", galleryImages: ["a"] })).toEqual([]);
    expect(
      selectEliteAccommodationPhotos({ heroImage: "a", residenceImage: "a", galleryImages: ["a", "b"] })
    ).toEqual([{ kind: "gallery", index: 1, sectionId: "gallery" }]);
    expect(
      selectEliteAccommodationPhotos({
        heroImage: placeholderImage,
        residenceImage: placeholderImage,
        galleryImages: [],
      })
    ).toEqual([]);
    expect(selectEliteAccommodationPhotos(undefined)).toEqual([]);
  });

  it("drops every gallery slot that would show the placeholder", () => {
    const heroFallback = { key: "hero", slot: { kind: "hero", sectionId: "gallery" } };
    const galleryPhoto = { key: "g0", slot: { kind: "gallery", index: 0, sectionId: "gallery" } };
    const secondPhoto = { key: "g1", slot: { kind: "gallery", index: 1, sectionId: "gallery" } };

    expect(selectEliteGallerySlots([heroFallback], { heroImage: placeholderImage })).toEqual([]);
    expect(selectEliteGallerySlots([heroFallback], { heroImage: "a" })).toEqual([heroFallback]);
    expect(selectEliteGallerySlots([galleryPhoto], { galleryImages: ["a"] })).toEqual([galleryPhoto]);
    expect(selectEliteGallerySlots([galleryPhoto], { galleryImages: [placeholderImage] })).toEqual([]);
    expect(selectEliteGallerySlots([galleryPhoto, secondPhoto], { galleryImages: ["a"] })).toEqual([galleryPhoto]);
    expect(selectEliteGallerySlots(undefined, {})).toEqual([]);
  });

  it("knows whether the listing has a gallery photo", () => {
    expect(hasEliteGalleryPhotos({ galleryImages: ["a"] })).toBe(true);
    expect(hasEliteGalleryPhotos({ galleryImages: [placeholderImage, ""] })).toBe(false);
    expect(hasEliteGalleryPhotos(undefined)).toBe(false);
  });

  it.each([
    [0, ""],
    [1, "single"],
    [2, "pair"],
    [3, "trio"],
    [4, "mosaic"],
    [6, "mosaic"],
    [-1, ""],
    [Number.NaN, ""],
  ])("lays out %p photos as %p", (count, layout) => {
    expect(resolveEliteGalleryLayout(count)).toBe(layout);
  });
});

describe("the gallery intro and the location on Elite site pages", () => {
  it("leaves out the template's own gallery line", () => {
    const templateGalleryIntro = buildWebsiteTemplateModel({ propertyDetails: {} }).gallerySection.description;

    expect(templateGalleryIntro).toBe(TEMPLATE_GALLERY_INTRO);
    expect(resolveEliteGalleryIntro({ description: templateGalleryIntro })).toBe("");
    expect(resolveEliteGalleryIntro({ description: "  The pool deck at midday. " })).toBe("The pool deck at midday.");
    expect(resolveEliteGalleryIntro(undefined)).toBe("");
  });

  it("reads the location from the site and then the listing", () => {
    expect(resolveEliteLocation({ site: { locationLabel: "Cape Town, South Africa" } })).toBe(
      "Cape Town, South Africa"
    );
    expect(resolveEliteLocation({ site: {}, location: { label: "Geneva" } })).toBe("Geneva");
    expect(resolveEliteLocation({})).toBe("");
  });
});

describe("which Elite pages get the new style", () => {
  it("restyles every page a host can switch on, so no page is left without a header", () => {
    const configurablePageKeys = SITE_PAGE_DEFINITIONS.map((page) => page.key).filter(
      (pageKey) => pageKey !== MAIN_SITE_PAGE_KEY
    );

    expect(configurablePageKeys.filter((pageKey) => !isEliteRestyledPage(pageKey))).toEqual([]);
  });

  it.each([
    ["accommodation", true],
    ["gallery", true],
    ["contact", true],
    ["main", false],
    ["contact-us", false],
    ["", false],
    [undefined, false],
    ["constructor", false],
  ])("restyles %p: %p", (pageKey, expected) => {
    expect(isEliteRestyledPage(pageKey)).toBe(expected);
  });

  it("uses a photo header only with a real photo and never on the gallery page", () => {
    expect(resolveEliteHeaderTone({ heroImage: "https://images/one.webp" }, "accommodation")).toBe("photo");
    expect(resolveEliteHeaderTone({ heroImage: "https://images/one.webp" }, "contact")).toBe("photo");
    expect(resolveEliteHeaderTone({ heroImage: "https://images/one.webp" }, "gallery")).toBe("light");
    expect(resolveEliteHeaderTone({ heroImage: placeholderImage }, "contact")).toBe("light");
    expect(resolveEliteHeaderTone(undefined)).toBe("light");
  });

  it("labels the availability button with the host's call to action", () => {
    expect(resolveEliteAvailabilityLabel({ callToAction: { label: "  Book now " } })).toBe("Book now");
    expect(resolveEliteAvailabilityLabel({ callToAction: { label: " " } })).toBe("Check availability");
    expect(resolveEliteAvailabilityLabel(undefined)).toBe("Check availability");
  });
});
