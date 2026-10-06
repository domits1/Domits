import { resolveDestinationChain } from "./destinationResolver.js";
import { toDestinationSlug } from "../../util/destination/destinationSlug.js";
import { isDestinationEligible, readDestinationSettings } from "../../util/destination/destinationSettings.js";

const COMPOSITE_PATTERN = /[,/]|\s-\s/;
const SHORT_CITY_LENGTH = 3;

const toCount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
};

const escapeMarkdownCell = (value) =>
  String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\s+/g, " ")
    .trim();

const sortByCountDesc = (left, right) =>
  right.activeListings - left.activeListings || left.slug.localeCompare(right.slug);

const flagCity = (city, countrySlug) => {
  const flags = [];
  if (city.variants.length > 1) {
    flags.push("several_spellings");
  }
  if (city.variants.every(({ raw }) => raw === raw.toLowerCase())) {
    flags.push("lower_case_only");
  }
  if (city.slug === countrySlug) {
    flags.push("same_as_country");
  }
  if (city.variants.some(({ raw }) => COMPOSITE_PATTERN.test(raw))) {
    flags.push("composite");
  }
  if (city.slug.replace(/-/g, "").length < SHORT_CITY_LENGTH) {
    flags.push("short");
  }
  return flags;
};

export const buildDestinationReport = (rows, settings = readDestinationSettings()) => {
  const countries = new Map();
  const unresolved = [];
  let totalActiveListings = 0;

  for (const row of Array.isArray(rows) ? rows : []) {
    const activeListings = toCount(row.active_count ?? row.activeListings);
    totalActiveListings += activeListings;
    if (row.has_location === false) {
      unresolved.push({ country: "", city: "", activeListings, reason: "no_location" });
      continue;
    }
    const chain = resolveDestinationChain({ country: row.country, city: row.city });
    if (!chain.country) {
      unresolved.push({
        country: String(row.country || ""),
        city: String(row.city || ""),
        activeListings,
        reason: chain.unresolved,
      });
      continue;
    }

    const countryKey = chain.country.code;
    const country = countries.get(countryKey) || {
      code: chain.country.code,
      name: chain.country.name,
      slug: chain.country.slug,
      path: chain.country.path,
      continent: chain.continent.slug,
      activeListings: 0,
      directListings: 0,
      cities: new Map(),
    };
    country.activeListings += activeListings;
    countries.set(countryKey, country);

    if (!chain.city) {
      country.directListings += activeListings;
      unresolved.push({
        country: chain.country.name,
        city: String(row.city || ""),
        activeListings,
        reason: chain.unresolved,
      });
      continue;
    }

    const city = country.cities.get(chain.city.slug) || {
      slug: chain.city.slug,
      path: chain.city.path,
      displayName: chain.city.name,
      activeListings: 0,
      variants: [],
    };
    city.activeListings += activeListings;
    const variant = city.variants.find((candidate) => candidate.raw === String(row.city));
    if (variant) {
      variant.count += activeListings;
    } else {
      city.variants.push({ raw: String(row.city), count: activeListings });
    }
    country.cities.set(chain.city.slug, city);
  }

  const reportCountries = [...countries.values()]
    .map((country) => {
      const cities = [...country.cities.values()]
        .map((city) => ({
          ...city,
          variants: [...city.variants].sort(
            (left, right) => right.count - left.count || left.raw.localeCompare(right.raw)
          ),
          eligible: isDestinationEligible({ activeListings: city.activeListings }, settings),
          flags: flagCity(city, country.slug),
        }))
        .sort(sortByCountDesc);
      const eligibleChildren = cities.filter((city) => city.eligible).length;
      return {
        ...country,
        cities,
        eligible: isDestinationEligible(
          { activeListings: country.activeListings, directListings: country.directListings, eligibleChildren },
          settings
        ),
        eligibleCities: eligibleChildren,
        flaggedCities: cities.filter((city) => city.flags.length > 0).length,
      };
    })
    .sort(sortByCountDesc);

  return {
    settings,
    summary: {
      activeListings: totalActiveListings,
      countries: reportCountries.length,
      eligibleCountries: reportCountries.filter((country) => country.eligible).length,
      cities: reportCountries.reduce((sum, country) => sum + country.cities.length, 0),
      eligibleCities: reportCountries.reduce((sum, country) => sum + country.eligibleCities, 0),
      flaggedCities: reportCountries.reduce((sum, country) => sum + country.flaggedCities, 0),
      unresolved: unresolved.length,
    },
    countries: reportCountries,
    unresolved,
  };
};

export const renderDestinationReportMarkdown = (report) => {
  const lines = [
    `Active listings ${report.summary.activeListings}, countries ${report.summary.countries} (${report.summary.eligibleCountries} with a page), cities ${report.summary.cities} (${report.summary.eligibleCities} with a page, ${report.summary.flaggedCities} flagged), unresolved rows ${report.summary.unresolved}.`,
    `Settings: minimum active listings ${report.settings.minActiveListings}, parent from any child ${report.settings.parentFromAnyChild}.`,
    "",
    "| Country | Path | Active | City | Variants | Flags |",
    "| --- | --- | ---: | --- | --- | --- |",
  ];
  for (const country of report.countries) {
    for (const city of country.cities) {
      const variants = city.variants.map(({ raw, count }) => `${raw} (${count})`).join(", ");
      lines.push(
        `| ${escapeMarkdownCell(country.name)} | ${city.path} | ${city.activeListings} | ${escapeMarkdownCell(city.displayName)} | ${escapeMarkdownCell(variants)} | ${city.flags.join(" ") || ""} |`
      );
    }
  }
  if (report.unresolved.length > 0) {
    lines.push(
      "",
      "Unresolved:",
      ...report.unresolved.map(
        (row) =>
          `- ${escapeMarkdownCell(row.country)} / ${escapeMarkdownCell(row.city)} (${row.activeListings}): ${row.reason}`
      )
    );
  }
  return lines.join("\n");
};

export { toDestinationSlug };
