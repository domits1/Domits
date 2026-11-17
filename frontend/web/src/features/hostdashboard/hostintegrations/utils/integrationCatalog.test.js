import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import de from "../../../../content/de.json";
import es from "../../../../content/es.json";
import {
  INTEGRATION_CATALOG,
  INTEGRATION_CATEGORY,
  INTEGRATION_STATUS,
  TALK_TO_SALES_PATH,
} from "./integrationCatalog";

const LANGUAGES = { en, nl, de, es };
const STATUSES = Object.values(INTEGRATION_STATUS);
const CATEGORIES = Object.values(INTEGRATION_CATEGORY);

describe("integration catalog", () => {
  test("lists exactly the integrations Product approved for the first version", () => {
    expect(INTEGRATION_CATALOG.map((integration) => integration.id)).toEqual([
      "pricelabs",
      "channex",
      "siteminder",
      "truvi",
      "remotelock",
      "whatsapp",
    ]);
  });

  test("gives every integration a unique id and a name", () => {
    const ids = INTEGRATION_CATALOG.map((integration) => integration.id);
    expect(new Set(ids).size).toBe(ids.length);
    INTEGRATION_CATALOG.forEach((integration) => {
      expect(integration.id).toMatch(/^[a-z0-9-]+$/);
      expect(integration.name.trim()).not.toBe("");
    });
  });

  test("uses only the public statuses and the known categories", () => {
    INTEGRATION_CATALOG.forEach((integration) => {
      expect(STATUSES).toContain(integration.status);
      expect(CATEGORIES).toContain(integration.category);
    });
  });

  test("shows each status the way Product agreed", () => {
    const statusOf = Object.fromEntries(INTEGRATION_CATALOG.map((integration) => [integration.id, integration.status]));
    expect(statusOf).toEqual({
      pricelabs: INTEGRATION_STATUS.AVAILABLE,
      channex: INTEGRATION_STATUS.AVAILABLE,
      siteminder: INTEGRATION_STATUS.IN_DEVELOPMENT,
      truvi: INTEGRATION_STATUS.IN_DEVELOPMENT,
      remotelock: INTEGRATION_STATUS.IN_DEVELOPMENT,
      whatsapp: INTEGRATION_STATUS.IN_DEVELOPMENT,
    });
  });

  test("sends every integration to the Domits contact page, because none has its own connect flow in the catalog", () => {
    expect(TALK_TO_SALES_PATH).toBe("/contact");
    INTEGRATION_CATALOG.forEach((integration) => expect(integration.link).toBe(TALK_TO_SALES_PATH));
  });

  test("has no logo yet, so the card shows the first letter", () => {
    INTEGRATION_CATALOG.forEach((integration) => expect(integration.logo).toBeNull());
  });

  test("cannot be changed at run time", () => {
    expect(Object.isFrozen(INTEGRATION_CATALOG)).toBe(true);
    INTEGRATION_CATALOG.forEach((integration) => expect(Object.isFrozen(integration)).toBe(true));
  });

  test.each(Object.keys(LANGUAGES))("has every text in %s", (language) => {
    const texts = LANGUAGES[language].hostIntegrations;

    STATUSES.forEach((status) => expect(texts.statuses[status]?.trim()).toBeTruthy());
    CATEGORIES.forEach((category) => expect(texts.categories[category]?.trim()).toBeTruthy());
    INTEGRATION_CATALOG.forEach((integration) => expect(texts.descriptions[integration.id]?.trim()).toBeTruthy());
    expect(texts.talkToSales?.trim()).toBeTruthy();
  });
});
