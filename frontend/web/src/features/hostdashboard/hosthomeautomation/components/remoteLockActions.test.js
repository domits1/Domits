import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import de from "../../../../content/de.json";
import es from "../../../../content/es.json";
import { STATUS_PRESENTATION } from "../constants/homeAutomationConstants";
import { ACTION_BUTTON_CLASS } from "./RemoteLockStatusCard";
import { VARIANT_REQUESTS } from "./RemoteLockConfirmModal";

const LANGUAGES = { en, nl, de, es };
const OFFERED_ACTIONS = [...new Set(Object.values(STATUS_PRESENTATION).flatMap(({ actions }) => actions))].sort();

// An action added to STATUS_PRESENTATION must be wired in every place that handles it, or its button would render
// unstyled and its modal would crash.
describe("RemoteLock actions", () => {
  it("has a button style for exactly the actions the statuses offer", () => {
    expect(Object.keys(ACTION_BUTTON_CLASS).sort()).toEqual(OFFERED_ACTIONS);
  });

  it("has a request for exactly the actions the statuses offer", () => {
    expect(Object.keys(VARIANT_REQUESTS).sort()).toEqual(OFFERED_ACTIONS);
    Object.values(VARIANT_REQUESTS).forEach((request) => expect(typeof request).toBe("function"));
  });

  it.each(Object.keys(LANGUAGES))("%s has button and modal copy for every offered action", (language) => {
    const { actions, modal } = LANGUAGES[language].settings.homeAutomation;

    OFFERED_ACTIONS.forEach((action) => {
      expect(actions[action]?.trim()).toBeTruthy();
      ["title", "body", "confirm", "confirming"].forEach((key) => expect(modal[action]?.[key]?.trim()).toBeTruthy());
    });
  });
});
