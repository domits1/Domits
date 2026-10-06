import { describe, expect, it } from "@jest/globals";
import {
  DESTINATION_UNRESOLVED_CITY,
  DESTINATION_UNRESOLVED_COUNTRY,
  resolveDestinationChain,
} from "../../functions/PropertyHandler/business/service/destinationResolver.js";
import { findCountryByName, listCountries } from "../../functions/PropertyHandler/util/destination/countries.js";

describe("the destination chain of a property location", () => {
  it("resolves continent, country and city with english slugs and clean paths", () => {
    expect(resolveDestinationChain({ country: "Spain", city: "Marbella" })).toEqual({
      continent: { type: "continent", slug: "europe", name: "Europe", path: "/destinations/europe" },
      country: { type: "country", slug: "spain", name: "Spain", code: "ES", path: "/destinations/europe/spain" },
      city: { type: "city", slug: "marbella", name: "Marbella", path: "/destinations/europe/spain/marbella" },
      unresolved: null,
    });
  });

  it("accepts the country however it was cased or title-cased by the onboarding model", () => {
    const codes = [
      "turks and caicos islands",
      "Turks And Caicos Islands",
      "Tanzania, United Republic Of",
      "CURAÇAO",
    ].map((country) => resolveDestinationChain({ country, city: "x" }).country.code);
    expect(codes).toEqual(["TC", "TC", "TZ", "CW"]);
    expect(resolveDestinationChain({ country: "CURAÇAO", city: "Willemstad" }).continent.slug).toBe("caribbean");
  });

  it("keeps the city display name as typed, with the spaces tidied, and folds it into the slug", () => {
    const chain = resolveDestinationChain({ country: "Germany", city: "  Groß Toitin,  Western Pomerania " });
    expect(chain.city.name).toBe("Groß Toitin, Western Pomerania");
    expect(chain.city.path).toBe("/destinations/europe/germany/gross-toitin-western-pomerania");
  });

  it("refuses a country that is not in the list and a city that folds to nothing", () => {
    expect(resolveDestinationChain({ country: "Narnia", city: "Cair Paravel" })).toEqual({
      continent: null,
      country: null,
      city: null,
      unresolved: DESTINATION_UNRESOLVED_COUNTRY,
    });
    const noCity = resolveDestinationChain({ country: "Spain", city: " - " });
    expect(noCity.country.code).toBe("ES");
    expect(noCity.city).toBeNull();
    expect(noCity.unresolved).toBe(DESTINATION_UNRESOLVED_CITY);
  });

  it("holds 249 countries, each code once, each with one of the eight continents, and finds each by its own name", () => {
    const countries = listCountries();
    const continents = new Set(countries.map(({ continent }) => continent));
    expect(countries).toHaveLength(249);
    expect([...continents].sort()).toEqual([
      "africa",
      "antarctica",
      "asia",
      "caribbean",
      "europe",
      "north-america",
      "oceania",
      "south-america",
    ]);
    for (const country of countries) {
      expect(continents.has(country.continent)).toBe(true);
      expect(findCountryByName(country.name)).toEqual(country);
    }
    expect(new Set(countries.map(({ code }) => code)).size).toBe(249);
  });
});
