import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { DirectBookingWebsiteRatePlanService } from "../../functions/PropertyHandler/business/service/directBookingWebsiteRatePlanService.js";
import { WebsiteElitePageSettings } from "../../functions/PropertyHandler/business/service/websiteElitePageSettings.js";
import {
  PAID_ELITE_ROW,
  buildRatePlanRepository,
  expectNoPlanRead,
  expectOnlyCurrentPlanRead,
  ratePlanRow,
} from "./support/existingSiteRender.js";

const SITE_PAGES = { gallery: { enabled: true, navLabel: "Gallery" } };
const PROPERTY_DETAILS = { property: { id: "property-1", title: "Cliff House", status: "ACTIVE" } };

const draftRow = ({ contentOverrides = {}, publishedContentOverrides = {} } = {}) => ({
  id: "draft-1",
  propertyId: "property-1",
  hostId: "host-1",
  templateKey: "panorama-landing",
  status: "PREVIEW",
  contentOverrides: { heroTitle: "Draft villa", ...contentOverrides },
  themeOverrides: {},
  publishedContentOverrides: { heroTitle: "Live villa", ...publishedContentOverrides },
  publishedThemeOverrides: {},
  createdAt: 1757500000000,
  updatedAt: 1757600000000,
  lastPreviewBuiltAt: null,
});

const DRAFT_WITH_PAGES = draftRow({
  contentOverrides: { sitePages: SITE_PAGES },
  publishedContentOverrides: { sitePages: SITE_PAGES },
});

const openPreview = (draft, ratePlanRepository, query = {}, planReadTimeoutMs = undefined) => {
  const controller = new PropertyController();
  controller.directBookingWebsiteDraftRepository = { getDraftById: jest.fn(async () => draft) };
  controller.directBookingWebsiteEventRepository = { recordEvent: jest.fn(async () => undefined) };
  controller.propertyService = { getFullPropertyAttributesWithFullLocation: jest.fn(async () => PROPERTY_DETAILS) };
  controller.directBookingWebsiteRatePlanService = new DirectBookingWebsiteRatePlanService(ratePlanRepository, {});
  controller.websiteElitePageSettings = new WebsiteElitePageSettings(controller.directBookingWebsiteRatePlanService, {
    planReadTimeoutMs,
  });
  return controller.getWebsitePreviewByDraftId({
    httpMethod: "GET",
    headers: {},
    queryStringParameters: { draft: draft.id, ...query },
  });
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("the public preview of a draft and its page settings", () => {
  it("answers a draft without page settings byte for byte as before and reads no plan", async () => {
    const ratePlanRepository = buildRatePlanRepository(PAID_ELITE_ROW);
    const draft = draftRow();

    const response = await openPreview(draft, ratePlanRepository);

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(JSON.stringify({ draft: draftRow(), propertyDetails: PROPERTY_DETAILS }));
    expectNoPlanRead(ratePlanRepository);
  });

  it.each([
    ["an Essentials plan", ratePlanRow()],
    ["no plan row", null],
  ])("answers the draft of a host with %s as if it had no page settings", async (_label, row) => {
    const consoleError = jest.spyOn(console, "error");
    const ratePlanRepository = buildRatePlanRepository(row);

    const response = await openPreview(DRAFT_WITH_PAGES, ratePlanRepository);

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(JSON.stringify({ draft: draftRow(), propertyDetails: PROPERTY_DETAILS }));
    expectOnlyCurrentPlanRead(ratePlanRepository);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("answers the page settings of an Elite host, read for the draft's own host", async () => {
    const ratePlanRepository = buildRatePlanRepository(PAID_ELITE_ROW);

    const response = await openPreview(DRAFT_WITH_PAGES, ratePlanRepository, { hostId: "host-from-request" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(JSON.stringify({ draft: DRAFT_WITH_PAGES, propertyDetails: PROPERTY_DETAILS }));
    expect(ratePlanRepository.findCurrentByAccountId).toHaveBeenCalledTimes(1);
    expect(ratePlanRepository.findCurrentByAccountId).toHaveBeenCalledWith("host-1");
  });

  it("answers the draft without page settings, not an error, when the plan cannot be read", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const ratePlanRepository = buildRatePlanRepository();
    ratePlanRepository.findCurrentByAccountId.mockRejectedValue(new Error("connection timed out"));

    const response = await openPreview(DRAFT_WITH_PAGES, ratePlanRepository);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).draft).toEqual(draftRow());
  });

  it("answers the draft without page settings once the time limit passes on a plan read that does not answer", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const ratePlanRepository = buildRatePlanRepository();
    ratePlanRepository.findCurrentByAccountId.mockReturnValue(new Promise(() => undefined));

    const response = await openPreview(DRAFT_WITH_PAGES, ratePlanRepository, {}, 20);

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(JSON.stringify({ draft: draftRow(), propertyDetails: PROPERTY_DETAILS }));
  });
});
