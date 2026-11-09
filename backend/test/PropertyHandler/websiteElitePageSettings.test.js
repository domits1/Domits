import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { DirectBookingWebsiteRatePlanService } from "../../functions/PropertyHandler/business/service/directBookingWebsiteRatePlanService.js";
import { WebsiteElitePageSettings } from "../../functions/PropertyHandler/business/service/websiteElitePageSettings.js";
import {
  PAID_ELITE_ROW,
  buildRatePlanRepository,
  expectNoPlanRead,
  expectOnlyCurrentPlanRead,
  ratePlanRow,
} from "./support/existingSiteRender.js";

const HOST_ID = "host-1";
const SITE_PAGES = { gallery: { enabled: true, navLabel: "Gallery" } };
const GRANTED_ELITE_ROW = ratePlanRow({ plan: "elite", effective_until: new Date(Date.now() + 86_400_000) });
const ENDED_ELITE_ROW = ratePlanRow({ plan: "elite", effective_until: new Date(Date.now() - 60_000) });

const overridesWithPages = () => ({ heroTitle: "Villa", sitePages: SITE_PAGES, ctaLabel: "Book" });

const buildPageSettings = (ratePlanRepository) =>
  new WebsiteElitePageSettings(new DirectBookingWebsiteRatePlanService(ratePlanRepository, {}));

afterEach(() => {
  jest.restoreAllMocks();
});

describe("serving page settings in the overrides of a site", () => {
  it.each([
    ["overrides without page settings", { heroTitle: "Villa", ctaLabel: "Book" }],
    ["empty overrides", {}],
    ["null", null],
    ["undefined", undefined],
    ["an array", [{ sitePages: SITE_PAGES }]],
    ["a string", "sitePages"],
  ])("returns %s as they are and reads no plan", async (_label, overrides) => {
    const ratePlanRepository = buildRatePlanRepository(PAID_ELITE_ROW);

    const served = await buildPageSettings(ratePlanRepository).servePageSettingsForHost({ hostId: HOST_ID, overrides });

    expect(served).toBe(overrides);
    expectNoPlanRead(ratePlanRepository);
  });

  it.each([
    ["a paid Elite plan", PAID_ELITE_ROW],
    ["a granted Elite plan", GRANTED_ELITE_ROW],
  ])("keeps the page settings for a host with %s", async (_label, row) => {
    const ratePlanRepository = buildRatePlanRepository(row);
    const overrides = overridesWithPages();

    const served = await buildPageSettings(ratePlanRepository).servePageSettingsForHost({ hostId: HOST_ID, overrides });

    expect(served).toBe(overrides);
    expect(ratePlanRepository.findCurrentByAccountId).toHaveBeenCalledTimes(1);
    expect(ratePlanRepository.findCurrentByAccountId).toHaveBeenCalledWith(HOST_ID);
  });

  it.each([
    ["an Essentials plan", ratePlanRow()],
    ["no current plan", null],
    ["an Elite plan whose end date has passed", ENDED_ELITE_ROW],
  ])("drops only the page settings for a host with %s, without changing the stored overrides", async (_label, row) => {
    const ratePlanRepository = buildRatePlanRepository(row);
    const overrides = overridesWithPages();

    const served = await buildPageSettings(ratePlanRepository).servePageSettingsForHost({ hostId: HOST_ID, overrides });

    expect(JSON.stringify(served)).toBe(JSON.stringify({ heroTitle: "Villa", ctaLabel: "Book" }));
    expect(overrides).toEqual(overridesWithPages());
    expectOnlyCurrentPlanRead(ratePlanRepository);
  });

  it("drops the page settings and logs, without failing, when the plan cannot be read", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const ratePlanRepository = buildRatePlanRepository();
    ratePlanRepository.findCurrentByAccountId.mockRejectedValue(new Error("connection timed out"));

    const served = await buildPageSettings(ratePlanRepository).servePageSettingsForHost({
      hostId: HOST_ID,
      overrides: overridesWithPages(),
    });

    expect(served).toEqual({ heroTitle: "Villa", ctaLabel: "Book" });
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it("drops the page settings without reading a plan when the site has no host", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const ratePlanRepository = buildRatePlanRepository(PAID_ELITE_ROW);

    const served = await buildPageSettings(ratePlanRepository).servePageSettingsForHost({
      hostId: "",
      overrides: overridesWithPages(),
    });

    expect(served).toEqual({ heroTitle: "Villa", ctaLabel: "Book" });
    expectNoPlanRead(ratePlanRepository);
  });
});

