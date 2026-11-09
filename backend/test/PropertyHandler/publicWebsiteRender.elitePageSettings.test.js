import { afterEach, describe, expect, it, jest } from "@jest/globals";
import {
  EXISTING_DOMAIN,
  EXISTING_SITE,
  EXISTING_SITE_RENDER_BODY,
  EXISTING_SITE_RENDER_QUERIES,
  PAID_ELITE_ROW,
  buildExistingSiteController,
  buildRatePlanRepository,
  expectNoPlanRead,
  expectOnlyCurrentPlanRead,
  ratePlanRow,
  renderEvent,
} from "./support/existingSiteRender.js";
import { WebsiteElitePageSettings } from "../../functions/PropertyHandler/business/service/websiteElitePageSettings.js";

const SITE_PAGES = { gallery: { enabled: true, navLabel: "Gallery" }, contact: { enabled: false } };

const SITE_WITH_PAGES = Object.freeze({
  ...EXISTING_SITE,
  publishedContentOverrides: { ...EXISTING_SITE.publishedContentOverrides, sitePages: SITE_PAGES },
});

const renderSite = (ratePlanRepository, query) =>
  buildExistingSiteController({ site: SITE_WITH_PAGES, ratePlanRepository }).getPublicWebsiteRenderModel(
    renderEvent(query)
  );

afterEach(() => {
  jest.restoreAllMocks();
});

describe("the public render of an existing site without page settings", () => {
  it.each(EXISTING_SITE_RENDER_QUERIES)(
    "answers byte for byte the stored acceptance response and reads no plan, by %s",
    async (_label, query) => {
      const consoleError = jest.spyOn(console, "error");
      const ratePlanRepository = buildRatePlanRepository();
      const controller = buildExistingSiteController({ ratePlanRepository });

      const response = await controller.getPublicWebsiteRenderModel(renderEvent(query));

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe(EXISTING_SITE_RENDER_BODY);
      expectNoPlanRead(ratePlanRepository);
      expect(consoleError).not.toHaveBeenCalled();
    }
  );
});

describe("the public render of a site with page settings", () => {
  it.each(EXISTING_SITE_RENDER_QUERIES)(
    "serves the page settings of an Elite host, read for the site's own host, by %s",
    async (_label, query) => {
      const ratePlanRepository = buildRatePlanRepository(PAID_ELITE_ROW);

      const response = await renderSite(ratePlanRepository, { ...query, hostId: "host-from-request" });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).contentOverrides).toEqual(SITE_WITH_PAGES.publishedContentOverrides);
      expect(ratePlanRepository.findCurrentByAccountId).toHaveBeenCalledTimes(1);
      expect(ratePlanRepository.findCurrentByAccountId).toHaveBeenCalledWith(EXISTING_SITE.hostId);
    }
  );

  it.each([
    ["an Essentials plan", ratePlanRow()],
    ["no plan row", null],
  ])("answers the site of a host with %s byte for byte as it was without page settings", async (_label, row) => {
    const consoleError = jest.spyOn(console, "error");
    const ratePlanRepository = buildRatePlanRepository(row);

    const response = await renderSite(ratePlanRepository, { domain: EXISTING_DOMAIN.domain });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(EXISTING_SITE_RENDER_BODY);
    expectOnlyCurrentPlanRead(ratePlanRepository);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("answers the site without page settings, not an error, when the plan cannot be read", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const ratePlanRepository = buildRatePlanRepository();
    ratePlanRepository.findCurrentByAccountId.mockRejectedValue(new Error("connection timed out"));

    const response = await renderSite(ratePlanRepository, { site: EXISTING_SITE.id });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(EXISTING_SITE_RENDER_BODY);
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it("answers the site without page settings once the time limit passes on a plan read that does not answer", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const ratePlanRepository = buildRatePlanRepository();
    ratePlanRepository.findCurrentByAccountId.mockReturnValue(new Promise(() => undefined));
    const controller = buildExistingSiteController({ site: SITE_WITH_PAGES, ratePlanRepository });
    controller.websiteElitePageSettings = new WebsiteElitePageSettings(controller.directBookingWebsiteRatePlanService, {
      planReadTimeoutMs: 20,
    });

    const response = await controller.getPublicWebsiteRenderModel(renderEvent({ domain: EXISTING_DOMAIN.domain }));

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(EXISTING_SITE_RENDER_BODY);
  });
});
