import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import de from "../../../../content/de.json";
import es from "../../../../content/es.json";
import {
  DEVICE_STATUS_LABEL_KEY_VALUES,
  DEVICE_TYPE_LABEL_KEY_VALUES,
  STATUS_PRESENTATION,
  UNKNOWN_STATUS_PRESENTATION,
} from "./homeAutomationConstants";

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

  it.each(Object.keys(LANGUAGES))("%s has a non-empty label for every device type and device status", (language) => {
    const { devices } = LANGUAGES[language].settings.homeAutomation;

    DEVICE_TYPE_LABEL_KEY_VALUES.forEach((labelKey) => expect(devices.types[labelKey]?.trim()).toBeTruthy());
    DEVICE_STATUS_LABEL_KEY_VALUES.forEach((labelKey) => expect(devices.statuses[labelKey]?.trim()).toBeTruthy());
  });

  it.each(["nl", "de", "es"])("%s has exactly the keys of en for the page and the hub card", (language) => {
    const { settings } = LANGUAGES[language];

    expect(keyPaths(settings.homeAutomation)).toEqual(keyPaths(en.settings.homeAutomation));
    expect(keyPaths(settings.hub.cards.homeAutomation)).toEqual(keyPaths(en.settings.hub.cards.homeAutomation));
  });

  it.each(Object.keys(LANGUAGES))("%s has non-empty modal copy for every action a status can offer", (language) => {
    const { actions, modal } = LANGUAGES[language].settings.homeAutomation;
    const offered = new Set(Object.values(STATUS_PRESENTATION).flatMap((presentation) => presentation.actions));

    offered.forEach((action) => {
      expect(actions[action]?.trim()).toBeTruthy();
      ["title", "body", "confirm", "confirming"].forEach((key) => expect(modal[action][key]?.trim()).toBeTruthy());
    });
  });
});
