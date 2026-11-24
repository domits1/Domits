import countryList from "react-select-country-list";

// Design note D4. Names come from the same list host onboarding uses (react-select-country-list), so the backend
// reads exactly what the frontend writes; Intl only supplies the timezones of a country.

export const TIMEZONE_PROBLEM = Object.freeze({
  UNKNOWN_COUNTRY: "UNKNOWN_COUNTRY",
  CHOICE_NEEDED: "CHOICE_NEEDED",
  INVALID_CHOICE: "INVALID_CHOICE",
});

const COUNTRIES = countryList();

const toCountryCode = (country) => {
  if (typeof country !== "string" || !country.trim()) return null;
  const value = country.trim();
  if (/^[a-z]{2}$/i.test(value) && COUNTRIES.getLabel(value.toUpperCase())) return value.toUpperCase();
  return COUNTRIES.getValue(value) ?? null;
};

// Lambda runs Node 22, which has the older `timeZones` getter; newer Node has getTimeZones().
const timeZonesOf = (countryCode) => {
  const locale = new Intl.Locale(`und-${countryCode}`);
  return (typeof locale.getTimeZones === "function" ? locale.getTimeZones() : locale.timeZones) ?? [];
};

const offsetOn = (timeZone, date) =>
  new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName").value;

// Winter and summer offsets: zones that agree on both show the same clock time all year.
const clockTimeOf = (timeZone) => {
  const year = new Date().getUTCFullYear();
  return `${offsetOn(timeZone, new Date(Date.UTC(year, 0, 15)))}|${offsetOn(timeZone, new Date(Date.UTC(year, 6, 15)))}`;
};

const showSameClockTime = (timeZones) => new Set(timeZones.map(clockTimeOf)).size === 1;

export const resolveListingTimezone = ({ country, chosenTimezone } = {}) => {
  const countryCode = toCountryCode(country);
  const options = countryCode ? timeZonesOf(countryCode) : [];
  // Guessing a timezone would shift every date the OTAs show, so an unknown country stops here.
  if (!options.length) return { ok: false, problem: TIMEZONE_PROBLEM.UNKNOWN_COUNTRY };

  if (chosenTimezone) {
    if (!options.includes(chosenTimezone)) return { ok: false, problem: TIMEZONE_PROBLEM.INVALID_CHOICE, options };
    return { ok: true, countryCode, timezone: chosenTimezone };
  }

  // Any of the zones is right when they all show the same time (Germany: Berlin, Büsingen).
  if (showSameClockTime(options)) return { ok: true, countryCode, timezone: options[0] };
  return { ok: false, problem: TIMEZONE_PROBLEM.CHOICE_NEEDED, countryCode, options };
};
