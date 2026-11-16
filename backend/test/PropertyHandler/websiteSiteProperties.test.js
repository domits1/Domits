import { describe, expect, it } from "@jest/globals";
import {
  MAX_SITE_PROPERTIES,
  listOtherSitePropertyIds,
  normalizeSiteProperties,
  withNormalizedSiteProperties,
} from "../../functions/PropertyHandler/business/service/websiteSiteProperties.js";

const MAIN = "property-main";
const entry = (propertyId, slug) => ({ propertyId, slug });

describe("the property list of a website", () => {
  it("keeps the order and cleans ids and slugs", () => {
    expect(
      normalizeSiteProperties([entry(` ${MAIN} `, " Villa-Main "), entry("property-2", "beach-house")], MAIN)
    ).toEqual([entry(MAIN, "villa-main"), entry("property-2", "beach-house")]);
  });

  it("accepts an empty list, which keeps the website at one property", () => {
    expect(normalizeSiteProperties([], MAIN)).toEqual([]);
  });

  it.each([
    ["not an array", { 0: entry(MAIN, "main") }, "must be an array"],
    ["an entry that is not an object", [entry(MAIN, "main"), "property-2"], "entry 1 must be a plain object"],
    ["an entry without a property id", [entry(MAIN, "main"), entry(" ", "two")], "entry 1 needs a propertyId"],
    ["a slug with a space", [entry(MAIN, "villa main")], "entry 0 needs a slug"],
    ["a slug with a slash", [entry(MAIN, "villa/main")], "entry 0 needs a slug"],
    ["a slug with two hyphens in a row", [entry(MAIN, "villa--main")], "entry 0 needs a slug"],
    ["an empty slug", [entry(MAIN, "")], "entry 0 needs a slug"],
    ["a slug that is too long", [entry(MAIN, "a".repeat(61))], "entry 0 needs a slug"],
    ["a property listed twice", [entry(MAIN, "main"), entry(MAIN, "other")], "must not list a property or a slug twice"],
    ["a slug used twice", [entry(MAIN, "main"), entry("property-2", "main")], "must not list a property or a slug twice"],
    ["a list without the main property", [entry("property-2", "two")], "must list the main property"],
  ])("refuses %s", (_label, value, message) => {
    expect(() => normalizeSiteProperties(value, MAIN)).toThrow(new RegExp(`^siteProperties ${message}`));
  });

  it(`refuses more than ${MAX_SITE_PROPERTIES} properties, the main one included`, () => {
    const full = Array.from({ length: MAX_SITE_PROPERTIES }, (_, index) =>
      entry(index === 0 ? MAIN : `property-${index}`, `p${index}`)
    );

    expect(normalizeSiteProperties(full, MAIN)).toHaveLength(MAX_SITE_PROPERTIES);
    expect(() => normalizeSiteProperties([...full, entry("property-extra", "extra")], MAIN)).toThrow(
      /^siteProperties can hold at most 12 properties/
    );
  });

  it("accepts a slug of exactly the maximum length", () => {
    expect(normalizeSiteProperties([entry(MAIN, "a".repeat(60))], MAIN)).toEqual([entry(MAIN, "a".repeat(60))]);
  });
});

describe("overrides that may carry a property list", () => {
  it("returns overrides without a list as they are", () => {
    const overrides = { heroTitle: "Villa" };

    expect(withNormalizedSiteProperties(overrides, MAIN)).toBe(overrides);
    expect(withNormalizedSiteProperties(undefined, MAIN)).toBeUndefined();
    expect(listOtherSitePropertyIds(overrides, MAIN)).toEqual([]);
    expect(listOtherSitePropertyIds(null, MAIN)).toEqual([]);
  });

  it("cleans the list and keeps every other override", () => {
    const overrides = { heroTitle: "Villa", siteProperties: [entry(MAIN, " MAIN ")] };

    expect(withNormalizedSiteProperties(overrides, MAIN)).toEqual({
      heroTitle: "Villa",
      siteProperties: [entry(MAIN, "main")],
    });
    expect(overrides.siteProperties[0].slug).toBe(" MAIN ");
  });

  it("lists every property except the main one", () => {
    const overrides = { siteProperties: [entry("property-2", "two"), entry(MAIN, "main"), entry("property-3", "three")] };

    expect(listOtherSitePropertyIds(overrides, MAIN)).toEqual(["property-2", "property-3"]);
  });

  it("refuses an invalid list instead of skipping it", () => {
    expect(() => listOtherSitePropertyIds({ siteProperties: "property-2" }, MAIN)).toThrow(TypeError);
    expect(() => withNormalizedSiteProperties({ siteProperties: [entry("property-2", "two")] }, MAIN)).toThrow(
      /must list the main property/
    );
  });
});
