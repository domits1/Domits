import { continentName, findCountryByName } from "../../util/destination/countries.js";
import {
  buildDestinationPath,
  normalizeDestinationName,
  toDestinationSlug,
} from "../../util/destination/destinationSlug.js";

export const DESTINATION_UNRESOLVED_COUNTRY = "unknown_country";
export const DESTINATION_UNRESOLVED_CITY = "empty_city";

export const resolveDestinationChain = ({ country, city } = {}) => {
  const countryEntry = findCountryByName(country);
  if (!countryEntry) {
    return { continent: null, country: null, city: null, unresolved: DESTINATION_UNRESOLVED_COUNTRY };
  }

  const continentSlug = countryEntry.continent;
  const countrySlug = toDestinationSlug(countryEntry.name);
  const continent = {
    type: "continent",
    slug: continentSlug,
    name: continentName(continentSlug),
    path: buildDestinationPath(continentSlug),
  };
  const resolvedCountry = {
    type: "country",
    slug: countrySlug,
    name: countryEntry.name,
    code: countryEntry.code,
    path: buildDestinationPath(continentSlug, countrySlug),
  };

  const cityName = normalizeDestinationName(city);
  const citySlug = toDestinationSlug(cityName);
  if (!citySlug) {
    return { continent, country: resolvedCountry, city: null, unresolved: DESTINATION_UNRESOLVED_CITY };
  }

  return {
    continent,
    country: resolvedCountry,
    city: {
      type: "city",
      slug: citySlug,
      name: cityName,
      path: buildDestinationPath(continentSlug, countrySlug, citySlug),
    },
    unresolved: null,
  };
};
