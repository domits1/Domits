import { INTEGRATION_CATALOG, INTEGRATION_CATEGORY, INTEGRATION_STATUS } from "./integrationCatalog";
import { ALL_OPTION, filterIntegrations, hasActiveFilters, optionsFor } from "./integrationFilters";

const idsOf = (integrations) => integrations.map((integration) => integration.id);

const NO_FILTERS = { query: "", category: ALL_OPTION, status: ALL_OPTION };

describe("filterIntegrations", () => {
  test("shows every integration in catalog order when nothing is filtered", () => {
    expect(idsOf(filterIntegrations(INTEGRATION_CATALOG, NO_FILTERS))).toEqual(idsOf(INTEGRATION_CATALOG));
  });

  test("finds an integration by part of its name, ignoring case and spaces around the text", () => {
    expect(idsOf(filterIntegrations(INTEGRATION_CATALOG, { ...NO_FILTERS, query: "  SITE " }))).toEqual(["siteminder"]);
    expect(idsOf(filterIntegrations(INTEGRATION_CATALOG, { ...NO_FILTERS, query: "lock" }))).toEqual(["remotelock"]);
  });

  test("ignores accents, so a host can type them or leave them out", () => {
    const withAccent = [{ id: "cafe", name: "Café Connect", category: "x", status: "y" }];
    expect(idsOf(filterIntegrations(withAccent, { ...NO_FILTERS, query: "cafe" }))).toEqual(["cafe"]);
    expect(idsOf(filterIntegrations(INTEGRATION_CATALOG, { ...NO_FILTERS, query: "trúvi" }))).toEqual(["truvi"]);
  });

  test("searches the name only, not the description", () => {
    expect(filterIntegrations(INTEGRATION_CATALOG, { ...NO_FILTERS, query: "pricing" })).toEqual([]);
  });

  test("filters on one category", () => {
    const result = filterIntegrations(INTEGRATION_CATALOG, {
      ...NO_FILTERS,
      category: INTEGRATION_CATEGORY.CHANNEL_MANAGEMENT,
    });
    expect(idsOf(result)).toEqual(["channex", "siteminder"]);
  });

  test("filters on one public status", () => {
    const result = filterIntegrations(INTEGRATION_CATALOG, { ...NO_FILTERS, status: INTEGRATION_STATUS.AVAILABLE });
    expect(idsOf(result)).toEqual(["pricelabs", "channex", "whatsapp"]);
  });

  test("combines search, category and status, so an integration must match all three", () => {
    const channelAndAvailable = {
      query: "",
      category: INTEGRATION_CATEGORY.CHANNEL_MANAGEMENT,
      status: INTEGRATION_STATUS.AVAILABLE,
    };
    expect(idsOf(filterIntegrations(INTEGRATION_CATALOG, channelAndAvailable))).toEqual(["channex"]);
    expect(filterIntegrations(INTEGRATION_CATALOG, { ...channelAndAvailable, query: "site" })).toEqual([]);
  });

  test("returns nothing when no integration matches", () => {
    expect(filterIntegrations(INTEGRATION_CATALOG, { ...NO_FILTERS, query: "calry" })).toEqual([]);
  });

  test("treats missing filters as no filter", () => {
    expect(idsOf(filterIntegrations(INTEGRATION_CATALOG, {}))).toEqual(idsOf(INTEGRATION_CATALOG));
    expect(idsOf(filterIntegrations(INTEGRATION_CATALOG))).toEqual(idsOf(INTEGRATION_CATALOG));
  });
});

describe("optionsFor", () => {
  test("lists each category once, in catalog order, so the filter never offers an empty choice", () => {
    expect(optionsFor(INTEGRATION_CATALOG, "category")).toEqual([
      INTEGRATION_CATEGORY.REVENUE_MANAGEMENT,
      INTEGRATION_CATEGORY.CHANNEL_MANAGEMENT,
      INTEGRATION_CATEGORY.GUEST_PROTECTION,
      INTEGRATION_CATEGORY.SMART_LOCKS,
      INTEGRATION_CATEGORY.GUEST_COMMUNICATION,
    ]);
  });

  test("lists only the statuses that an integration uses", () => {
    expect(optionsFor(INTEGRATION_CATALOG, "status")).toEqual([
      INTEGRATION_STATUS.AVAILABLE,
      INTEGRATION_STATUS.IN_DEVELOPMENT,
    ]);
  });
});

describe("hasActiveFilters", () => {
  test("is false when nothing is filtered, also with only spaces in the search", () => {
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...NO_FILTERS, query: "   " })).toBe(false);
  });

  test("is true as soon as the search, the category or the status is set", () => {
    expect(hasActiveFilters({ ...NO_FILTERS, query: "truvi" })).toBe(true);
    expect(hasActiveFilters({ ...NO_FILTERS, category: INTEGRATION_CATEGORY.SMART_LOCKS })).toBe(true);
    expect(hasActiveFilters({ ...NO_FILTERS, status: INTEGRATION_STATUS.AVAILABLE })).toBe(true);
  });
});
