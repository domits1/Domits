import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import {
  DirectBookingWebsiteRatePlanService,
  getWebsiteEntitlements,
} from "../../functions/PropertyHandler/business/service/directBookingWebsiteRatePlanService.js";
import { Unauthorized } from "../../functions/PropertyHandler/util/exception/Unauthorized.js";
import { buildRatePlanRepository, expectNoPlanRead, ratePlanRow } from "./support/existingSiteRender.js";

const TOKEN_HOST_ID = "host-from-token";

const buildController = (ratePlanRepository, authorize = async () => TOKEN_HOST_ID) => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  const controller = new PropertyController();
  controller.authManager = { authorizeGroupRequest: jest.fn(authorize) };
  controller.directBookingWebsiteRatePlanService = new DirectBookingWebsiteRatePlanService(ratePlanRepository, {});
  return controller;
};

const getEvent = (queryStringParameters) => ({
  httpMethod: "GET",
  headers: { Authorization: "token" },
  queryStringParameters,
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("GET /property/website/rate-plan?view=entitlements", () => {
  it("answers Essentials for a host without a plan row, for the token's host, and writes no plan row", async () => {
    const ratePlanRepository = buildRatePlanRepository(null);

    const response = await buildController(ratePlanRepository).getWebsiteRatePlan(
      getEvent({ view: "entitlements", accountId: "other-host", hostId: "other-host" })
    );

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      plan: "essentials",
      entitlements: getWebsiteEntitlements("essentials"),
      effectiveUntil: null,
    });
    expect(ratePlanRepository.findCurrentByAccountId).toHaveBeenCalledWith(TOKEN_HOST_ID);
    expect(ratePlanRepository.createPlan).not.toHaveBeenCalled();
  });

  it("answers an Elite plan whose end date is still ahead with its end date", async () => {
    const effectiveUntil = new Date(Date.now() + 86_400_000);
    const ratePlanRepository = buildRatePlanRepository(ratePlanRow({ plan: "elite", effective_until: effectiveUntil }));

    const response = await buildController(ratePlanRepository).getWebsiteRatePlan(getEvent({ view: "entitlements" }));

    expect(JSON.parse(response.body)).toEqual({
      plan: "elite",
      entitlements: getWebsiteEntitlements("elite"),
      effectiveUntil: effectiveUntil.toISOString(),
    });
  });

  it("answers 401 without reading a plan when the login fails", async () => {
    const ratePlanRepository = buildRatePlanRepository(null);
    const controller = buildController(ratePlanRepository, async () => {
      throw new Unauthorized("You must be logged in.");
    });

    const response = await controller.getWebsiteRatePlan(getEvent({ view: "entitlements" }));

    expect(response.statusCode).toBe(401);
    expectNoPlanRead(ratePlanRepository);
  });

  it("answers 503 when the rate plan table is missing", async () => {
    const ratePlanRepository = buildRatePlanRepository(null);
    ratePlanRepository.findCurrentByAccountId.mockRejectedValue(
      Object.assign(new Error('relation "main.direct_booking_website_rate_plans" does not exist'), { code: "42P01" })
    );

    const response = await buildController(ratePlanRepository).getWebsiteRatePlan(getEvent({ view: "entitlements" }));

    expect(response.statusCode).toBe(503);
  });
});

describe("GET /property/website/rate-plan without the entitlements view", () => {
  it.each([
    ["no query", null],
    ["another view", { view: "plan" }],
  ])("still answers the full plan and provisions Essentials as before, with %s", async (_label, query) => {
    const ratePlanRepository = {
      ...buildRatePlanRepository(null),
      findLatestByAccountId: jest.fn(async () => null),
      createPlan: jest.fn(async (values) => ratePlanRow({ ...values, id: "plan-created" })),
    };

    const response = await buildController(ratePlanRepository).getWebsiteRatePlan(getEvent(query));

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({ id: "plan-created", plan: "essentials", priceCents: 0 });
    expect(ratePlanRepository.createPlan).toHaveBeenCalledTimes(1);
  });
});
