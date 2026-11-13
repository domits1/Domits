import { jest } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PropertyController } from "../../../functions/PropertyHandler/controller/propertyController.js";
import { DirectBookingWebsiteRatePlanService } from "../../../functions/PropertyHandler/business/service/directBookingWebsiteRatePlanService.js";

const FIXTURE_PAYLOAD = JSON.parse(
  readFileSync(join(process.cwd(), "prerender", "__fixtures__", "renderPayload.json"), "utf8")
);

export const EXISTING_SITE_RENDER_BODY = readFileSync(
  join(process.cwd(), "test", "PropertyHandler", "__fixtures__", "existingSitePublicRender.json"),
  "utf8"
).trimEnd();

export const EXISTING_SITE = Object.freeze({
  ...FIXTURE_PAYLOAD.site,
  publishedPropertySnapshot: FIXTURE_PAYLOAD.propertySnapshot,
  publishedContentOverrides: FIXTURE_PAYLOAD.contentOverrides,
  publishedThemeOverrides: FIXTURE_PAYLOAD.themeOverrides,
  previewTokenHash: "",
  suspendedAt: null,
  staticPageRevision: 4,
  createdAt: 1782200000000,
  updatedAt: 1782204057102,
});

export const EXISTING_DOMAIN = Object.freeze({
  id: "domain-1",
  siteId: EXISTING_SITE.id,
  ...FIXTURE_PAYLOAD.domain,
  verificationDetails: { activationMode: "internal", domainKind: "live", routingConfigured: true },
  lastCheckedAt: 1782204057102,
  createdAt: 1782200000000,
  updatedAt: 1782204057102,
});

const CALENDAR_AVAILABILITY = Object.freeze({
  externalBlockedDates: ["2026-12-24"],
  availableDateKeys: [],
  unavailableDateKeys: ["2026-12-31"],
  hasExternalCalendarSync: true,
  syncedSourceCount: 1,
  lastSyncAt: 1782204000000,
});

const PUBLIC_HOST = Object.freeze({
  displayName: "Amara",
  profileImage: "",
  whatsapp: { isAvailable: false, phoneNumber: "", phoneNumberDigits: "" },
});

const refuseCall = (name) =>
  jest.fn(async () => {
    throw new Error(`${name} must not be called on a public read`);
  });

export const buildRatePlanRepository = (currentRow = null) => ({
  findCurrentByAccountId: jest.fn(async () => currentRow),
  findLatestByAccountId: refuseCall("findLatestByAccountId"),
  createPlan: refuseCall("createPlan"),
  updatePlanById: refuseCall("updatePlanById"),
  activatePaidPlan: refuseCall("activatePaidPlan"),
  expireSubscriptionAndCreateEssentials: refuseCall("expireSubscriptionAndCreateEssentials"),
});

export const ratePlanRow = (overrides = {}) => ({
  id: "plan-1",
  account_id: EXISTING_SITE.hostId,
  plan: "essentials",
  price_cents: 0,
  currency: "EUR",
  billing_frequency: "monthly",
  status: "ACTIVE",
  effective_from: new Date("2026-10-06T08:00:00.000Z"),
  effective_until: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  ...overrides,
});

export const PAID_ELITE_ROW = ratePlanRow({ plan: "elite", price_cents: 4300, stripe_subscription_id: "sub_1" });

export const ELITE_WITHOUT_SUBSCRIPTION_ROW = ratePlanRow({ plan: "elite" });

export const expectNoPlanRead = (ratePlanRepository) => {
  for (const method of Object.values(ratePlanRepository)) {
    expect(method).not.toHaveBeenCalled();
  }
};

export const expectOnlyCurrentPlanRead = (ratePlanRepository) => {
  for (const [name, method] of Object.entries(ratePlanRepository)) {
    if (name !== "findCurrentByAccountId") expect(method).not.toHaveBeenCalled();
  }
};

export const buildExistingSiteController = ({
  site = EXISTING_SITE,
  ratePlanRepository = buildRatePlanRepository(),
} = {}) => {
  const controller = new PropertyController();
  controller.directBookingWebsiteSiteRepository = { getSiteById: jest.fn(async () => site) };
  controller.directBookingWebsiteDomainRepository = {
    getDomainByName: jest.fn(async () => EXISTING_DOMAIN),
    listDomainsBySiteId: jest.fn(async () => [EXISTING_DOMAIN]),
  };
  controller.directBookingWebsiteEventRepository = { recordEvent: jest.fn(async () => undefined) };
  controller.propertyService = { getPublicCalendarAvailability: jest.fn(async () => CALENDAR_AVAILABILITY) };
  controller.websitePublicHostService = { loadPublicHost: jest.fn(async () => PUBLIC_HOST) };
  controller.directBookingWebsiteRatePlanService = new DirectBookingWebsiteRatePlanService(ratePlanRepository, {});
  return controller;
};

export const renderEvent = (query) => ({
  httpMethod: "GET",
  headers: {},
  queryStringParameters: query,
  requestContext: { requestId: "req-1" },
});

export const EXISTING_SITE_RENDER_QUERIES = Object.freeze([
  ["domain", { domain: EXISTING_DOMAIN.domain }],
  ["site id", { site: EXISTING_SITE.id }],
]);
