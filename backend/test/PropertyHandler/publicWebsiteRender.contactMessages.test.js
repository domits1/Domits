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
