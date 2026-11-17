import { normalizeSiteProperties } from "../../../../../../../backend/functions/PropertyHandler/business/service/websiteSiteProperties";
import {
  applySitePropertiesEdit,
  describeSitePropertySlugProblem,
  findSitePropertiesProblem,
  suggestSitePropertySlug,
} from "../editor/websiteEditorSiteProperties";

const MAIN = { propertyId: "main", slug: "villa-main" };
const SEA = { propertyId: "sea", slug: "sea-view" };
const LONG_TITLE = `Villa ${"Bellavista ".repeat(12)}`;

const serverAccepts = (slug) => {
  try {
    normalizeSiteProperties([{ propertyId: "main", slug }], "main");
    return true;
  } catch {
    return false;
  }
};

const entry = (propertyId, changes = {}) => ({
  propertyId,
  slug: propertyId,
  title: propertyId,
  isMainProperty: propertyId === "main",
  isListed: true,
  isActive: true,
  slugProblem: "",
  ...changes,
});

describe("the address of a property", () => {
  it.each([
    ...["villa-rosa", "x".repeat(60), "x".repeat(61), "Villa-Rosa", " villa ", "", "villa--rosa", "-villa", "villa-"],
    ...["villa rosa", "villa/rosa", "villa_rosa", "villé", "..", "__proto__"],
  ])("is judged as the server judges %j", (slug) => {
    expect(describeSitePropertySlugProblem(slug, []) === "").toBe(serverAccepts(slug));
  });

  it.each(["🏖️🌴", "!!! *** ???", LONG_TITLE, "Château Ærø Ünïque", "İstanbul loft", "東京の家"])(
    "is suggested in a form the server accepts, also when taken, for %j",
    (title) => {
      const slug = suggestSitePropertySlug(title);

      expect(serverAccepts(slug)).toBe(true);
      expect(serverAccepts(suggestSitePropertySlug(title, [slug]))).toBe(true);
    }
  );

  it("is suggested from the words of the title, numbered when taken", () => {
    expect(suggestSitePropertySlug("  Château  -- Rosa ")).toBe("chateau-rosa");
    expect(suggestSitePropertySlug("🏖️🌴", ["property"])).toBe("property-2");
    expect(suggestSitePropertySlug("Villa Rosa", ["villa-rosa", "villa-rosa-2"])).toBe("villa-rosa-3");
    expect(suggestSitePropertySlug(LONG_TITLE, [suggestSitePropertySlug(LONG_TITLE)])).toMatch(/^.{1,58}-2$/);
  });
});

describe("an edited list in the content overrides", () => {
  it("takes the published list as it is stored when the edit is back to it", () => {
    const published = { siteProperties: [MAIN, SEA] };
    const working = { siteProperties: [MAIN], heroTitle: "Villa" };

    expect(applySitePropertiesEdit(working, [MAIN, { ...SEA, slug: " Sea-View" }], published).siteProperties).toBe(
      published.siteProperties
    );
  });
});

describe("what holds a save or a publish back", () => {
  it("is nothing for one property, or for a main property that is not live", () => {
    expect(findSitePropertiesProblem([entry("main", { slugProblem: "Bad." })], { forPublish: true })).toBe("");
    expect(findSitePropertiesProblem([entry("main", { isActive: false }), entry("sea")], { forPublish: true })).toBe(
      ""
    );
  });
});
