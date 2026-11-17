import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Forbidden } from "../../functions/PropertyHandler/util/exception/Forbidden.js";
import { NotFoundException } from "../../functions/PropertyHandler/util/exception/NotFoundException.js";
import { WebsiteElitePageSettings } from "../../functions/PropertyHandler/business/service/websiteElitePageSettings.js";
import {
  EXISTING_DOMAIN,
  EXISTING_SITE,
  PAID_ELITE_ROW,
  buildExistingSiteController,
  buildRatePlanRepository,
  buildStoringDraftRepository,
  buildStoringSiteRepository,
  hostEvent,
  ratePlanRow,
  renderEvent,
} from "./support/existingSiteRender.js";

const HOST = EXISTING_SITE.hostId;
const MAIN = EXISTING_SITE.propertyId;
const OWN = "property-own-2";
const FOREIGN = "property-foreign";
const SITE_PAGES = { gallery: { enabled: true } };
const ownList = () => [
  { propertyId: MAIN, slug: " Villa-Main " },
  { propertyId: OWN, slug: "beach-house" },
];

const buildEditorFlow = ({ ratePlanRow: planRow = PAID_ELITE_ROW } = {}) => {
  const store = { draft: null, site: null };
  const owners = new Map([
    [MAIN, HOST],
    [OWN, HOST],
    [FOREIGN, "host-other"],
  ]);
  const ratePlanRepository = buildRatePlanRepository(planRow);
  const controller = buildExistingSiteController({ ratePlanRepository });
  controller.authManager = {
    authorizeGroupRequest: jest.fn(async () => HOST),
    authorizeOwnerRequest: jest.fn(async (_token, propertyId) => {
      if (!owners.has(propertyId)) throw new NotFoundException("Property not found.");
      if (owners.get(propertyId) !== HOST) throw new Forbidden("You must be the owner of the property to access it.");
      return HOST;
    }),
  };
  controller.directBookingWebsiteDraftRepository = buildStoringDraftRepository(store);
  controller.directBookingWebsiteSiteRepository = buildStoringSiteRepository(store);
  controller.directBookingWebsiteDomainRepository.getFallbackDomainBySiteId = jest.fn(async () => null);
  controller.directBookingWebsiteDomainRepository.ensureDomain = jest.fn(async () => EXISTING_DOMAIN);
  controller.propertyService.getFullPropertyAttributesWithFullLocation = jest.fn(
    async () => EXISTING_SITE.publishedPropertySnapshot
  );

  const save = (contentOverrides) =>
    controller.upsertWebsiteDraft(
      hostEvent({
        propertyId: MAIN,
        templateKey: EXISTING_SITE.templateKey,
        status: "PREVIEW",
        contentOverrides,
        themeOverrides: {},
        publishedContentOverrides: contentOverrides,
        publishedThemeOverrides: {},
      })
    );
  const publish = () => controller.publishWebsiteSite(hostEvent({ propertyId: MAIN }));
  const render = () => controller.getPublicWebsiteRenderModel(renderEvent({ domain: EXISTING_DOMAIN.domain }));

  return { controller, store, owners, save, publish, render };
};

const servedOverrides = (response) => JSON.parse(response.body).contentOverrides;

