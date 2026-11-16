import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  EXISTING_DOMAIN,
  EXISTING_SITE,
  EXISTING_SITE_RENDER_BODY,
  buildExistingSiteController,
  buildRatePlanRepository,
  buildStoringDraftRepository,
  buildStoringSiteRepository,
  expectOnlyCurrentPlanRead,
  hostEvent,
  ratePlanRow,
  renderEvent,
} from "./support/existingSiteRender.js";

const SITE_PAGES = { gallery: { enabled: true, navLabel: "Gallery" }, accommodation: { enabled: true } };
const OVERRIDES_WITHOUT_PAGES = EXISTING_SITE.publishedContentOverrides;
const OVERRIDES_WITH_PAGES = { ...OVERRIDES_WITHOUT_PAGES, sitePages: SITE_PAGES };

const saveAndPublishThroughTheEditorApi = async (contentOverrides) => {
  const store = { draft: null, site: null };
  const ratePlanRepository = buildRatePlanRepository(ratePlanRow());
  const controller = buildExistingSiteController({ ratePlanRepository });
  controller.authManager = {
    authorizeGroupRequest: jest.fn(async () => EXISTING_SITE.hostId),
    authorizeOwnerRequest: jest.fn(async () => undefined),
  };
  controller.directBookingWebsiteDraftRepository = buildStoringDraftRepository(store);
  controller.directBookingWebsiteSiteRepository = buildStoringSiteRepository(store);
  controller.directBookingWebsiteDomainRepository.getFallbackDomainBySiteId = jest.fn(async () => null);
  controller.directBookingWebsiteDomainRepository.ensureDomain = jest.fn(async () => EXISTING_DOMAIN);
  controller.propertyService.getFullPropertyAttributesWithFullLocation = jest.fn(
    async () => EXISTING_SITE.publishedPropertySnapshot
  );

  const saved = await controller.upsertWebsiteDraft(
    hostEvent({
      propertyId: EXISTING_SITE.propertyId,
      templateKey: EXISTING_SITE.templateKey,
      status: "PREVIEW",
      contentOverrides,
      themeOverrides: {},
      publishedContentOverrides: contentOverrides,
      publishedThemeOverrides: {},
    })
  );
  const published = await controller.publishWebsiteSite(hostEvent({ propertyId: EXISTING_SITE.propertyId }));
  const planReadsBeforeServing = ratePlanRepository.findCurrentByAccountId.mock.calls.length;
  const render = await controller.getPublicWebsiteRenderModel(renderEvent({ domain: EXISTING_DOMAIN.domain }));
  const preview = await controller.getWebsitePreviewByDraftId(renderEvent({ draft: "draft-1" }));

  return { saved, published, render, preview, store, planReadsBeforeServing, ratePlanRepository };
};

beforeEach(() => {
  jest.spyOn(Date, "now").mockReturnValue(EXISTING_SITE.publishedAt);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("an Essentials host who sends page settings through the existing editor API", () => {
  it("can still save and publish, and the plan is not read while saving or publishing", async () => {
    const flow = await saveAndPublishThroughTheEditorApi(OVERRIDES_WITH_PAGES);

    expect(flow.saved.statusCode).toBe(200);
    expect(flow.published.statusCode).toBe(200);
    expect(flow.planReadsBeforeServing).toBe(0);
    expect(flow.store.draft.contentOverrides).toEqual(OVERRIDES_WITH_PAGES);
    expect(flow.store.site.publishedContentOverrides).toEqual(OVERRIDES_WITH_PAGES);
  });

  it("gets the live site byte for byte as an existing site without page settings", async () => {
    const consoleError = jest.spyOn(console, "error");
    const flow = await saveAndPublishThroughTheEditorApi(OVERRIDES_WITH_PAGES);

    expect(flow.render.statusCode).toBe(200);
    expect(flow.render.body).toBe(EXISTING_SITE_RENDER_BODY);
    expectOnlyCurrentPlanRead(flow.ratePlanRepository);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("gets the same preview as a host who never sent page settings", async () => {
    const withPages = await saveAndPublishThroughTheEditorApi(OVERRIDES_WITH_PAGES);
    const withoutPages = await saveAndPublishThroughTheEditorApi(OVERRIDES_WITHOUT_PAGES);

    expect(withPages.preview.statusCode).toBe(200);
    expect(withPages.preview.body).toBe(withoutPages.preview.body);
    expect(JSON.parse(withPages.preview.body).draft.contentOverrides).toEqual(OVERRIDES_WITHOUT_PAGES);
  });
});
