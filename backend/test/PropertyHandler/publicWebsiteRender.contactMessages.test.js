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

      expect(body).toBe(`${TODAYS_ELITE_SITE_BODY.slice(0, -1)},"acceptsContactMessages":true}`);
      expect(ratePlanRepository.findCurrentByAccountId).toHaveBeenCalledTimes(1);
      expect(ratePlanRepository.findCurrentByAccountId).toHaveBeenCalledWith(EXISTING_SITE.hostId);
      expectOnlyCurrentPlanRead(ratePlanRepository);
    }
  );

  it.each([
    ["an Essentials plan", () => buildRatePlanRepository(ratePlanRow())],
    ["no plan row", () => buildRatePlanRepository(null)],
    [
      "a plan read that fails",
      () => ({
        ...buildRatePlanRepository(),
        findCurrentByAccountId: jest.fn().mockRejectedValue(new Error("timed out")),
      }),
    ],
  ])("answers the site of a host with %s byte for byte as today", async (_label, buildRepository) => {
    process.env[CONTACT_FLAG] = "true";
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await renderBody({ ratePlanRepository: buildRepository() })).toBe(EXISTING_SITE_RENDER_BODY);
  });

  it("answers a site without content overrides without the field", async () => {
    process.env[CONTACT_FLAG] = "true";
    const site = { ...EXISTING_SITE, publishedContentOverrides: null };

    const body = JSON.parse(await renderBody({ site }));

    expect(body.contentOverrides).toEqual({});
    expect(body).not.toHaveProperty("acceptsContactMessages");
  });
});

describe("the render answer builder", () => {
  const build = (domain, siteProperties) => {
    const overrides = ELITE_SITE.publishedContentOverrides;
    const args = [ELITE_SITE, domain, undefined, null, null, overrides, siteProperties, true];
    return buildExistingSiteController().buildPublicDirectBookingWebsiteRenderPayload(...args);
  };

  it("keeps the served properties next to the field", () => {
    const siteProperties = [{ propertyId: "property-1", slug: "villa-one", isMainProperty: true }];

    expect(build(EXISTING_DOMAIN, siteProperties)).toMatchObject({ siteProperties, acceptsContactMessages: true });
  });

  it("answers nothing without a resolution, even with the field on", () => {
    expect(build(null, [])).toBeNull();
  });
});
