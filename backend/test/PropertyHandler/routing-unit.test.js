import { describe, it, expect } from "@jest/globals";
import { handler } from "../../functions/PropertyHandler/index.js";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";

const HOST_DASHBOARD_RESOURCE = "/property/hostDashboard/{subResource}";
const BOOKING_ENGINE_RESOURCE = "/property/bookingEngine/{subResource}";

const withHttpMethod = (httpMethod, overrides = {}) => ({ httpMethod, ...overrides });

const buildEvent = ({ httpMethod, resource, subResource }) =>
  subResource === undefined
    ? withHttpMethod(httpMethod, { resource })
    : withHttpMethod(httpMethod, { resource, pathParameters: { subResource } });

const buildCase = ({ name, controllerMethod, httpMethod, resource, statusCode, body, subResource }) => ({
  name,
  controllerMethod,
  event: buildEvent({ httpMethod, resource, subResource }),
  mockResponse: body === undefined ? { statusCode } : { statusCode, body },
  expectedStatusCode: statusCode,
  expectedBody: body,
});

const directRouteSpecs = [
  ["POST request", "create", "POST", undefined, 201, "1"],
  ["DELETE request", "delete", "DELETE", undefined, 200, "Deleted"],
  ["DELETE property image request", "deletePropertyImage", "DELETE", "/property/images", 204],
  ["PATCH property overview request", "updatePropertyOverview", "PATCH", "/property/overview", 204],
  ["PATCH property calendar overrides request", "updatePropertyCalendarOverrides", "PATCH", "/property/calendar/overrides", 200],
  ["PATCH property activation request", "activateProperty", "PATCH", "/property", 204],
  ["POST website draft upsert request", "upsertWebsiteDraft", "POST", "/property/website/draft", 200],
  ["GET property calendar overrides request", "getPropertyCalendarOverrides", "GET", "/property/calendar/overrides", 200],
  ["GET public website preview request", "getWebsitePreviewByDraftId", "GET", "/property/website/preview", 200],
  ["GET website drafts request", "getWebsiteDrafts", "GET", "/property/website/drafts", 200],
  ["GET website draft by property request", "getWebsiteDraftByPropertyId", "GET", "/property/website/draft", 200],
  ["DELETE website draft request", "deleteWebsiteDraft", "DELETE", "/property/website/draft", 204],
];

const hostDashboardSpecs = [
  ["GET all hostDashboard properties", "getFullOwnedProperties", "all"],
  ["GET single hostDashboard property", "getFullOwnedPropertyById", "single"],
  ["GET hostDashboard website drafts", "getWebsiteDrafts", "websiteDrafts"],
  ["GET hostDashboard website draft by property", "getWebsiteDraftByPropertyId", "websiteDraft"],
];

const bookingEngineSpecs = [
  ["GET bookingEngine properties by type", "getActivePropertiesCardByType", "byType"],
  ["GET all active properties", "getActivePropertiesCard", "all"],
  ["GET properties by hostId", "getActivePropertiesCardByHostId", "byHostId"],
  ["GET set of properties", "getActivePropertiesCardById", "set"],
  ["GET active listing details", "getFullActivePropertyById", "listingDetails"],
];

const directCases = directRouteSpecs.map(([name, controllerMethod, httpMethod, resource, statusCode, body]) =>
  buildCase({
    name,
    controllerMethod,
    httpMethod,
    resource,
    statusCode,
    body,
  })
);

const hostDashboardCases = hostDashboardSpecs.map(([name, controllerMethod, subResource]) =>
  buildCase({
    name,
    controllerMethod,
    httpMethod: "GET",
    resource: HOST_DASHBOARD_RESOURCE,
    subResource,
    statusCode: 200,
  })
);

const bookingEngineCases = bookingEngineSpecs.map(([name, controllerMethod, subResource]) =>
  buildCase({
    name,
    controllerMethod,
    httpMethod: "GET",
    resource: BOOKING_ENGINE_RESOURCE,
    subResource,
    statusCode: 200,
  })
);

const pathFallbackSpecs = [
  buildCase({
    name: "GET all hostDashboard properties from path fallback",
    controllerMethod: "getFullOwnedProperties",
    httpMethod: "GET",
    resource: "/property/{proxy+}",
    statusCode: 200,
  }),
  buildCase({
    name: "GET all active properties from path fallback",
    controllerMethod: "getActivePropertiesCard",
    httpMethod: "GET",
    resource: "/property/{proxy+}",
    statusCode: 200,
  }),
];

const pathFallbackCases = [
  {
    testCase: pathFallbackSpecs[0],
    path: "/property/hostDashboard/all",
    proxy: "hostDashboard/all",
  },
  {
    testCase: pathFallbackSpecs[1],
    path: "/property/bookingEngine/all",
    proxy: "bookingEngine/all",
  },
].map(({ testCase, path, proxy }) => ({
  ...testCase,
  event: {
    ...testCase.event,
    path,
    pathParameters: { proxy },
  },
}));

const routeCases = [...directCases, ...hostDashboardCases, ...bookingEngineCases, ...pathFallbackCases];

const notFoundCases = [
  {
    name: "unknown '/property/hostDashboard' sub-resource",
    event: buildEvent({
      httpMethod: "GET",
      resource: HOST_DASHBOARD_RESOURCE,
      subResource: "unknown",
    }),
    expectedBody: "Sub-resource for '/property/hostDashboard' not found.",
  },
  {
    name: "unknown '/property/bookingEngine' sub-resource",
    event: buildEvent({
      httpMethod: "GET",
      resource: BOOKING_ENGINE_RESOURCE,
      subResource: "unknown",
    }),
    expectedBody: "Sub-resource for '/property/bookingEngine' not found.",
  },
  {
    name: "unknown HTTP method",
    event: withHttpMethod("PUT"),
    expectedBody: "Method not found.",
  },
  {
    name: "unknown path",
    event: withHttpMethod("GET", { resource: "some/path/that/does/not/exist", pathParameters: {} }),
    expectedBody: "Path not found.",
  },
];

describe("Routing unit tests", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(routeCases)(
    "should handle $name",
    async ({ controllerMethod, event, mockResponse, expectedStatusCode, expectedBody }) => {
      jest.spyOn(PropertyController.prototype, controllerMethod).mockResolvedValue(mockResponse);

      const response = await handler(event);

      expect(response.statusCode).toBe(expectedStatusCode);
      if (expectedBody !== undefined) {
        expect(response.body).toBe(expectedBody);
      }
    }
  );

  it.each(notFoundCases)("should return 404 for $name", async ({ event, expectedBody }) => {
    const response = await handler(event);
    expect(response.statusCode).toBe(404);
    expect(response.body).toBe(expectedBody);
  });
});
