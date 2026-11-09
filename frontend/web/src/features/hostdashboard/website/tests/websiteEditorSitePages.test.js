import { applySitePagesEdit, omitSitePages } from "../editor/websiteEditorSitePages";
import { normalizeSitePages } from "../rendering/websitePages";

const STORED_IN_OTHER_ORDER = {
  contact: { navLabel: "Contact us", enabled: false },
  gallery: { navLabel: "Photos", enabled: true },
};

const withGalleryOn = (navLabel = "Gallery") => ({
  ...normalizeSitePages({}),
  gallery: { enabled: true, navLabel },
});

describe("applySitePagesEdit", () => {
  it("returns the overrides untouched when nothing was edited", () => {
    const overrides = { heroTitle: "Villa", sitePages: STORED_IN_OTHER_ORDER };

    expect(applySitePagesEdit(overrides, null, {})).toBe(overrides);
  });

  it("keeps the stored text when the edit means the same pages in another field order", () => {
    const overrides = { heroTitle: "Villa", sitePages: STORED_IN_OTHER_ORDER };
    const edit = normalizeSitePages(STORED_IN_OTHER_ORDER);

    const result = applySitePagesEdit(overrides, edit, {});

    expect(result).toBe(overrides);
    expect(JSON.stringify(result)).toBe(JSON.stringify(overrides));
  });

  it("writes the normalized pages at the place of the stored ones", () => {
    const overrides = { sitePages: STORED_IN_OTHER_ORDER, heroTitle: "Villa" };
    const edit = {
      ...normalizeSitePages(STORED_IN_OTHER_ORDER),
      accommodation: { enabled: true, navLabel: "  The   villa " },
      contact: { enabled: true, navLabel: "<b>Contact</b>" },
    };

    const result = applySitePagesEdit(overrides, edit, {});

    expect(Object.keys(result)).toEqual(["sitePages", "heroTitle"]);
    expect(result.sitePages).toEqual({
      gallery: { enabled: true, navLabel: "Photos" },
      accommodation: { enabled: true, navLabel: "The villa" },
      contact: { enabled: true, navLabel: "Contact us" },
    });
    expect(overrides.sitePages).toBe(STORED_IN_OTHER_ORDER);
  });

  it("adds the pages after the other overrides when none were stored", () => {
    const overrides = { heroTitle: "Villa" };

    const result = applySitePagesEdit(overrides, withGalleryOn(), {});

    expect(JSON.stringify(result)).toBe(
      JSON.stringify({
        heroTitle: "Villa",
        sitePages: {
          gallery: { enabled: true, navLabel: "Gallery" },
          accommodation: { enabled: false, navLabel: "Accommodation" },
          contact: { enabled: false, navLabel: "Contact us" },
        },
      })
    );
  });

  it("takes the published text back when the edit returns to the published pages", () => {
    const published = { sitePages: STORED_IN_OTHER_ORDER };
    const overrides = { sitePages: withGalleryOn("Gallery") };

    const result = applySitePagesEdit(overrides, normalizeSitePages(STORED_IN_OTHER_ORDER), published);

    expect(result.sitePages).toBe(STORED_IN_OTHER_ORDER);
  });

  it("drops the pages again when the edit returns to a published site without pages", () => {
    const overrides = { heroTitle: "Villa", sitePages: withGalleryOn() };

    const result = applySitePagesEdit(overrides, normalizeSitePages({}), { heroTitle: "Villa" });

    expect(JSON.stringify(result)).toBe(JSON.stringify({ heroTitle: "Villa" }));
  });

  it("keeps labels that differ from the defaults when every page is switched off", () => {
    const overrides = { sitePages: withGalleryOn("Photos") };
    const edit = { ...normalizeSitePages({}), gallery: { enabled: false, navLabel: "Photos" } };

    const result = applySitePagesEdit(overrides, edit, {});

    expect(result.sitePages.gallery).toEqual({ enabled: false, navLabel: "Photos" });
  });
});

describe("omitSitePages", () => {
  it("returns the same overrides when there are no pages", () => {
    const overrides = { heroTitle: "Villa" };

    expect(omitSitePages(overrides)).toBe(overrides);
  });

  it("leaves the pages out of a copy and keeps the stored overrides", () => {
    const overrides = { heroTitle: "Villa", sitePages: STORED_IN_OTHER_ORDER };

    expect(omitSitePages(overrides)).toEqual({ heroTitle: "Villa" });
    expect(overrides.sitePages).toBe(STORED_IN_OTHER_ORDER);
  });
});