describe("serving page settings in a draft preview", () => {
  const draft = (overrides = {}) => ({
    id: "draft-1",
    hostId: HOST_ID,
    templateKey: "panorama-landing",
    contentOverrides: { heroTitle: "Draft villa" },
    themeOverrides: {},
    publishedContentOverrides: { heroTitle: "Live villa" },
    publishedThemeOverrides: {},
    ...overrides,
  });

  it("returns a draft without page settings as it is and reads no plan", async () => {
    const ratePlanRepository = buildRatePlanRepository(PAID_ELITE_ROW);
    const storedDraft = draft();

    const served = await buildPageSettings(ratePlanRepository).servePageSettingsOnDraft(storedDraft);

    expect(served).toBe(storedDraft);
    expectNoPlanRead(ratePlanRepository);
  });

  it.each([
    ["the draft overrides", { contentOverrides: { heroTitle: "Draft villa", sitePages: SITE_PAGES } }],
    ["the published overrides", { publishedContentOverrides: { heroTitle: "Live villa", sitePages: SITE_PAGES } }],
    [
      "both overrides",
      {
        contentOverrides: { heroTitle: "Draft villa", sitePages: SITE_PAGES },
        publishedContentOverrides: { heroTitle: "Live villa", sitePages: SITE_PAGES },
      },
    ],
  ])(
    "drops page settings in %s for an Essentials host with one plan read of the draft's own host",
    async (_label, fields) => {
      const consoleError = jest.spyOn(console, "error");
      const ratePlanRepository = buildRatePlanRepository(ratePlanRow());
      const storedDraft = draft(fields);

      const served = await buildPageSettings(ratePlanRepository).servePageSettingsOnDraft(storedDraft);

      expect(JSON.stringify(served)).toBe(JSON.stringify(draft()));
      expect(storedDraft).toEqual(draft(fields));
      expect(ratePlanRepository.findCurrentByAccountId).toHaveBeenCalledTimes(1);
      expect(ratePlanRepository.findCurrentByAccountId).toHaveBeenCalledWith(HOST_ID);
      expectOnlyCurrentPlanRead(ratePlanRepository);
      expect(consoleError).not.toHaveBeenCalled();
    }
  );

  it("drops page settings in a draft of a host without a plan row by reading only the current plan", async () => {
    const consoleError = jest.spyOn(console, "error");
    const ratePlanRepository = buildRatePlanRepository(null);
    const storedDraft = draft({
      contentOverrides: { heroTitle: "Draft villa", sitePages: SITE_PAGES },
      publishedContentOverrides: { heroTitle: "Live villa", sitePages: SITE_PAGES },
    });

    const served = await buildPageSettings(ratePlanRepository).servePageSettingsOnDraft(storedDraft);

    expect(JSON.stringify(served)).toBe(JSON.stringify(draft()));
    expectOnlyCurrentPlanRead(ratePlanRepository);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("keeps page settings in a draft of an Elite host", async () => {
    const storedDraft = draft({
      contentOverrides: { heroTitle: "Draft villa", sitePages: SITE_PAGES },
      publishedContentOverrides: { heroTitle: "Live villa", sitePages: SITE_PAGES },
    });

    const served = await buildPageSettings(buildRatePlanRepository(PAID_ELITE_ROW)).servePageSettingsOnDraft(
      storedDraft
    );

    expect(served).toBe(storedDraft);
  });
});
