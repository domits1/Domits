import { describe, it, expect } from "@jest/globals";
import { handler } from "../../functions/PropertyHandler/index.js";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";

const HOST_DASHBOARD_RESOURCE = "/property/hostDashboard/{subResource}";
const BOOKING_ENGINE_RESOURCE = "/property/bookingEngine/{subResource}";

const withHttpMethod = (httpMethod, overrides = {}) => ({ httpMethod, ...overrides });
const withHostDashboardSubResource = (subResource) =>
  withHttpMethod("GET", { resource: HOST_DASHBOARD_RESOURCE, pathParameters: { subResource } });
const withBookingEngineSubResource = (subResource) =>
  withHttpMethod("GET", { resource: BOOKING_ENGINE_RESOURCE, pathParameters: { subResource } });

const buildCase = ({ name, controllerMethod, event, statusCode, body }) => ({
  name,
  controllerMethod,
  event,
  mockResponse: body === undefined ? { statusCode } : { statusCode, body },
  expectedStatusCode: statusCode,
  expectedBody: body,
});

const directCases = [
  buildCase({
    name: "POST request",
    controllerMethod: "create",
    event: withHttpMethod("POST"),
    statusCode: 201,
    body: "1",
  }),
  buildCase({
    name: "DELETE request",
    controllerMethod: "delete",
    event: withHttpMethod("DELETE"),
    statusCode: 200,
    body: "Deleted",
  }),
  buildCase({
    name: "DELETE property image request",
    controllerMethod: "deletePropertyImage",
    event: withHttpMethod("DELETE", { resource: "/property/images" }),
    statusCode: 204,
  }),
  buildCase({
    name: "PATCH property overview request",
    controllerMethod: "updatePropertyOverview",
    event: withHttpMethod("PATCH", { resource: "/property/overview" }),
    statusCode: 204,
  }),
  buildCase({
    name: "PATCH property calendar overrides request",
    controllerMethod: "updatePropertyCalendarOverrides",
    event: withHttpMethod("PATCH", { resource: "/property/calendar/overrides" }),
    statusCode: 200,
  }),
  buildCase({
    name: "PATCH property activation request",
    controllerMethod: "activateProperty",
    event: withHttpMethod("PATCH", { resource: "/property" }),
    statusCode: 204,
  }),
  buildCase({
    name: "GET property calendar overrides request",
    controllerMethod: "getPropertyCalendarOverrides",
    event: withHttpMethod("GET", { resource: "/property/calendar/overrides" }),
    statusCode: 200,
  }),
];

const hostDashboardCases = [
  ["all", "getFullOwnedProperties", "GET all hostDashboard properties"],
  ["single", "getFullOwnedPropertyById", "GET single hostDashboard property"],
].map(([subResource, controllerMethod, name]) =>
  buildCase({
    name,
    controllerMethod,
    event: withHostDashboardSubResource(subResource),
    statusCode: 200,
  })
);

const bookingEngineCases = [
  ["byType", "getActivePropertiesCardByType", "GET bookingEngine properties by type"],
  ["all", "getActivePropertiesCard", "GET all active properties"],
  ["byHostId", "getActivePropertiesCardByHostId", "GET properties by hostId"],
  ["set", "getActivePropertiesCardById", "GET set of properties"],
  ["listingDetails", "getFullActivePropertyById", "GET active listing details"],
].map(([subResource, controllerMethod, name]) =>
  buildCase({
    name,
    controllerMethod,
    event: withBookingEngineSubResource(subResource),
    statusCode: 200,
  })
);

const routeCases = [...directCases, ...hostDashboardCases, ...bookingEngineCases];

const notFoundCases = [
  {
    name: "unknown '/property/hostDashboard' sub-resource",
    event: withHostDashboardSubResource("unknown"),
    expectedBody: "Sub-resource for '/property/hostDashboard' not found.",
  },
  {
    name: "unknown '/property/bookingEngine' sub-resource",
    event: withBookingEngineSubResource("unknown"),
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
