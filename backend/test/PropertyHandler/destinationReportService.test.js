import { describe, expect, it } from "@jest/globals";
import {
  buildDestinationReport,
  renderDestinationReportMarkdown,
} from "../../functions/PropertyHandler/business/service/destinationReportService.js";
import { readDestinationSettings } from "../../functions/PropertyHandler/util/destination/destinationSettings.js";

const ROWS = [
  { country: "Spain", city: "Marbella", active_count: 2 },
  { country: "Spain", city: "MARBELLA", active_count: 1 },
  { country: "Spain", city: "Málaga", active_count: 1 },
  { country: "Kenya", city: "kenya", active_count: 1 },
  { country: "Indonesia", city: "Bali - Seminyak", active_count: 1 },
  { country: "Indonesia", city: "Bali", active_count: 1 },
  { country: "Narnia", city: "Cair Paravel", active_count: 1 },
  { country: "Portugal", city: " ", active_count: 1 },
  { country: "", city: "", has_location: false, active_count: 1 },
];

describe("the destination report", () => {
  it("merges only spellings that fold to the same slug, and shows every raw variant with its count", () => {
    const report = buildDestinationReport(ROWS, readDestinationSettings({}));
    const spain = report.countries.find((country) => country.code === "ES");

    expect(spain.activeListings).toBe(4);
    expect(spain.cities.map((city) => city.slug)).toEqual(["marbella", "malaga"]);
    expect(spain.cities[0].variants).toEqual([
      { raw: "Marbella", count: 2 },
      { raw: "MARBELLA", count: 1 },
    ]);
    expect(spain.cities[0].flags).toEqual(["several_spellings"]);
    expect(spain.cities[0].displayName).toBe("Marbella");
    expect(spain.cities[1].variants).toEqual([{ raw: "Málaga", count: 1 }]);
  });

  it("flags a city that is really the country, a composite, and a lower case only spelling, without merging them", () => {
    const report = buildDestinationReport(ROWS, readDestinationSettings({}));
    const kenya = report.countries.find((country) => country.code === "KE");
    const indonesia = report.countries.find((country) => country.code === "ID");

    expect(kenya.cities[0].flags).toEqual(["lower_case_only", "same_as_country"]);
    expect(indonesia.cities.map((city) => city.slug)).toEqual(["bali", "bali-seminyak"]);
    expect(indonesia.cities.find((city) => city.slug === "bali-seminyak").flags).toEqual(["composite"]);
    expect(indonesia.cities.find((city) => city.slug === "bali").flags).toEqual([]);
  });

  it("lists rows it cannot resolve instead of guessing, and counts their listings in the total", () => {
    const report = buildDestinationReport(ROWS, readDestinationSettings({}));

    expect(report.unresolved).toEqual([
      { country: "Narnia", city: "Cair Paravel", activeListings: 1, reason: "unknown_country" },
      { country: "Portugal", city: " ", activeListings: 1, reason: "empty_city" },
      { country: "", city: "", activeListings: 1, reason: "no_location" },
    ]);
    const portugal = report.countries.find((country) => country.code === "PT");
    expect(portugal.cities).toEqual([]);
    expect(portugal.directListings).toBe(1);
    expect(report.summary).toEqual({
      activeListings: 10,
      countries: 4,
      eligibleCountries: 4,
      cities: 5,
      eligibleCities: 5,
      flaggedCities: 3,
      unresolved: 3,
    });
  });

  it("applies the thresholds: a higher minimum drops single listing cities, and a country can still exist through a child", () => {
    const report = buildDestinationReport(ROWS, readDestinationSettings({ DESTINATION_MIN_ACTIVE_LISTINGS: "2" }));
    const spain = report.countries.find((country) => country.code === "ES");
    const kenya = report.countries.find((country) => country.code === "KE");
    const portugal = report.countries.find((country) => country.code === "PT");

    expect(spain.cities.map((city) => [city.slug, city.eligible])).toEqual([
      ["marbella", true],
      ["malaga", false],
    ]);
    expect(spain.eligible).toBe(true);
    expect(kenya.eligible).toBe(false);
    expect(portugal.eligible).toBe(false);
    expect(report.summary.eligibleCities).toBe(1);
    expect(report.summary.eligibleCountries).toBe(2);
  });

  it("does not let a country exist through its children when that setting is off", () => {
    const report = buildDestinationReport(
      [{ country: "Spain", city: "Marbella", active_count: 1 }],
      readDestinationSettings({ DESTINATION_MIN_ACTIVE_LISTINGS: "2", DESTINATION_PARENT_FROM_ANY_CHILD: "false" })
    );
    expect(report.countries[0].eligible).toBe(false);
  });

  it("renders a readable table with one line per city and the unresolved rows at the end", () => {
    const markdown = renderDestinationReportMarkdown(buildDestinationReport(ROWS, readDestinationSettings({})));

    expect(markdown).toContain(
      "| Spain | /destinations/europe/spain/marbella | 3 | Marbella | Marbella (2), MARBELLA (1) | several_spellings |"
    );
    expect(markdown).toContain("- Narnia / Cair Paravel (1): unknown_country");
    expect(markdown).toContain("-  /  (1): no_location");
    expect(markdown.split("\n")[0]).toContain("cities 5 (5 with a page, 3 flagged), unresolved rows 3");
  });

  it("merges the same raw spelling across country spellings, keeps a pipe out of the table, and ignores a count that is not finite", () => {
    const report = buildDestinationReport([
      { country: "Spain", city: "Marbella", active_count: 2 },
      { country: "SPAIN", city: "Marbella", active_count: 1 },
      { country: "Spain", city: "Puerto | Banús", active_count: "Infinity" },
    ]);
    const spain = report.countries.find((country) => country.code === "ES");

    expect(spain.cities.find((city) => city.slug === "marbella").variants).toEqual([{ raw: "Marbella", count: 3 }]);
    expect(spain.cities.find((city) => city.slug === "marbella").flags).toEqual([]);
    expect(spain.cities.find((city) => city.slug === "puerto-banus").activeListings).toBe(0);
    expect(report.summary.activeListings).toBe(3);
    expect(renderDestinationReportMarkdown(report)).toContain("Puerto \\| Banús");
  });

  it("survives empty and malformed input", () => {
    expect(buildDestinationReport(null).summary.activeListings).toBe(0);
    expect(
      buildDestinationReport([{ country: "Spain", city: "Marbella", active_count: "two" }]).summary.activeListings
    ).toBe(0);
  });
});
