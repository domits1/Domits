const ChannexProviderClient = require("../.shared/channelManagement/providers/channex/providerClient.js").default;

const originalFetch = global.fetch;
const CREDENTIALS = { apiKey: "test-api-key" };

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

describe("ChannexProviderClient discovery reads", () => {
  let client;

  beforeEach(() => {
    client = new ChannexProviderClient();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("missing apiKey short-circuits before any request", () => {
    it.each([
      {
        method: "validateApiKey",
        call: (c) => c.validateApiKey({}),
        emptyField: "externalAccountId",
        emptyValue: null,
      },
      { method: "listProperties", call: (c) => c.listProperties({}), emptyField: "properties", emptyValue: [] },
      {
        method: "listRoomTypes",
        call: (c) => c.listRoomTypes({}, "room-type-1"),
        emptyField: "roomTypes",
        emptyValue: [],
      },
      {
        method: "listRatePlans",
        call: (c) => c.listRatePlans({}, "rate-plan-1"),
        emptyField: "ratePlans",
        emptyValue: [],
      },
    ])("$method returns INVALID_CREDENTIALS without calling fetch", async ({ call, emptyField, emptyValue }) => {
      const result = await call(client);

      expect(result).toMatchObject({
        success: false,
        providerStatus: "INVALID_CREDENTIALS",
        errorCode: "MISSING_API_KEY",
        [emptyField]: emptyValue,
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("missing required identifier short-circuits before any request", () => {
    it.each([
      { method: "listRoomTypes", call: (c) => c.listRoomTypes(CREDENTIALS, ""), errorCode: "MISSING_PROPERTY_ID" },
      { method: "listRatePlans", call: (c) => c.listRatePlans(CREDENTIALS, ""), errorCode: "MISSING_ROOM_TYPE_ID" },
    ])("$method returns INVALID_REQUEST without calling fetch", async ({ call, errorCode }) => {
      const result = await call(client);

      expect(result).toMatchObject({ success: false, providerStatus: "INVALID_REQUEST", errorCode });
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("non-2xx responses map to the correct providerStatus and fallback error code", () => {
    it.each([
      {
        method: "validateApiKey",
        call: (c) => c.validateApiKey(CREDENTIALS),
        status: 500,
        fallbackStatus: "VALIDATION_FAILED",
        errorCodePrefix: "CHANNEX_VALIDATE_",
      },
      {
        method: "validateApiKey",
        call: (c) => c.validateApiKey(CREDENTIALS),
        status: 401,
        fallbackStatus: "UNAUTHORIZED",
        errorCodePrefix: "CHANNEX_VALIDATE_",
      },
      {
        method: "listProperties",
        call: (c) => c.listProperties(CREDENTIALS),
        status: 500,
        fallbackStatus: "PROPERTY_LIST_FAILED",
        errorCodePrefix: "CHANNEX_PROPERTIES_",
      },
      {
        method: "listProperties",
        call: (c) => c.listProperties(CREDENTIALS),
        status: 401,
        fallbackStatus: "UNAUTHORIZED",
        errorCodePrefix: "CHANNEX_PROPERTIES_",
      },
      {
        method: "listRoomTypes",
        call: (c) => c.listRoomTypes(CREDENTIALS, "property-1"),
        status: 500,
        fallbackStatus: "ROOM_TYPE_LIST_FAILED",
        errorCodePrefix: "CHANNEX_ROOM_TYPES_",
      },
      {
        method: "listRoomTypes",
        call: (c) => c.listRoomTypes(CREDENTIALS, "property-1"),
        status: 401,
        fallbackStatus: "UNAUTHORIZED",
        errorCodePrefix: "CHANNEX_ROOM_TYPES_",
      },
      {
        method: "listRatePlans",
        call: (c) => c.listRatePlans(CREDENTIALS, "room-type-1"),
        status: 500,
        fallbackStatus: "RATE_PLAN_LIST_FAILED",
        errorCodePrefix: "CHANNEX_RATE_PLANS_",
      },
      {
        method: "listRatePlans",
        call: (c) => c.listRatePlans(CREDENTIALS, "room-type-1"),
        status: 401,
        fallbackStatus: "UNAUTHORIZED",
        errorCodePrefix: "CHANNEX_RATE_PLANS_",
      },
    ])(
      "$method with status $status returns $fallbackStatus",
      async ({ call, status, fallbackStatus, errorCodePrefix }) => {
        global.fetch.mockResolvedValue(jsonResponse(status, {}));

        const result = await call(client);

        expect(result.success).toBe(false);
        expect(result.providerStatus).toBe(fallbackStatus);
        expect(result.errorCode).toBe(`${errorCodePrefix}${status}`);
      }
    );

    test("a Channex-provided errors.code takes priority over the fallback template", async () => {
      global.fetch.mockResolvedValue(
        jsonResponse(422, { errors: { code: "DUPLICATE_ROOM_TYPE", title: "Already linked." } })
      );

      const result = await client.listProperties(CREDENTIALS);

      expect(result.errorCode).toBe("DUPLICATE_ROOM_TYPE");
      expect(result.errorMessage).toBe("Already linked.");
    });

    test("a Channex-provided error.code is used when errors.code is absent", async () => {
      global.fetch.mockResolvedValue(
        jsonResponse(422, { error: { code: "PLAN_LOCKED", message: "Rate plan is locked." } })
      );

      const result = await client.listProperties(CREDENTIALS);

      expect(result.errorCode).toBe("PLAN_LOCKED");
      expect(result.errorMessage).toBe("Rate plan is locked.");
    });
  });

  describe("fetch throwing maps to a request-failed result", () => {
    // error?.code || error?.name || <requestFailedCode> - a standard Error's `.name` ("Error",
    // "TypeError", "AbortError", ...) is always truthy, so it wins before the method-specific
    // fallback code is ever reached. That fallback is only reachable for a thrown non-Error value.
    it.each([
      { method: "validateApiKey", call: (c) => c.validateApiKey(CREDENTIALS), providerStatus: "VALIDATION_FAILED" },
      {
        method: "listProperties",
        call: (c) => c.listProperties(CREDENTIALS),
        providerStatus: "PROPERTY_LIST_FAILED",
      },
      {
        method: "listRoomTypes",
        call: (c) => c.listRoomTypes(CREDENTIALS, "property-1"),
        providerStatus: "ROOM_TYPE_LIST_FAILED",
      },
      {
        method: "listRatePlans",
        call: (c) => c.listRatePlans(CREDENTIALS, "room-type-1"),
        providerStatus: "RATE_PLAN_LIST_FAILED",
      },
    ])(
      "$method returns $providerStatus and the error's own name when the request throws",
      async ({ call, providerStatus }) => {
        global.fetch.mockRejectedValue(new Error("network down"));

        const result = await call(client);

        expect(result.success).toBe(false);
        expect(result.providerStatus).toBe(providerStatus);
        expect(result.errorCode).toBe("Error");
        expect(result.errorMessage).toBe("network down");
      }
    );

    test("falls back to the method-specific request-failed code when the thrown value has no code or name", async () => {
      const bareError = new Error("network down");
      bareError.name = undefined;
      global.fetch.mockRejectedValue(bareError);

      const result = await client.listProperties(CREDENTIALS);

      expect(result.errorCode).toBe("CHANNEX_PROPERTY_LIST_REQUEST_FAILED");
    });
  });

  describe("validateApiKey", () => {
    test("requests GET /api/v1/properties with the api key header", async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { data: [{ id: "ext-property-1" }] }));

      await client.validateApiKey(CREDENTIALS);

      const [url, init] = global.fetch.mock.calls[0];
      expect(url.toString()).toBe("https://staging.channex.io/api/v1/properties");
      expect(init.method).toBe("GET");
      expect(init.headers).toMatchObject({
        "user-api-key": "test-api-key",
        "Content-Type": "application/json",
      });
    });

    test("maps the first returned property to externalAccountId", async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { data: [{ id: "ext-property-1" }, { id: "ext-property-2" }] }));

      const result = await client.validateApiKey(CREDENTIALS);

      expect(result).toMatchObject({
        success: true,
        canValidate: true,
        externalAccountId: "ext-property-1",
        providerStatus: "ACTIVE",
      });
    });

    // Unlike listProperties, validateApiKey never checks that parsed.data is an array before
    // reading data[0].id, so a malformed 200 response still reports success with a null id
    // instead of INVALID_RESPONSE. Pinning this asymmetry rather than assuming it away.
    test("succeeds with a null externalAccountId when the response body has no usable data array", async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { unexpected: "shape" }));

      const result = await client.validateApiKey(CREDENTIALS);

      expect(result).toMatchObject({ success: true, externalAccountId: null, providerStatus: "ACTIVE" });
    });
  });

  describe("listProperties", () => {
    test("requests GET /api/v1/properties", async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { data: [] }));

      await client.listProperties(CREDENTIALS);

      const [url] = global.fetch.mock.calls[0];
      expect(url.toString()).toBe("https://staging.channex.io/api/v1/properties");
    });

    test("maps rows to externalPropertyId/Name/status, dropping rows without an id", async () => {
      global.fetch.mockResolvedValue(
        jsonResponse(200, {
          data: [
            { id: "ext-property-1", attributes: { title: "Beach House", state: "active" } },
            { id: "ext-property-2", attributes: { name: "Fallback Name" } },
            { attributes: { title: "No id, dropped" } },
          ],
        })
      );

      const result = await client.listProperties(CREDENTIALS);

      expect(result.properties).toEqual([
        { externalPropertyId: "ext-property-1", externalPropertyName: "Beach House", propertyStatus: "active" },
        { externalPropertyId: "ext-property-2", externalPropertyName: "Fallback Name", propertyStatus: null },
      ]);
    });

    test("returns INVALID_RESPONSE when the response has no usable data array", async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { unexpected: "shape" }));

      const result = await client.listProperties(CREDENTIALS);

      expect(result).toMatchObject({
        success: false,
        properties: [],
        providerStatus: "INVALID_RESPONSE",
        errorCode: "CHANNEX_PROPERTIES_INVALID_RESPONSE",
      });
    });
  });

  describe("listRoomTypes", () => {
    test("requests GET /api/v1/room_types filtered by property id", async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { data: [] }));

      await client.listRoomTypes(CREDENTIALS, "property-1");

      const [url] = global.fetch.mock.calls[0];
      expect(url.toString()).toBe("https://staging.channex.io/api/v1/room_types?filter%5Bproperty_id%5D=property-1");
    });

    test("maps rows to externalRoomTypeId/Name/status, dropping rows without an id", async () => {
      global.fetch.mockResolvedValue(
        jsonResponse(200, {
          data: [
            { id: "ext-room-1", attributes: { title: "Double Room", state: "active", count_of_rooms: 3 } },
            { attributes: { title: "No id, dropped" } },
          ],
        })
      );

      const result = await client.listRoomTypes(CREDENTIALS, "property-1");

      expect(result.roomTypes).toEqual([
        {
          externalRoomTypeId: "ext-room-1",
          externalRoomTypeName: "Double Room",
          roomTypeStatus: "active",
          countOfRooms: 3,
        },
      ]);
    });

    describe("countOfRooms normalization", () => {
      it.each([
        { description: "reads count_of_rooms", attributes: { count_of_rooms: 3 }, expected: 3 },
        { description: "falls back to countOfRooms", attributes: { countOfRooms: 4 }, expected: 4 },
        { description: "falls back to count", attributes: { count: 5 }, expected: 5 },
        { description: "rejects a negative value", attributes: { count_of_rooms: -1 }, expected: null },
        { description: "rejects a non-numeric value", attributes: { count_of_rooms: "many" }, expected: null },
        { description: "truncates a fractional value", attributes: { count_of_rooms: 2.9 }, expected: 2 },
        { description: "is null when absent", attributes: {}, expected: null },
      ])("$description", async ({ attributes, expected }) => {
        global.fetch.mockResolvedValue(jsonResponse(200, { data: [{ id: "ext-room-1", attributes }] }));

        const result = await client.listRoomTypes(CREDENTIALS, "property-1");

        expect(result.roomTypes[0].countOfRooms).toBe(expected);
      });
    });

    test("returns INVALID_RESPONSE when the response has no usable data array", async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { unexpected: "shape" }));

      const result = await client.listRoomTypes(CREDENTIALS, "property-1");

      expect(result).toMatchObject({
        success: false,
        roomTypes: [],
        providerStatus: "INVALID_RESPONSE",
        errorCode: "CHANNEX_ROOM_TYPES_INVALID_RESPONSE",
      });
    });
  });

  describe("listRatePlans", () => {
    test("requests GET /api/v1/rate_plans filtered by room type id", async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { data: [] }));

      await client.listRatePlans(CREDENTIALS, "room-type-1");

      const [url] = global.fetch.mock.calls[0];
      expect(url.toString()).toBe("https://staging.channex.io/api/v1/rate_plans?filter%5Broom_type_id%5D=room-type-1");
    });

    test("maps rows to externalRatePlanId/Name/status, dropping rows without an id", async () => {
      global.fetch.mockResolvedValue(
        jsonResponse(200, {
          data: [
            { id: "ext-rate-1", attributes: { title: "Standard Rate", state: "active" } },
            { attributes: { title: "No id, dropped" } },
          ],
        })
      );

      const result = await client.listRatePlans(CREDENTIALS, "room-type-1");

      expect(result.ratePlans).toEqual([
        { externalRatePlanId: "ext-rate-1", externalRatePlanName: "Standard Rate", ratePlanStatus: "active" },
      ]);
    });

    test("returns INVALID_RESPONSE when the response has no usable data array", async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { unexpected: "shape" }));

      const result = await client.listRatePlans(CREDENTIALS, "room-type-1");

      expect(result).toMatchObject({
        success: false,
        ratePlans: [],
        providerStatus: "INVALID_RESPONSE",
        errorCode: "CHANNEX_RATE_PLANS_INVALID_RESPONSE",
      });
    });
  });
});
