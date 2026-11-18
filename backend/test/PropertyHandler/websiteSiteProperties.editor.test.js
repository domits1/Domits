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

  it("publishes the checked content overrides when a later save sends no published overrides", async () => {
    const flow = buildEditorFlow();
    await flow.save({ siteProperties: ownList() });

    const saved = await flow.controller.upsertWebsiteDraft(
      hostEvent({ propertyId: MAIN, templateKey: EXISTING_SITE.templateKey, contentOverrides: { heroTitle: "Villa" } })
    );

    expect(saved.statusCode).toBe(200);
    expect(flow.store.draft.contentOverrides).toEqual({ heroTitle: "Villa" });
    expect(flow.store.draft.publishedContentOverrides).toEqual({ heroTitle: "Villa" });
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

  it.each([
    ["another host's property first", [FOREIGN, "property-gone"], 403],
    ["a missing property first", ["property-gone", FOREIGN], 400],
  ])("answers for the first refused property in the list with %s", async (_label, refusedIds, statusCode) => {
    const flow = buildEditorFlow();
    const refused = refusedIds.map((propertyId, index) => ({ propertyId, slug: `refused-${index}` }));

    const saved = await flow.save({ siteProperties: [...ownList(), ...refused] });

    expect(saved.statusCode).toBe(statusCode);
    expect(flow.controller.authManager.authorizeOwnerRequest).toHaveBeenCalledTimes(4);
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

describe("saving a list that the stored draft already holds", () => {
  const OWN_3 = "property-own-3";
  const storedList = [
    { propertyId: MAIN, slug: "villa-main" },
    { propertyId: OWN, slug: "beach-house" },
  ];
  const checkedIds = (flow) => flow.controller.authManager.authorizeOwnerRequest.mock.calls.map(([, id]) => id);
  const saveDraft = (flow, body) =>
    flow.controller.upsertWebsiteDraft(
      hostEvent({ propertyId: MAIN, templateKey: EXISTING_SITE.templateKey, ...body })
    );
  const flowWithStoredList = async (options) => {
    const flow = buildEditorFlow(options);
    await flow.save({ siteProperties: ownList() });
    flow.controller.authManager.authorizeOwnerRequest.mockClear();
    return flow;
  };

  it.each([
    ["no longer exists", (owners) => owners.delete(OWN)],
    ["belongs to another host now", (owners) => owners.set(OWN, "host-other")],
  ])("keeps a stored property that %s without checking it, for a host without the plan", async (_label, change) => {
    const flow = await flowWithStoredList({ ratePlanRow: ratePlanRow() });
    change(flow.owners);

    const saved = await flow.save({ heroTitle: "Villa", siteProperties: storedList });

    expect(saved.statusCode).toBe(200);
    expect(flow.store.draft.contentOverrides).toEqual({ heroTitle: "Villa", siteProperties: storedList });
    expect(checkedIds(flow)).toEqual([MAIN]);
    expect(flow.controller.directBookingWebsiteDraftRepository.getDraftByPropertyIdAndHostId).toHaveBeenLastCalledWith(
      MAIN,
      HOST
    );
  });

  it("checks only the properties the stored draft does not hold yet, also when a stored slug changes", async () => {
    const flow = await flowWithStoredList();
    flow.owners.set(OWN_3, HOST);
    const nextList = [
      storedList[0],
      { propertyId: OWN, slug: "beach-house-two" },
      { propertyId: OWN_3, slug: "garden" },
    ];

    const saved = await flow.save({ siteProperties: nextList });

    expect(saved.statusCode).toBe(200);
    expect(flow.store.draft.contentOverrides.siteProperties).toEqual(nextList);
    expect(checkedIds(flow)).toEqual([MAIN, OWN_3]);
  });

  it("refuses a new property of another host next to stored ones and keeps the stored draft", async () => {
    const flow = await flowWithStoredList();

    const saved = await flow.save({ siteProperties: [...storedList, { propertyId: FOREIGN, slug: "not-mine" }] });

    expect(saved.statusCode).toBe(403);
    expect(checkedIds(flow)).toEqual([MAIN, FOREIGN]);
    expect(flow.controller.directBookingWebsiteDraftRepository.upsertDraft).toHaveBeenCalledTimes(1);
    expect(flow.store.draft.contentOverrides.siteProperties).toEqual(storedList);
  });

  it("checks a property again once the stored draft no longer holds it, as when an older tab sends it back", async () => {
    const flow = await flowWithStoredList();
    await flow.save({ siteProperties: [storedList[0]] });
    flow.owners.set(OWN, "host-other");

    const saved = await flow.save({ siteProperties: storedList });

    expect(saved.statusCode).toBe(403);
    expect(checkedIds(flow)).toEqual([MAIN, MAIN, OWN]);
    expect(flow.store.draft.contentOverrides.siteProperties).toEqual([storedList[0]]);
  });

  it.each([
    ["the stored live list holds, when the draft goes back to the live version", [storedList[0]], storedList, false],
    ["the stored working list holds, when the live site is updated from it", storedList, [storedList[0]], true],
  ])("keeps a property that only %s", async (_label, workingList, liveList, sendsLiveList) => {
    const flow = await flowWithStoredList({ ratePlanRow: ratePlanRow() });
    await saveDraft(flow, {
      contentOverrides: { siteProperties: workingList },
      publishedContentOverrides: { siteProperties: liveList },
    });
    flow.owners.delete(OWN);
    const body = { siteProperties: storedList };

    const saved = await saveDraft(flow, {
      contentOverrides: body,
      publishedContentOverrides: sendsLiveList ? body : undefined,
    });

    expect(saved.statusCode).toBe(200);
    expect(flow.store.draft.contentOverrides.siteProperties).toEqual(storedList);
    expect(checkedIds(flow)).toEqual([MAIN, MAIN]);
  });

  it("does not trust the list of a draft row of another host", async () => {
    const flow = buildEditorFlow();
    const list = [storedList[0], { propertyId: FOREIGN, slug: "not-mine" }];
    flow.store.draft = {
      id: "draft-1",
      propertyId: MAIN,
      hostId: "host-before",
      contentOverrides: { siteProperties: list },
      publishedContentOverrides: { siteProperties: list },
    };

    const saved = await flow.save({ siteProperties: list });

    expect(saved.statusCode).toBe(403);
    expect(checkedIds(flow)).toEqual([MAIN, FOREIGN]);
    expect(flow.store.draft.hostId).toBe("host-before");
  });

  it("still applies the list rules to the stored properties", async () => {
    const flow = await flowWithStoredList();

    const saved = await flow.save({ siteProperties: storedList.map((entry) => ({ ...entry, slug: "same" })) });

    expect(saved.statusCode).toBe(400);
    expect(JSON.parse(saved.body).message).toBe("siteProperties must not list a property or a slug twice.");
    expect(flow.store.draft.contentOverrides.siteProperties).toEqual(storedList);
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
