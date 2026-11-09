import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  EXISTING_DOMAIN,
  EXISTING_SITE,
  EXISTING_SITE_RENDER_BODY,
  buildExistingSiteController,
  buildRatePlanRepository,
  ratePlanRow,
  renderEvent,
} from "./support/existingSiteRender.js";

const SITE_PAGES = { gallery: { enabled: true, navLabel: "Gallery" }, accommodation: { enabled: true } };
const OVERRIDES_WITHOUT_PAGES = EXISTING_SITE.publishedContentOverrides;
const OVERRIDES_WITH_PAGES = { ...OVERRIDES_WITHOUT_PAGES, sitePages: SITE_PAGES };

const asStored = (value) => JSON.parse(JSON.stringify(value));

const buildStoringDraftRepository = (store) => ({
  getDraftByPropertyIdAndHostId: jest.fn(async () => store.draft),
  getDraftById: jest.fn(async (draftId) => (store.draft?.id === draftId ? store.draft : null)),
  upsertDraft: jest.fn(async (input) => {
    store.draft = {
      id: "draft-1",
      propertyId: input.propertyId,
      hostId: input.hostId,
      templateKey: input.templateKey,
      status: input.status,
      contentOverrides: asStored(input.contentOverrides),
      themeOverrides: asStored(input.themeOverrides),
      publishedContentOverrides: asStored(input.publishedContentOverrides ?? {}),
      publishedThemeOverrides: asStored(input.publishedThemeOverrides ?? {}),
      createdAt: EXISTING_SITE.createdAt,
      updatedAt: EXISTING_SITE.updatedAt,
      lastPreviewBuiltAt: null,
    };
    return store.draft;
  }),
});

const buildStoringSiteRepository = (store) => ({
  getSiteById: jest.fn(async (siteId) => (store.site?.id === siteId ? store.site : null)),
  getSiteByPropertyIdAndHostId: jest.fn(async () => store.site),
  upsertSiteWithStaticPageOutbox: jest.fn(async (input) => {
    store.site = {
      id: EXISTING_SITE.id,
      ...asStored(input),
      previewTokenHash: "",
      staticPageRevision: 1,
      createdAt: EXISTING_SITE.createdAt,
      updatedAt: EXISTING_SITE.updatedAt,
    };
    return store.site;
  }),
});

const hostEvent = (body) => ({
  httpMethod: "POST",
  headers: { Authorization: "host-token" },
  body: JSON.stringify(body),
});

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

  return { saved, published, render, preview, store, planReadsBeforeServing };
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
    const flow = await saveAndPublishThroughTheEditorApi(OVERRIDES_WITH_PAGES);

    expect(flow.render.statusCode).toBe(200);
    expect(flow.render.body).toBe(EXISTING_SITE_RENDER_BODY);
  });

  it("gets the same preview as a host who never sent page settings", async () => {
    const withPages = await saveAndPublishThroughTheEditorApi(OVERRIDES_WITH_PAGES);
    const withoutPages = await saveAndPublishThroughTheEditorApi(OVERRIDES_WITHOUT_PAGES);

    expect(withPages.preview.statusCode).toBe(200);
    expect(withPages.preview.body).toBe(withoutPages.preview.body);
    expect(JSON.parse(withPages.preview.body).draft.contentOverrides).toEqual(OVERRIDES_WITHOUT_PAGES);
  });
});
