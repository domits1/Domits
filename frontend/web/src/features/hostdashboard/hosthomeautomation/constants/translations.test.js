import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import de from "../../../../content/de.json";
import es from "../../../../content/es.json";
import { STATUS_PRESENTATION, UNKNOWN_STATUS_PRESENTATION } from "./homeAutomationConstants";

const LANGUAGES = { en, nl, de, es };

const keyPaths = (value, prefix = "") =>
  Object.entries(value)
    .flatMap(([key, child]) => (typeof child === "object" ? keyPaths(child, `${prefix}${key}.`) : [`${prefix}${key}`]))
    .sort();

describe("home automation content", () => {
  it.each(Object.keys(LANGUAGES))("%s has a non-empty label for every status the page can show", (language) => {
    const { statuses } = LANGUAGES[language].settings.homeAutomation;
    const labelKeys = [...Object.values(STATUS_PRESENTATION), UNKNOWN_STATUS_PRESENTATION].map(
      ({ labelKey }) => labelKey
    );

    labelKeys.forEach((labelKey) => {
      expect(typeof statuses[labelKey]).toBe("string");
      expect(statuses[labelKey].trim()).not.toBe("");
    });
  });

  it.each(["nl", "de", "es"])("%s has exactly the keys of en for the page and the hub card", (language) => {
    const { settings } = LANGUAGES[language];

    expect(keyPaths(settings.homeAutomation)).toEqual(keyPaths(en.settings.homeAutomation));
    expect(keyPaths(settings.hub.cards.homeAutomation)).toEqual(keyPaths(en.settings.hub.cards.homeAutomation));
  });
});