beforeEach(() => {
  jest.spyOn(Date, "now").mockReturnValue(EXISTING_SITE.publishedAt);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("saving the properties of a website", () => {
  it("stores a list of the host's own properties, cleaned, after checking every one", async () => {
    const flow = buildEditorFlow();

    const saved = await flow.save({ heroTitle: "Villa", siteProperties: ownList() });

    expect(saved.statusCode).toBe(200);
    const cleaned = [
      { propertyId: MAIN, slug: "villa-main" },
      { propertyId: OWN, slug: "beach-house" },
    ];
    expect(flow.store.draft.contentOverrides.siteProperties).toEqual(cleaned);
    expect(flow.store.draft.publishedContentOverrides.siteProperties).toEqual(cleaned);
    expect(flow.controller.authManager.authorizeOwnerRequest.mock.calls).toEqual([
      ["host-token", MAIN],
      ["host-token", OWN],
    ]);
  });

  it("keeps the checked published list when a later save sends no published overrides", async () => {
    const flow = buildEditorFlow();
    await flow.save({ siteProperties: ownList() });

    const saved = await flow.controller.upsertWebsiteDraft(
      hostEvent({ propertyId: MAIN, templateKey: EXISTING_SITE.templateKey, contentOverrides: { heroTitle: "Villa" } })
    );

    expect(saved.statusCode).toBe(200);
    expect(flow.store.draft.contentOverrides).toEqual({ heroTitle: "Villa" });
    expect(flow.store.draft.publishedContentOverrides.siteProperties.map(({ propertyId }) => propertyId)).toEqual([
      MAIN,
      OWN,
    ]);
  });

  it("refuses a property of another host and stores nothing", async () => {
    const flow = buildEditorFlow();

    const saved = await flow.save({ siteProperties: [...ownList(), { propertyId: FOREIGN, slug: "not-mine" }] });

    expect(saved.statusCode).toBe(403);
    expect(flow.controller.directBookingWebsiteDraftRepository.upsertDraft).not.toHaveBeenCalled();
    expect(flow.store.draft).toBeNull();
  });

  it("refuses a property that does not exist with a clear message and stores nothing", async () => {
    const flow = buildEditorFlow();

    const saved = await flow.save({ siteProperties: [...ownList(), { propertyId: "property-gone", slug: "gone" }] });

    expect(saved.statusCode).toBe(400);
    expect(JSON.parse(saved.body).message).toBe("siteProperties lists a property that does not exist.");
    expect(flow.store.draft).toBeNull();
  });

  it("checks a property that is only in the live overrides", async () => {
    const flow = buildEditorFlow();

    const saved = await flow.controller.upsertWebsiteDraft(
      hostEvent({
        propertyId: MAIN,
        templateKey: EXISTING_SITE.templateKey,
        contentOverrides: {},
        publishedContentOverrides: { siteProperties: [{ propertyId: MAIN, slug: "main" }, { propertyId: FOREIGN, slug: "x" }] },
      })
    );

    expect(saved.statusCode).toBe(403);
    expect(flow.store.draft).toBeNull();
  });

  it.each([
    ["not an array", { siteProperties: "property-own-2" }],
    ["a list without the main property", { siteProperties: [{ propertyId: OWN, slug: "beach-house" }] }],
    ["a slug used twice", { siteProperties: [{ propertyId: MAIN, slug: "same" }, { propertyId: OWN, slug: "same" }] }],
    ["a slug that is not a path segment", { siteProperties: [{ propertyId: MAIN, slug: "../main" }] }],
  ])("refuses %s with a 400 and stores nothing", async (_label, contentOverrides) => {
    const flow = buildEditorFlow();

    const saved = await flow.save(contentOverrides);

    expect(saved.statusCode).toBe(400);
    expect(JSON.parse(saved.body).message).toMatch(/^siteProperties /);
    expect(flow.controller.authManager.authorizeOwnerRequest).not.toHaveBeenCalled();
    expect(flow.store.draft).toBeNull();
  });

  it("saves overrides without a list as before, checking only the main property", async () => {
    const flow = buildEditorFlow();

    const saved = await flow.save({ heroTitle: "Villa", sitePages: SITE_PAGES });

    expect(saved.statusCode).toBe(200);
    expect(flow.store.draft.contentOverrides).toEqual({ heroTitle: "Villa", sitePages: SITE_PAGES });
    expect(flow.controller.authManager.authorizeOwnerRequest.mock.calls.map(([, id]) => id)).toEqual([MAIN]);
  });
});

describe("publishing the properties of a website", () => {
  it("publishes the checked list", async () => {
    const flow = buildEditorFlow();
    await flow.save({ siteProperties: ownList() });

    const published = await flow.publish();

    expect(published.statusCode).toBe(200);
    expect(flow.controller.authManager.authorizeOwnerRequest).toHaveBeenLastCalledWith("host-token", OWN);
    expect(flow.store.site.publishedContentOverrides.siteProperties).toEqual([
      { propertyId: MAIN, slug: "villa-main" },
      { propertyId: OWN, slug: "beach-house" },
    ]);
  });

  it("refuses to publish once a listed property belongs to another host, and publishes nothing", async () => {
    const flow = buildEditorFlow();
    await flow.save({ siteProperties: ownList() });
    flow.owners.set(OWN, "host-other");

    const published = await flow.publish();

    expect(published.statusCode).toBe(403);
    expect(flow.controller.directBookingWebsiteSiteRepository.upsertSiteWithStaticPageOutbox).not.toHaveBeenCalled();
    expect(flow.store.site).toBeNull();
  });
});

describe("serving the properties of a live website", () => {
  it("serves the list of an Elite host", async () => {
    const flow = buildEditorFlow({ ratePlanRow: PAID_ELITE_ROW });
    await flow.save({ heroTitle: "Villa", siteProperties: ownList() });
    await flow.publish();

    const rendered = await flow.render();

    expect(rendered.statusCode).toBe(200);
    expect(servedOverrides(rendered).siteProperties).toEqual([
      { propertyId: MAIN, slug: "villa-main" },
      { propertyId: OWN, slug: "beach-house" },
    ]);
  });

  it("leaves the list out for an Essentials host and keeps every other override", async () => {
    const flow = buildEditorFlow({ ratePlanRow: ratePlanRow() });
    await flow.save({ heroTitle: "Villa", siteProperties: ownList() });
    await flow.publish();

    const rendered = await flow.render();

    expect(rendered.statusCode).toBe(200);
    expect(servedOverrides(rendered)).toEqual({ heroTitle: "Villa" });
  });
});

describe("serving the property list next to page settings", () => {
  const settingsWithEntitlements = (entitlements) =>
    new WebsiteElitePageSettings({ getCurrentEntitlements: jest.fn(async () => ({ entitlements })) });
  const overrides = () => ({ heroTitle: "Villa", sitePages: SITE_PAGES, siteProperties: ownList() });

  it.each([
    [["website.unlimited_pages", "website.multi_property"], ["heroTitle", "sitePages", "siteProperties"]],
    [["website.unlimited_pages"], ["heroTitle", "sitePages"]],
    [["website.multi_property"], ["heroTitle", "siteProperties"]],
    [[], ["heroTitle"]],
  ])("keeps only what the entitlements %p allow", async (entitlements, keys) => {
    const served = await settingsWithEntitlements(entitlements).servePageSettingsForHost({
      hostId: HOST,
      overrides: overrides(),
    });

    expect(Object.keys(served)).toEqual(keys);
  });

  it("drops the list from both overrides of a draft preview for a host without the entitlement", async () => {
    const draft = { hostId: HOST, contentOverrides: overrides(), publishedContentOverrides: { siteProperties: ownList() } };

    const served = await settingsWithEntitlements(["website.unlimited_pages"]).servePageSettingsOnDraft(draft);

    expect(served.contentOverrides).toEqual({ heroTitle: "Villa", sitePages: SITE_PAGES });
    expect(served.publishedContentOverrides).toEqual({});
    expect(draft.contentOverrides.siteProperties).toHaveLength(2);
  });

  it("drops the list and logs once when the plan cannot be read", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const settings = new WebsiteElitePageSettings({
      getCurrentEntitlements: jest.fn(async () => {
        throw new Error("connection timed out");
      }),
    });

    const served = await settings.servePageSettingsForHost({ hostId: HOST, overrides: overrides() });

    expect(served).toEqual({ heroTitle: "Villa" });
    expect(consoleError).toHaveBeenCalledTimes(1);
  });
});
