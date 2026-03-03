import { describe, it, expect } from "@jest/globals";
import { handler } from "../../functions/PropertyHandler/index.js";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";

const routeCases = [
  {
    name: "POST request",
    controllerMethod: "create",
    event: { httpMethod: "POST" },
    mockResponse: { statusCode: 201, body: "1" },
    expectedStatusCode: 201,
  },
  {
    name: "DELETE request",
    controllerMethod: "delete",
    event: { httpMethod: "DELETE" },
    mockResponse: { statusCode: 200, body: "Deleted" },
    expectedStatusCode: 200,
    expectedBody: "Deleted",
  },
  {
    name: "DELETE property image request",
    controllerMethod: "deletePropertyImage",
    event: { httpMethod: "DELETE", resource: "/property/images" },
    mockResponse: { statusCode: 204 },
    expectedStatusCode: 204,
  },
  {
    name: "PATCH property overview request",
    controllerMethod: "updatePropertyOverview",
    event: { httpMethod: "PATCH", resource: "/property/overview" },
    mockResponse: { statusCode: 204 },
    expectedStatusCode: 204,
  },
  {
    name: "PATCH property calendar overrides request",
    controllerMethod: "updatePropertyCalendarOverrides",
    event: { httpMethod: "PATCH", resource: "/property/calendar/overrides" },
    mockResponse: { statusCode: 200 },
    expectedStatusCode: 200,
  },
  {
    name: "PATCH property activation request",
    controllerMethod: "activateProperty",
    event: { httpMethod: "PATCH", resource: "/property" },
    mockResponse: { statusCode: 204 },
    expectedStatusCode: 204,
  },
  {
    name: "GET all hostDashboard properties",
    controllerMethod: "getFullOwnedProperties",
    event: {
      httpMethod: "GET",
      resource: "/property/hostDashboard/{subResource}",
      pathParameters: { subResource: "all" },
    },
    mockResponse: { statusCode: 200 },
    expectedStatusCode: 200,
  },
  {
    name: "GET property calendar overrides",
    controllerMethod: "getPropertyCalendarOverrides",
    event: { httpMethod: "GET", resource: "/property/calendar/overrides" },
    mockResponse: { statusCode: 200 },
    expectedStatusCode: 200,
  },
  {
    name: "GET single hostDashboard property",
    controllerMethod: "getFullOwnedPropertyById",
    event: {
      httpMethod: "GET",
      resource: "/property/hostDashboard/{subResource}",
      pathParameters: { subResource: "single" },
    },
    mockResponse: { statusCode: 200 },
    expectedStatusCode: 200,
  },
  {
    name: "GET bookingEngine properties by type",
    controllerMethod: "getActivePropertiesCardByType",
    event: {
      httpMethod: "GET",
      resource: "/property/bookingEngine/{subResource}",
      pathParameters: { subResource: "byType" },
    },
    mockResponse: { statusCode: 200 },
    expectedStatusCode: 200,
  },
  {
    name: "GET all active properties",
    controllerMethod: "getActivePropertiesCard",
    event: {
      httpMethod: "GET",
      resource: "/property/bookingEngine/{subResource}",
      pathParameters: { subResource: "all" },
    },
    mockResponse: { statusCode: 200 },
    expectedStatusCode: 200,
  },
  {
    name: "GET properties by hostId",
    controllerMethod: "getActivePropertiesCardByHostId",
    event: {
      httpMethod: "GET",
      resource: "/property/bookingEngine/{subResource}",
      pathParameters: { subResource: "byHostId" },
    },
    mockResponse: { statusCode: 200 },
    expectedStatusCode: 200,
  },
  {
    name: "GET set of properties",
    controllerMethod: "getActivePropertiesCardById",
    event: {
      httpMethod: "GET",
      resource: "/property/bookingEngine/{subResource}",
      pathParameters: { subResource: "set" },
    },
    mockResponse: { statusCode: 200 },
    expectedStatusCode: 200,
  },
  {
    name: "GET active listing details",
    controllerMethod: "getFullActivePropertyById",
    event: {
      httpMethod: "GET",
      resource: "/property/bookingEngine/{subResource}",
      pathParameters: { subResource: "listingDetails" },
    },
    mockResponse: { statusCode: 200 },
    expectedStatusCode: 200,
  },
];

describe("Routing unit tests", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(routeCases)("should handle $name", async ({ controllerMethod, event, mockResponse, expectedStatusCode, expectedBody }) => {
    jest.spyOn(PropertyController.prototype, controllerMethod).mockResolvedValue(mockResponse);

    const response = await handler(event);

    expect(response.statusCode).toBe(expectedStatusCode);
    if (expectedBody !== undefined) {
      expect(response.body).toBe(expectedBody);
    }
  });

  it("should return 404 for unknown '/property/hostDashboard' sub-resource", async () => {
    const event = {
      httpMethod: "GET",
      resource: "/property/hostDashboard/{subResource}",
      pathParameters: { subResource: "unknown" },
    };
    const response = await handler(event);
    expect(response.statusCode).toBe(404);
    expect(response.body).toBe("Sub-resource for '/property/hostDashboard' not found.");
  });

  it("should return 404 for unknown '/property/bookingEngine' sub-resource", async () => {
    const event = {
      httpMethod: "GET",
      resource: "/property/bookingEngine/{subResource}",
      pathParameters: { subResource: "unknown" },
    };
    const response = await handler(event);
    expect(response.statusCode).toBe(404);
    expect(response.body).toBe("Sub-resource for '/property/bookingEngine' not found.");
  });

  it("should return 404 for unknown HTTP method", async () => {
    const event = { httpMethod: "PUT" };
    const response = await handler(event);
    expect(response.statusCode).toBe(404);
    expect(response.body).toBe("Method not found.");
  });

  it("should return 404 for unknown path", async () => {
    const event = { httpMethod: "GET", resource: "some/path/that/does/not/exist", pathParameters: {} };
    const response = await handler(event);
    expect(response.statusCode).toBe(404);
    expect(response.body).toBe("Path not found.");
  });
});
