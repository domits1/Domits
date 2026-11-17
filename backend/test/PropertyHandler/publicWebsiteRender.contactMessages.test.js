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

const CONTACT_FLAG = "DIRECT_BOOKING_WEBSITE_CONTACT_ENABLED";

const ELITE_SITE = Object.freeze({
  ...EXISTING_SITE,
  publishedContentOverrides: {
    ...EXISTING_SITE.publishedContentOverrides,
    sitePages: { contact: { enabled: true, navLabel: "Contact us" } },
  },
});

const TODAYS_ELITE_SITE_BODY = JSON.stringify({
  ...JSON.parse(EXISTING_SITE_RENDER_BODY),
  contentOverrides: ELITE_SITE.publishedContentOverrides,
});

const ELITE_SITE_BODY_WITH_CONTACT = JSON.stringify({
  ...JSON.parse(TODAYS_ELITE_SITE_BODY),
  acceptsContactMessages: true,
});

const renderBody = async ({
  site = ELITE_SITE,
  ratePlanRepository = buildRatePlanRepository(PAID_ELITE_ROW),
  query = { domain: EXISTING_DOMAIN.domain },
} = {}) => {
  const controller = buildExistingSiteController({ site, ratePlanRepository });
  const response = await controller.getPublicWebsiteRenderModel(renderEvent(query));
  expect(response.statusCode).toBe(200);
  return response.body;
};

afterEach(() => {
  delete process.env[CONTACT_FLAG];
  jest.restoreAllMocks();
});

describe("the public render while contact messages are off", () => {
  it.each([[undefined], ["false"], ["TRUE"], ["1"], ["yes"], [""]])(
    "answers an Elite site byte for byte as today with the flag %p",
    async (flag) => {
      if (flag !== undefined) process.env[CONTACT_FLAG] = flag;

      expect(await renderBody()).toBe(TODAYS_ELITE_SITE_BODY);
    }
  );
});

describe("the public render of an existing site", () => {
  it.each(EXISTING_SITE_RENDER_QUERIES)(
    "answers byte for byte as today and reads no plan with contact messages on, by %s",
    async (_label, query) => {
      process.env[CONTACT_FLAG] = "true";
      const ratePlanRepository = buildRatePlanRepository(PAID_ELITE_ROW);

      expect(await renderBody({ site: EXISTING_SITE, ratePlanRepository, query })).toBe(EXISTING_SITE_RENDER_BODY);
      expectNoPlanRead(ratePlanRepository);
    }
  );
});

describe("the public render while contact messages are on", () => {
  it.each(EXISTING_SITE_RENDER_QUERIES)(
    "tells that an Elite site accepts messages, from one plan read for the site's own host, by %s",
    async (_label, query) => {
      process.env[CONTACT_FLAG] = " true ";
      const ratePlanRepository = buildRatePlanRepository(PAID_ELITE_ROW);

      const body = await renderBody({ ratePlanRepository, query: { ...query, hostId: "host-from-request" } });

      expect(body).toBe(ELITE_SITE_BODY_WITH_CONTACT);
      expect(ratePlanRepository.findCurrentByAccountId).toHaveBeenCalledTimes(1);
      expect(ratePlanRepository.findCurrentByAccountId).toHaveBeenCalledWith(EXISTING_SITE.hostId);
      expectOnlyCurrentPlanRead(ratePlanRepository);
    }
  );

  it.each([
    ["an Essentials plan", ratePlanRow()],
    ["no plan row", null],
  ])("answers the site of a host with %s byte for byte as today", async (_label, row) => {
    process.env[CONTACT_FLAG] = "true";

    expect(await renderBody({ ratePlanRepository: buildRatePlanRepository(row) })).toBe(EXISTING_SITE_RENDER_BODY);
  });

  it("answers byte for byte as today when the plan cannot be read", async () => {
    process.env[CONTACT_FLAG] = "true";
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const ratePlanRepository = buildRatePlanRepository();
    ratePlanRepository.findCurrentByAccountId.mockRejectedValue(new Error("connection timed out"));

    expect(await renderBody({ ratePlanRepository })).toBe(EXISTING_SITE_RENDER_BODY);
  });

  it("answers byte for byte as today once the time limit passes on a plan read that does not answer", async () => {
    process.env[CONTACT_FLAG] = "true";
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const ratePlanRepository = buildRatePlanRepository();
    ratePlanRepository.findCurrentByAccountId.mockReturnValue(new Promise(() => undefined));
    const controller = buildExistingSiteController({ site: ELITE_SITE, ratePlanRepository });
    controller.websiteElitePageSettings = new WebsiteElitePageSettings(controller.directBookingWebsiteRatePlanService, {
      planReadTimeoutMs: 20,
    });

    const response = await controller.getPublicWebsiteRenderModel(renderEvent({ domain: EXISTING_DOMAIN.domain }));

    expect(response.body).toBe(EXISTING_SITE_RENDER_BODY);
  });

  it("adds nothing to a render without a payload", async () => {
    process.env[CONTACT_FLAG] = "true";
    const controller = buildExistingSiteController({
      site: ELITE_SITE,
      ratePlanRepository: buildRatePlanRepository(PAID_ELITE_ROW),
    });
    controller.buildPublicDirectBookingWebsiteRenderPayload = jest.fn(() => null);

    const response = await controller.getPublicWebsiteRenderModel(renderEvent({ domain: EXISTING_DOMAIN.domain }));

    expect(response.body).toBe("null");
  });

  it("answers a site without content overrides without the field", async () => {
    process.env[CONTACT_FLAG] = "true";
    const site = { ...EXISTING_SITE, publishedContentOverrides: null };

    const body = JSON.parse(await renderBody({ site }));

    expect(body.contentOverrides).toEqual({});
    expect(body).not.toHaveProperty("acceptsContactMessages");
  });
});
