import {
  TIMEZONE_PROBLEM,
  resolveListingTimezone,
} from "../../.shared/channelManagement/utils/listingTimezone.js";

// Design note D4 (#506): Channex needs a country code and a timezone per property; Domits stores
// only the country name. The host picks a timezone only where the country has more than one.
describe("resolveListingTimezone", () => {
  test("a country with one timezone resolves on its own", () => {
    expect(resolveListingTimezone({ country: "Netherlands" })).toEqual({
      ok: true,
      countryCode: "NL",
      timezone: "Europe/Amsterdam",
    });
  });

  test("ignores case and surrounding spaces in the stored country name", () => {
    expect(resolveListingTimezone({ country: "  netherlands " })).toMatchObject({ ok: true, countryCode: "NL" });
  });

  test("accepts a two-letter country code as well", () => {
    expect(resolveListingTimezone({ country: "nl" })).toMatchObject({ ok: true, countryCode: "NL" });
  });

  // Names as host onboarding stores them (react-select-country-list), taken from main.property_location
  // on 23 Nov; Intl spells these differently ("Türkiye", "Tanzania", "St. Barthélemy").
  test.each([
    ["France", "FR"],
    ["Turkey", "TR"],
    ["Tanzania, United Republic Of", "TZ"],
    ["Turks And Caicos Islands", "TC"],
    ["Saint Barthélemy", "BL"],
    ["Åland Islands", "AX"],
  ])("reads the onboarding name %p as %p", (country, countryCode) => {
    expect(resolveListingTimezone({ country })).toMatchObject({ ok: true, countryCode });
  });

  // Germany (Berlin, Büsingen) and Cyprus (Nicosia, Famagusta) have two zones with the same clock time;
  // asking the host to choose between them would be noise.
  test.each([["Germany"], ["Cyprus"]])("%p resolves without a question: its zones show the same time", (country) => {
    expect(resolveListingTimezone({ country })).toMatchObject({ ok: true });
  });

  // Spain has the Canary Islands and Ceuta; the host has to say which one the listing is in.
  test("a country with several timezones asks the host to pick, and lists the options", () => {
    const result = resolveListingTimezone({ country: "Spain" });

    expect(result).toMatchObject({ ok: false, problem: TIMEZONE_PROBLEM.CHOICE_NEEDED, countryCode: "ES" });
    expect(result.options).toEqual(expect.arrayContaining(["Europe/Madrid", "Atlantic/Canary"]));
  });

  test("uses the timezone the host picked when it belongs to the country", () => {
    expect(resolveListingTimezone({ country: "Spain", chosenTimezone: "Atlantic/Canary" })).toEqual({
      ok: true,
      countryCode: "ES",
      timezone: "Atlantic/Canary",
    });
  });

  test("refuses a picked timezone that is not in the country", () => {
    expect(resolveListingTimezone({ country: "Spain", chosenTimezone: "Europe/Amsterdam" })).toMatchObject({
      ok: false,
      problem: TIMEZONE_PROBLEM.INVALID_CHOICE,
    });
  });

  // Guessing a timezone would shift every date the OTAs show, so an unknown country stops provisioning.
  test.each([["Atlantis"], [""], [null], [undefined]])("refuses an unknown country %p", (country) => {
    expect(resolveListingTimezone({ country })).toEqual({ ok: false, problem: TIMEZONE_PROBLEM.UNKNOWN_COUNTRY });
  });
});
