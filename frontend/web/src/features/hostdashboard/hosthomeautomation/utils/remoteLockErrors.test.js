import { getErrorMessage, getErrorMessageKey } from "./remoteLockErrors";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import de from "../../../../content/de.json";
import es from "../../../../content/es.json";

const LANGUAGES = { en, nl, de, es };
const CODES = {
  NOT_CONNECTED: "needsReconnect",
  NEEDS_RECONNECT: "needsReconnect",
  ALREADY_CONNECTED: "alreadyConnected",
  CONFIG_MISSING: "notConfigured",
  LEASE_UNAVAILABLE: "tryLater",
  SECRET_STORE_ERROR: "tryLater",
  PROVIDER_UNAVAILABLE: "tryLater",
  RATE_LIMITED: "tryLater",
  STATE_INVALID: "startAgain",
  STATE_EXPIRED: "startAgain",
  CODE_REJECTED: "startAgain",
  MISSING_FIELD: "startAgain",
  PROVIDER_AUTH: "providerError",
  PROVIDER_ERROR: "providerError",
  CONFIG_ERROR: "providerError",
};

describe("remoteLockErrors", () => {
  it.each(Object.entries(CODES))("maps %s to %s", (code, key) => {
    expect(getErrorMessageKey(code)).toBe(key);
  });

  it.each(["INTERNAL_ERROR", "constructor", "__proto__", "", null, undefined])(
    "has no key for %j, and falls back to the generic message",
    (code) => {
      expect(getErrorMessageKey(code)).toBeNull();
      expect(getErrorMessage(code, en.settings.homeAutomation)).toBe("Something went wrong. Please try again.");
    }
  );

  it.each(Object.keys(LANGUAGES))(
    "%s has text for every key the codes map to, and for the callback's own",
    (language) => {
      const { errors } = LANGUAGES[language].settings.homeAutomation;

      [...new Set(Object.values(CODES)), "cancelled", "missingParams"].forEach((key) =>
        expect(errors[key]?.trim()).toBeTruthy()
      );
    }
  );
});
