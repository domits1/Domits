import { describe, expect, it } from "@jest/globals";
import {
  buildDestinationPath,
  isDestinationSlug,
  normalizeDestinationName,
  toDestinationSlug,
} from "../../functions/PropertyHandler/util/destination/destinationSlug.js";

describe("destination slugs", () => {
  it.each([
    ["Marbella", "marbella"],
    ["MARBELLA", "marbella"],
    ["Málaga", "malaga"],
    ["Saint Jean Cap Ferrat", "saint-jean-cap-ferrat"],
    ["  Rio   de Janeiro ", "rio-de-janeiro"],
    ["Groß Toitin, Western Pomerania", "gross-toitin-western-pomerania"],
    ["Bali - Seminyak", "bali-seminyak"],
    ["Governor's Harbour", "governor-s-harbour"],
    ["Curaçao", "curacao"],
    ["Saint Barthélemy", "saint-barthelemy"],
    ["Åland Islands", "aland-islands"],
    ["Côte d'Ivoire", "cote-d-ivoire"],
    ["Łódź", "lodz"],
    ["Ærøskøbing", "aeroskobing"],
  ])("turns %s into %s", (input, expected) => {
    expect(toDestinationSlug(input)).toBe(expected);
  });

  it("gives the same slug to spellings that differ only in case, accents or spacing", () => {
    const spellings = ["MARBELLA", "marbella", "Marbella ", " Marbélla"];
    expect(new Set(spellings.map(toDestinationSlug))).toEqual(new Set(["marbella"]));
  });

  it("answers an empty slug for nothing, punctuation only, or non latin letters that fold to nothing", () => {
    expect(toDestinationSlug("")).toBe("");
    expect(toDestinationSlug(null)).toBe("");
    expect(toDestinationSlug(" - ")).toBe("");
    expect(toDestinationSlug("東京")).toBe("");
  });

  it("recognises only clean slugs", () => {
    expect(isDestinationSlug("saint-jean-cap-ferrat")).toBe(true);
    expect(isDestinationSlug("Marbella")).toBe(false);
    expect(isDestinationSlug("marbella/")).toBe(false);
    expect(isDestinationSlug("-marbella")).toBe(false);
    expect(isDestinationSlug("")).toBe(false);
  });

  it("builds the path from the slugs that exist and keeps the display name tidy", () => {
    expect(buildDestinationPath("europe", "spain", "marbella")).toBe("/destinations/europe/spain/marbella");
    expect(buildDestinationPath("europe", "", undefined)).toBe("/destinations/europe");
    expect(normalizeDestinationName("  Rio   de Janeiro ")).toBe("Rio de Janeiro");
  });
});
