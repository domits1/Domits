jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./integrationService.secretsManagerMock.js"),
  { virtual: true }
);

jest.mock("../ORM/index.js", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

const Database = require("../ORM/index.js").default;
const IntegrationService = require("./integrationService.js").default;
const CHANNEX_FULL_CERTIFICATION_PROVIDER_REQUEST_TIMEOUT_MS = 8000;
const CHANNEX_FULL_CERTIFICATION_SYNC_VERSION = "full-sync-v1";
const CHANNEX_CERTIFICATION_MAX_AVAILABILITY = 1;

const buildDatabaseClient = ({
  availabilityRestrictions = [
    {
      id: "restriction-min",
      property_id: "domits-property-1",
      restriction: "MinimumStay",
      value: 2,
    },
    {
      id: "restriction-max",
      property_id: "domits-property-1",
      restriction: "MaximumStay",
      value: 9,
    },
  ],
  availabilityWindows = [
    {
      property_id: "domits-property-1",
      availablestartdate: 20260501,
      availableenddate: 20260502,
    },
  ],
  calendarOverrides = [
    {
      property_id: "domits-property-1",
      calendar_date: 20260501,
      is_available: true,
      nightly_price: 123,
      stop_sell: true,
      closed_to_arrival: true,
      closed_to_departure: false,
      min_stay: 4,
      max_stay: 0,
      updated_at: 1,
    },
  ],
  pricing = [
    {
      property_id: "domits-property-1",
      roomrate: 100,
      cleaning: 0,
      weekendrate: 120,
    },
  ],
} = {}) => ({
  options: { schema: "main" },
  query: jest.fn(async (sql) => {
    const query = String(sql || "");

    if (query.includes("information_schema.columns")) {
      return [{ column_name: "weekendrate" }];
    }

    if (query.includes("property_availabilityrestriction")) {
      return availabilityRestrictions;
    }

    if (query.includes("property_availability")) {
      return availabilityWindows;
    }

    if (query.includes("property_calendar_override")) {
      return calendarOverrides;
    }

    if (query.includes("property_pricing")) {
      return pricing;
    }

    return [];
  }),
});

const buildReadyAriTargets = (overrides = {}) => ({
  statusCode: 200,
  response: {
    channel: "CHANNEX",
    integrationAccountId: "integration-account-1",
    domitsPropertyId: "domits-property-1",
    ready: true,
    missingMappings: [],
    propertyMapping: {
      domitsPropertyId: "domits-property-1",
      externalPropertyId: "external-property-1",
      status: "ACTIVE",
    },
    roomTypeMappings: [
      {
        domitsPropertyId: "domits-property-1",
        externalPropertyId: "external-property-1",
        externalRoomTypeId: "room-type-1",
        status: "ACTIVE",
      },
    ],
    ratePlanMappings: [
      {
        domitsPropertyId: "domits-property-1",
        externalPropertyId: "external-property-1",
        externalRoomTypeId: "room-type-1",
        externalRatePlanId: "rate-plan-1",
        status: "ACTIVE",
      },
    ],
    ...overrides,
  },
});

const buildCertificationAriTargets = () =>
  buildReadyAriTargets({
    roomTypeMappings: [
      {
        domitsPropertyId: "domits-property-1",
        externalPropertyId: "external-property-1",
        externalRoomTypeId: "room-type-twin",
        externalRoomTypeName: "Twin Room",
        status: "ACTIVE",
      },
      {
        domitsPropertyId: "domits-property-1",
        externalPropertyId: "external-property-1",
        externalRoomTypeId: "room-type-double",
        externalRoomTypeName: "Double Room",
        status: "ACTIVE",
      },
    ],
    ratePlanMappings: [
      {
        domitsPropertyId: "domits-property-1",
        externalPropertyId: "external-property-1",
        externalRoomTypeId: "room-type-twin",
        externalRatePlanId: "rate-plan-twin-bar",
        externalRatePlanName: "Best Available Rate",
        status: "ACTIVE",
      },
      {
        domitsPropertyId: "domits-property-1",
        externalPropertyId: "external-property-1",
        externalRoomTypeId: "room-type-twin",
        externalRatePlanId: "rate-plan-twin-bb",
        externalRatePlanName: "Bed & Breakfast Rate",
        status: "ACTIVE",
      },
      {
        domitsPropertyId: "domits-property-1",
        externalPropertyId: "external-property-1",
        externalRoomTypeId: "room-type-double",
        externalRatePlanId: "rate-plan-double-bar",
        externalRatePlanName: "Best Available Rate",
        status: "ACTIVE",
      },
      {
        domitsPropertyId: "domits-property-1",
        externalPropertyId: "external-property-1",
        externalRoomTypeId: "room-type-double",
        externalRatePlanId: "rate-plan-double-bb",
        externalRatePlanName: "Bed & Breakfast Rate",
        status: "ACTIVE",
      },
    ],
  });

const createService = (overrides = {}) => {
  const service = new IntegrationService({
    accounts: {
      findByUserIdAndChannel: jest.fn().mockResolvedValue({
        id: "integration-account-1",
        status: "CONNECTED",
        credentialsRef: "channex-secret-1",
      }),
    },
    props: {},
    ratePlans: {},
    roomTypes: {},
    sync: {},
    resLinks: {},
    channexEvidence: {},
    channexBookingRevisions: {},
    runner: {},
    credentialStore: {},
    holiduCredentialStore: {},
    holiduProviderClient: {},
    channexCredentialStore: {
      readSecretOrNull: jest.fn().mockResolvedValue({ apiKey: "secret" }),
    },
    channexProviderClient: {
      pushAvailability: jest.fn().mockResolvedValue({ results: [] }),
      pushRestrictions: jest.fn().mockResolvedValue({ results: [] }),
    },
    ...overrides,
  });

  jest.spyOn(service, "getChannexAriTargets").mockResolvedValue(buildReadyAriTargets());
  return service;
};

const createSuccessfulRestrictionsPush = () =>
  jest.fn(async (_secret, payloads) => ({
    success: true,
    results: payloads.map((payload, index) => ({
      externalPropertyId: payload.externalPropertyId,
      externalRoomTypeId: payload.externalRoomTypeId,
      externalRoomTypeIds: payload.externalRoomTypeIds,
      externalRatePlanId: payload.externalRatePlanId,
      externalRatePlanIds: payload.externalRatePlanIds,
      requestBody: { values: payload.values },
      providerStatus: "SYNCED",
      httpStatus: 202,
      success: true,
      taskId: `task-restrictions-${index + 1}`,
      warnings: [],
      errorCode: null,
      errorMessage: null,
    })),
  }));

const createSuccessfulAvailabilityPush = () =>
  jest.fn(async (_secret, payloads) => ({
    success: true,
    results: payloads.map((payload, index) => ({
      externalPropertyId: payload.externalPropertyId,
      externalRoomTypeId: payload.externalRoomTypeId,
      externalRoomTypeIds: payload.externalRoomTypeIds,
      requestBody: { values: payload.values },
      providerStatus: "SYNCED",
      httpStatus: 202,
      success: true,
      taskId: `task-availability-${index + 1}`,
      warnings: [],
      errorCode: null,
      errorMessage: null,
    })),
  }));

const expectValidChannexRestrictionProviderValues = (payloads) => {
  for (const payload of Array.isArray(payloads) ? payloads : []) {
    for (const value of Array.isArray(payload?.values) ? payload.values : []) {
      Object.entries(value).forEach(([field, fieldValue]) => {
        expect(fieldValue).not.toBeNull();
        expect(fieldValue).not.toBeUndefined();
        expect(fieldValue).not.toBe("");
      });
      if (Object.hasOwn(value, "rate")) {
        expect(Number(value.rate)).toBeGreaterThan(0);
      }
      if (Object.hasOwn(value, "min_stay_through")) {
        expect(Number.isInteger(value.min_stay_through)).toBe(true);
        expect(value.min_stay_through).toBeGreaterThanOrEqual(1);
      }
      if (Object.hasOwn(value, "max_stay")) {
        expect(Number.isInteger(value.max_stay)).toBe(true);
        expect(value.max_stay).toBeGreaterThanOrEqual(1);
      }
      ["stop_sell", "closed_to_arrival", "closed_to_departure"].forEach((field) => {
        if (Object.hasOwn(value, field)) {
          expect(typeof value[field]).toBe("boolean");
        }
      });
    }
  }
};

describe("IntegrationService Channex ARI restriction mapping", () => {
  beforeEach(() => {
    Database.getInstance.mockResolvedValue(buildDatabaseClient());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("preview payloads prefer date-level calendar restrictions over global stay restrictions", async () => {
    const service = createService();

    const result = await service.previewChannexAriPayloads(
      "user-1",
      "domits-property-1",
      "2026-05-01",
      "2026-05-02"
    );

    expect(result.statusCode).toBe(200);
    const [payloadGroup] = result.response.restrictionRatePayloadPreview.groupedPayloads;

    expect(payloadGroup.values[0]).toEqual(
      expect.objectContaining({
        date: "2026-05-01",
        rate: "123.00",
        stop_sell: true,
        closed_to_arrival: true,
        closed_to_departure: false,
        min_stay_through: 4,
      })
    );
    expect(payloadGroup.values[0]).not.toHaveProperty("max_stay");

    expect(payloadGroup.values[1]).toEqual(
      expect.objectContaining({
        date: "2026-05-02",
        rate: "120.00",
        min_stay_through: 2,
        max_stay: 9,
      })
    );
    expect(result.response.sourceSummary.supportedChannexRestrictionFields).toEqual([
      "closed_to_arrival",
      "closed_to_departure",
      "max_stay",
      "min_stay_through",
      "stop_sell",
    ]);
  });

  test("payload preview small range works without pagination for internal callers", async () => {
    const service = createService();

    const result = await service.previewChannexAriPayloads(
      "user-1",
      "domits-property-1",
      "2026-05-01",
      "2026-05-02"
    );

    expect(result.statusCode).toBe(200);
    expect(result.response.pagination).toBeNull();
    expect(result.response.availabilityPayloadPreview.items).toHaveLength(2);
    expect(result.response.restrictionRatePayloadPreview.items).toHaveLength(2);
  });

  test("paginated payload preview returns the first page for a large requested range", async () => {
    const service = createService();

    const result = await service.previewChannexAriPayloads(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2027-10-06",
      { paginate: true }
    );

    expect(result.statusCode).toBe(200);
    expect(result.response.dateFrom).toBe("2026-05-24");
    expect(result.response.dateTo).toBe("2027-10-06");
    expect(result.response.pagination).toEqual(
      expect.objectContaining({
        requestedDateFrom: "2026-05-24",
        requestedDateTo: "2027-10-06",
        pageDateFrom: "2026-05-24",
        pageDateTo: "2026-06-22",
        pageSizeDays: 30,
        loadedDays: 30,
        totalRequestedDays: 501,
        hasNextPage: true,
        nextPageDateFrom: "2026-06-23",
        hasPreviousPage: false,
        previousPageDateFrom: null,
      })
    );
    expect(result.response.availabilityPayloadPreview.items).toHaveLength(30);
    expect(result.response.restrictionRatePayloadPreview.items).toHaveLength(30);
  });

  test("paginated payload preview can fetch a later page with a date cursor", async () => {
    const service = createService();

    const result = await service.previewChannexAriPayloads(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2027-10-06",
      { paginate: true, pageDateFrom: "2026-06-23" }
    );

    expect(result.statusCode).toBe(200);
    expect(result.response.pagination).toEqual(
      expect.objectContaining({
        pageDateFrom: "2026-06-23",
        pageDateTo: "2026-07-22",
        hasNextPage: true,
        nextPageDateFrom: "2026-07-23",
        hasPreviousPage: true,
        previousPageDateFrom: "2026-05-24",
      })
    );
    expect(result.response.availabilityPayloadPreview.items[0]).toEqual(
      expect.objectContaining({ date: "2026-06-23" })
    );
    expect(result.response.availabilityPayloadPreview.items.at(-1)).toEqual(
      expect.objectContaining({ date: "2026-07-22" })
    );
  });

  test("paginated payload preview rejects ranges beyond the supported certification span", async () => {
    const service = createService();

    const result = await service.previewChannexAriPayloads(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2027-10-07",
      { paginate: true }
    );

    expect(result).toEqual({
      statusCode: 400,
      response: expect.objectContaining({
        error: "Requested Channex ARI payload preview range is too large.",
        errorCode: "CHANNEX_ARI_PAYLOAD_PREVIEW_RANGE_TOO_LARGE",
      }),
    });
  });

  test("paginated payload preview rejects invalid pageSizeDays", async () => {
    const service = createService();

    const result = await service.previewChannexAriPayloads(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2026-06-24",
      { paginate: true, pageSizeDays: 999 }
    );

    expect(result).toEqual({
      statusCode: 400,
      response: expect.objectContaining({
        errorCode: "CHANNEX_ARI_PAYLOAD_PREVIEW_INVALID_PAGE_SIZE",
        maxPageSizeDays: 60,
      }),
    });
  });

  test("availability sync supports a 500-day range and sends one combined provider request", async () => {
    const pushAvailability = jest.fn(async (_secret, payloads) => ({
      success: true,
      results: [
        {
          externalPropertyId: "external-property-1",
          externalRoomTypeId: null,
          requestBody: { values: payloads[0].values },
          providerStatus: "SYNCED",
          httpStatus: 202,
          success: true,
          taskId: "task-availability-1",
          warnings: [],
          errorCode: null,
          errorMessage: null,
        },
      ],
    }));
    const service = createService({
      channexProviderClient: {
        pushAvailability,
        pushRestrictions: jest.fn().mockResolvedValue({ results: [] }),
      },
    });
    service.getChannexAriTargets.mockResolvedValue(
      buildReadyAriTargets({
        roomTypeMappings: [
          {
            domitsPropertyId: "domits-property-1",
            externalPropertyId: "external-property-1",
            externalRoomTypeId: "room-type-1",
            status: "ACTIVE",
          },
          {
            domitsPropertyId: "domits-property-1",
            externalPropertyId: "external-property-1",
            externalRoomTypeId: "room-type-2",
            status: "ACTIVE",
          },
        ],
      })
    );

    const result = await service.syncChannexAvailability(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2027-10-05",
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(200);
    expect(result.response.calledProvider).toBe(true);
    expect(result.response.requestCount).toBe(1);
    expect(pushAvailability).toHaveBeenCalledTimes(1);
    const [, transformedPayloads] = pushAvailability.mock.calls[0];
    expect(transformedPayloads).toHaveLength(1);
    expect(transformedPayloads[0].values).toHaveLength(1000);
    expect(result.response.results[0].requestBody).toEqual(
      expect.objectContaining({
        valuesOmitted: true,
        valueCount: 1000,
      })
    );
  });

  test("availability sync rejects ranges over 500 days", async () => {
    const pushAvailability = jest.fn();
    const service = createService({
      channexProviderClient: {
        pushAvailability,
        pushRestrictions: jest.fn().mockResolvedValue({ results: [] }),
      },
    });

    const result = await service.syncChannexAvailability(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2027-10-06",
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(400);
    expect(result.response).toEqual(
      expect.objectContaining({
        errorCode: "CHANNEX_SYNC_RANGE_TOO_LARGE",
        maxDays: 500,
        totalDays: 501,
      })
    );
    expect(pushAvailability).not.toHaveBeenCalled();
  });

  test("availability sync returns a controlled error response when the provider call throws", async () => {
    const providerError = new Error("Provider gateway unavailable");
    providerError.status = 503;
    providerError.endpoint = "/api/v1/availability";
    providerError.method = "POST";
    const service = createService({
      channexProviderClient: {
        pushAvailability: jest.fn().mockRejectedValue(providerError),
        pushRestrictions: jest.fn().mockResolvedValue({ results: [] }),
      },
    });

    const result = await service.syncChannexAvailability(
      "user-1",
      "domits-property-1",
      "2026-05-01",
      "2026-05-02",
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(500);
    expect(result.response).toEqual(
      expect.objectContaining({
        error: "Failed to sync Channex availability.",
        errorCode: "CHANNEX_AVAILABILITY_SYNC_FAILED",
        details: expect.objectContaining({
          message: "Provider gateway unavailable",
          httpStatus: 503,
          endpoint: "/api/v1/availability",
          method: "POST",
        }),
      })
    );
  });

  test("availability sync still works for a small range", async () => {
    const pushAvailability = jest.fn(async (_secret, payloads) => ({
      success: true,
      results: [
        {
          externalPropertyId: "external-property-1",
          externalRoomTypeId: null,
          requestBody: { values: payloads[0].values },
          providerStatus: "SYNCED",
          httpStatus: 202,
          success: true,
          taskId: "task-small-1",
          warnings: [],
          errorCode: null,
          errorMessage: null,
        },
      ],
    }));
    const service = createService({
      channexProviderClient: {
        pushAvailability,
        pushRestrictions: jest.fn().mockResolvedValue({ results: [] }),
      },
    });

    const result = await service.syncChannexAvailability(
      "user-1",
      "domits-property-1",
      "2026-05-01",
      "2026-05-02",
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(200);
    expect(result.response.calledProvider).toBe(true);
    expect(result.response.requestCount).toBe(1);
    expect(pushAvailability).toHaveBeenCalledTimes(1);
    expect(pushAvailability.mock.calls[0][1][0].values).toHaveLength(2);
    expect(result.response.results[0]).toEqual(
      expect.objectContaining({
        success: true,
        taskId: "task-small-1",
      })
    );
  });

  test("restrictions sync supports a 500-day range and sends one combined provider request", async () => {
    const pushRestrictions = jest.fn(async (_secret, payloads) => ({
      success: true,
      results: payloads.map((payload, index) => ({
        externalPropertyId: payload.externalPropertyId,
        externalRoomTypeId: payload.externalRoomTypeId,
        externalRoomTypeIds: payload.externalRoomTypeIds,
        externalRatePlanId: payload.externalRatePlanId,
        externalRatePlanIds: payload.externalRatePlanIds,
        requestBody: { values: payload.values },
        providerStatus: "SYNCED",
        httpStatus: 202,
        success: true,
        taskId: `task-restrictions-${index + 1}`,
        warnings: [],
        errorCode: null,
        errorMessage: null,
      })),
    }));
    const service = createService({
      channexProviderClient: {
        pushAvailability: jest.fn().mockResolvedValue({ results: [] }),
        pushRestrictions,
      },
    });
    service.getChannexAriTargets.mockResolvedValue(
      buildReadyAriTargets({
        ratePlanMappings: [
          {
            domitsPropertyId: "domits-property-1",
            externalPropertyId: "external-property-1",
            externalRoomTypeId: "room-type-1",
            externalRatePlanId: "rate-plan-1",
            status: "ACTIVE",
          },
          {
            domitsPropertyId: "domits-property-1",
            externalPropertyId: "external-property-1",
            externalRoomTypeId: "room-type-2",
            externalRatePlanId: "rate-plan-2",
            status: "ACTIVE",
          },
        ],
      })
    );
    const previewSpy = jest.spyOn(service, "previewChannexAriPayloads");

    const result = await service.syncChannexRestrictions(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2027-10-05",
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(200);
    expect(result.response.restrictionsSyncVersion).toBe("single-request-v3");
    expect(result.response.calledProvider).toBe(true);
    expect(result.response.requestCount).toBe(1);
    expect(pushRestrictions).toHaveBeenCalledTimes(1);
    expect(previewSpy).not.toHaveBeenCalled();
    expect(pushRestrictions.mock.calls[0][2]).toEqual(expect.objectContaining({ stopOnFailure: true }));
    const transformedPayloads = pushRestrictions.mock.calls[0][1];
    expect(transformedPayloads).toHaveLength(1);
    expect(transformedPayloads[0].values).toHaveLength(1000);
    expect(result.response.results[0]).toEqual(
      expect.objectContaining({
        success: true,
        taskId: "task-restrictions-1",
        requestBody: expect.objectContaining({
          valuesOmitted: true,
          valueCount: 1000,
          firstDate: "2026-05-24",
          lastDate: "2027-10-05",
          externalPropertyIds: ["external-property-1"],
          externalRoomTypeIds: ["room-type-1", "room-type-2"],
          externalRatePlanIds: ["rate-plan-1", "rate-plan-2"],
        }),
      })
    );
    expect(result.response).not.toHaveProperty("syncRunId");
    expect(result.response).not.toHaveProperty("pageRange");
    expect(result.response.results[0]).not.toHaveProperty("chunkIndex");
    expect(result.response.results[0]).not.toHaveProperty("chunkCount");
  });

  test("full certification sync sends exactly one availability call and one restrictions/rates call", async () => {
    const pushAvailability = jest.fn(async (_secret, payloads) => ({
      success: true,
      results: payloads.map((payload) => ({
        externalPropertyId: payload.externalPropertyId,
        externalRoomTypeId: payload.externalRoomTypeId,
        requestBody: { values: payload.values },
        providerStatus: "SYNCED",
        httpStatus: 202,
        success: true,
        taskId: "task-availability-full",
        warnings: [],
        errorCode: null,
        errorMessage: null,
      })),
    }));
    const pushRestrictions = jest.fn(async (_secret, payloads) => ({
      success: true,
      results: payloads.map((payload) => ({
        externalPropertyId: payload.externalPropertyId,
        externalRoomTypeId: payload.externalRoomTypeId,
        externalRoomTypeIds: payload.externalRoomTypeIds,
        externalRatePlanId: payload.externalRatePlanId,
        externalRatePlanIds: payload.externalRatePlanIds,
        requestBody: { values: payload.values },
        providerStatus: "SYNCED",
        httpStatus: 202,
        success: true,
        taskId: "task-restrictions-full",
        warnings: [],
        errorCode: null,
        errorMessage: null,
      })),
    }));
    const service = createService({
      channexProviderClient: {
        pushAvailability,
        pushRestrictions,
      },
    });
    service.getChannexAriTargets.mockResolvedValue(
      buildReadyAriTargets({
        ratePlanMappings: [
          {
            domitsPropertyId: "domits-property-1",
            externalPropertyId: "external-property-1",
            externalRoomTypeId: "room-type-1",
            externalRatePlanId: "rate-plan-1",
            status: "ACTIVE",
          },
          {
            domitsPropertyId: "domits-property-1",
            externalPropertyId: "external-property-1",
            externalRoomTypeId: "room-type-2",
            externalRatePlanId: "rate-plan-2",
            status: "ACTIVE",
          },
        ],
      })
    );
    const payloadPreviewSpy = jest.spyOn(service, "previewChannexAriPayloads");

    const result = await service.syncChannexFull(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2027-10-05",
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(200);
    expect(result.response.fullCertificationSyncVersion).toBe(CHANNEX_FULL_CERTIFICATION_SYNC_VERSION);
    expect(result.response.requestCount).toBe(2);
    expect(pushAvailability).toHaveBeenCalledTimes(1);
    expect(pushRestrictions).toHaveBeenCalledTimes(1);
    expect(pushAvailability.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        requestTimeoutMs: CHANNEX_FULL_CERTIFICATION_PROVIDER_REQUEST_TIMEOUT_MS,
        stopOnFailure: true,
      })
    );
    expect(pushRestrictions.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        requestTimeoutMs: CHANNEX_FULL_CERTIFICATION_PROVIDER_REQUEST_TIMEOUT_MS,
        stopOnFailure: true,
      })
    );
    expect(payloadPreviewSpy).not.toHaveBeenCalled();
    expect(result.response.taskIds).toEqual(["task-availability-full", "task-restrictions-full"]);
    expect(result.response).not.toHaveProperty("pageRange");
    expect(result.response).not.toHaveProperty("syncRunId");
    expect(JSON.stringify(result.response)).not.toMatch(/pageDateFrom|pageSizeDays|chunkIndex|chunkCount|syncRunId/);
    expect(result.response.steps.availability.results[0]).not.toHaveProperty("chunkIndex");
    expect(result.response.steps.restrictions.results[0]).not.toHaveProperty("chunkIndex");
  });

  test("full certification sync dryRun builds summarized 500-day payloads without provider calls", async () => {
    const pushAvailability = jest.fn();
    const pushRestrictions = jest.fn();
    const readSecretOrNull = jest.fn();
    const evidenceCreate = jest.fn();
    const service = createService({
      channexEvidence: {
        create: evidenceCreate,
      },
      channexCredentialStore: {
        readSecretOrNull,
      },
      channexProviderClient: {
        pushAvailability,
        pushRestrictions,
      },
    });

    const result = await service.syncChannexFull(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2027-10-05",
      { dryRun: "true" }
    );

    expect(result.statusCode).toBe(200);
    expect(result.response).toEqual(
      expect.objectContaining({
        fullCertificationSyncVersion: CHANNEX_FULL_CERTIFICATION_SYNC_VERSION,
        stage: "dry_run_response_ready",
        dryRun: true,
        calledProvider: false,
        requestCount: 0,
        plannedRequestCount: 2,
      })
    );
    expect(result.response.payloadSummaries.availability[0].requestBody).toEqual(
      expect.objectContaining({
        valuesOmitted: true,
        valueCount: 500,
        firstDate: "2026-05-24",
        lastDate: "2027-10-05",
      })
    );
    expect(result.response.payloadSummaries.restrictions[0].requestBody).toEqual(
      expect.objectContaining({
        valuesOmitted: true,
        valueCount: 500,
        firstDate: "2026-05-24",
        lastDate: "2027-10-05",
      })
    );
    expect(result.response.payloadSummaries.availability[0]).not.toHaveProperty("values");
    expect(result.response.payloadSummaries.restrictions[0]).not.toHaveProperty("values");
    expect(pushAvailability).not.toHaveBeenCalled();
    expect(pushRestrictions).not.toHaveBeenCalled();
    expect(readSecretOrNull).not.toHaveBeenCalled();
    expect(evidenceCreate).not.toHaveBeenCalled();
  });

  test("full certification sync debug stages return controlled JSON without provider calls", async () => {
    const pushAvailability = jest.fn();
    const pushRestrictions = jest.fn();
    const service = createService({
      channexProviderClient: {
        pushAvailability,
        pushRestrictions,
      },
    });

    const result = await service.syncChannexFull(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2027-10-05",
      { debugStage: "availabilityPayloadOnly" }
    );

    expect(result.statusCode).toBe(200);
    expect(result.response).toEqual(
      expect.objectContaining({
        fullCertificationSyncVersion: CHANNEX_FULL_CERTIFICATION_SYNC_VERSION,
        stage: "availability_payload_built",
        debugStage: "availabilityPayloadOnly",
        calledProvider: false,
        requestCount: 0,
      })
    );
    expect(result.response.payloadSummaries.availability[0].requestBody).toEqual(
      expect.objectContaining({
        valuesOmitted: true,
        valueCount: 500,
      })
    );
    expect(result.response.payloadSummaries.restrictions).toBeNull();
    expect(pushAvailability).not.toHaveBeenCalled();
    expect(pushRestrictions).not.toHaveBeenCalled();
  });

  test("full certification sync restrictions debug stage builds a summarized 500-day payload", async () => {
    const pushAvailability = jest.fn();
    const pushRestrictions = jest.fn();
    const readSecretOrNull = jest.fn();
    const evidenceCreate = jest.fn();
    const service = createService({
      channexEvidence: {
        create: evidenceCreate,
      },
      channexCredentialStore: {
        readSecretOrNull,
      },
      channexProviderClient: {
        pushAvailability,
        pushRestrictions,
      },
    });
    service.getChannexAriTargets.mockResolvedValue(
      buildReadyAriTargets({
        ratePlanMappings: [
          {
            domitsPropertyId: "domits-property-1",
            externalPropertyId: "external-property-1",
            externalRoomTypeId: "room-type-1",
            externalRatePlanId: "rate-plan-1",
            status: "ACTIVE",
          },
          {
            domitsPropertyId: "domits-property-1",
            externalPropertyId: "external-property-1",
            externalRoomTypeId: "room-type-2",
            externalRatePlanId: "rate-plan-2",
            status: "ACTIVE",
          },
        ],
      })
    );

    const result = await service.syncChannexFull(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2027-10-05",
      { debugStage: "restrictionsPayloadOnly" }
    );

    expect(result.statusCode).toBe(200);
    expect(result.response).toEqual(
      expect.objectContaining({
        fullCertificationSyncVersion: CHANNEX_FULL_CERTIFICATION_SYNC_VERSION,
        stage: "restrictions_payload_built",
        debugStage: "restrictionsPayloadOnly",
        calledProvider: false,
        requestCount: 0,
      })
    );
    expect(result.response.payloadSummaries.availability).toBeNull();
    expect(result.response.payloadSummaries.restrictions[0].requestBody).toEqual(
      expect.objectContaining({
        valuesOmitted: true,
        valueCount: 1000,
        firstDate: "2026-05-24",
        lastDate: "2027-10-05",
        externalPropertyIds: ["external-property-1"],
        externalRatePlanIds: ["rate-plan-1", "rate-plan-2"],
      })
    );
    expect(JSON.stringify(result.response)).not.toMatch(/"values":\s*\[/);
    expect(result.response.debug.stages.map((entry) => entry.stage)).toEqual(
      expect.arrayContaining([
        "load_pricing_start",
        "load_pricing_end",
        "load_global_restrictions_start",
        "load_global_restrictions_end",
        "load_calendar_overrides_start",
        "load_calendar_overrides_end",
        "mapping_fan_out_start",
        "mapping_fan_out_end",
        "value_summary_start",
        "value_summary_end",
      ])
    );
    expect(pushAvailability).not.toHaveBeenCalled();
    expect(pushRestrictions).not.toHaveBeenCalled();
    expect(readSecretOrNull).not.toHaveBeenCalled();
    expect(evidenceCreate).not.toHaveBeenCalled();
  });

  test("full certification sync restrictions debug stage summarizes false boolean snapshots when pricing and restrictions are absent", async () => {
    Database.getInstance.mockResolvedValue(
      buildDatabaseClient({
        availabilityRestrictions: [],
        calendarOverrides: [],
        pricing: [],
      })
    );
    const evidenceCreate = jest.fn();
    const service = createService({
      channexEvidence: {
        create: evidenceCreate,
      },
      channexProviderClient: {
        pushAvailability: jest.fn(),
        pushRestrictions: jest.fn(),
      },
    });

    const result = await service.syncChannexFull(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2027-10-05",
      { debugStage: "restrictionsPayloadOnly" }
    );

    expect(result.statusCode).toBe(200);
    expect(result.response).toEqual(
      expect.objectContaining({
        stage: "restrictions_payload_built",
        debugStage: "restrictionsPayloadOnly",
        calledProvider: false,
        requestCount: 0,
        sentChannexRestrictionFields: ["closed_to_arrival", "closed_to_departure", "stop_sell"],
      })
    );
    expect(result.response.payloadSummaries.availability).toBeNull();
    expect(result.response.payloadSummaries.restrictions[0].requestBody).toEqual(
      expect.objectContaining({
        valuesOmitted: true,
        valueCount: 500,
        firstDate: "2026-05-24",
        lastDate: "2027-10-05",
        booleanRestrictionCounts: {
          closed_to_arrival: { true: 0, false: 500 },
          closed_to_departure: { true: 0, false: 500 },
          stop_sell: { true: 0, false: 500 },
        },
      })
    );
    expect(evidenceCreate).not.toHaveBeenCalled();
  });

  test("full certification sync restrictions debug stage returns controlled JSON when an internal loader fails", async () => {
    const client = buildDatabaseClient();
    const baseQuery = client.query;
    const pricingError = new Error("pricing query failed");
    pricingError.code = "TEST_PRICING_QUERY_FAILED";
    client.query = jest.fn(async (sql, params) => {
      const query = String(sql || "");
      if (query.includes("property_pricing")) throw pricingError;
      return baseQuery(sql, params);
    });
    Database.getInstance.mockResolvedValue(client);
    const evidenceCreate = jest.fn();
    const service = createService({
      channexEvidence: {
        create: evidenceCreate,
      },
      channexProviderClient: {
        pushAvailability: jest.fn(),
        pushRestrictions: jest.fn(),
      },
    });

    const result = await service.syncChannexFull(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2027-10-05",
      { debugStage: "restrictionsPayloadOnly" }
    );

    expect(result.statusCode).toBe(500);
    expect(result.response).toEqual(
      expect.objectContaining({
        fullCertificationSyncVersion: CHANNEX_FULL_CERTIFICATION_SYNC_VERSION,
        errorCode: "CHANNEX_CERTIFICATION_FULL_SYNC_FAILED",
        errorName: "Error",
        errorMessage: "pricing query failed",
      })
    );
    expect(result.response.debug.stages.map((entry) => entry.stage)).toEqual(
      expect.arrayContaining(["load_pricing_start", "load_pricing_failed"])
    );
    expect(JSON.stringify(result.response)).not.toMatch(/"values":\s*\[/);
    expect(evidenceCreate).not.toHaveBeenCalled();
  });

  test("full certification sync restrictions payload omits non-positive min stay values before provider calls", async () => {
    Database.getInstance.mockResolvedValue(
      buildDatabaseClient({
        availabilityRestrictions: [
          {
            id: "restriction-min",
            property_id: "domits-property-1",
            restriction: "MinimumStay",
            value: 2,
          },
          {
            id: "restriction-max",
            property_id: "domits-property-1",
            restriction: "MaximumStay",
            value: 7,
          },
        ],
        calendarOverrides: [
          {
            property_id: "domits-property-1",
            calendar_date: 20260530,
            is_available: true,
            nightly_price: 123,
            stop_sell: null,
            closed_to_arrival: null,
            closed_to_departure: null,
            min_stay: 0,
            max_stay: null,
            updated_at: 1,
          },
        ],
      })
    );
    const pushRestrictions = createSuccessfulRestrictionsPush();
    const service = createService({
      channexProviderClient: {
        pushAvailability: jest.fn(),
        pushRestrictions,
      },
    });

    const result = await service.syncChannexFull(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2027-10-05",
      { skipEvidence: true, providerMode: "restrictionsOnly" }
    );

    expect(result.statusCode).toBe(200);
    expect(pushRestrictions).toHaveBeenCalledTimes(1);
    const outboundPayloads = pushRestrictions.mock.calls[0][1];
    expectValidChannexRestrictionProviderValues(outboundPayloads);
    const valueWithZeroMinStayOverride = outboundPayloads[0].values.find(
      (value) => value.date === "2026-05-30" && value.rate_plan_id === "rate-plan-1"
    );
    expect(valueWithZeroMinStayOverride).toEqual(
      expect.objectContaining({
        date: "2026-05-30",
        rate: "123.00",
        max_stay: 7,
      })
    );
    expect(valueWithZeroMinStayOverride).not.toHaveProperty("min_stay_through");
    expect(JSON.stringify(outboundPayloads)).not.toMatch(/"min_stay_through":0/);
  });

  test("full certification sync restrictions payload omits invalid global min stay values", async () => {
    Database.getInstance.mockResolvedValue(
      buildDatabaseClient({
        availabilityRestrictions: [
          {
            id: "restriction-min",
            property_id: "domits-property-1",
            restriction: "MinimumStay",
            value: 0,
          },
          {
            id: "restriction-max",
            property_id: "domits-property-1",
            restriction: "MaximumStay",
            value: 7,
          },
        ],
        calendarOverrides: [],
      })
    );
    const pushRestrictions = createSuccessfulRestrictionsPush();
    const service = createService({
      channexProviderClient: {
        pushAvailability: jest.fn(),
        pushRestrictions,
      },
    });

    const result = await service.syncChannexFull(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2027-10-05",
      { skipEvidence: true, providerMode: "restrictionsOnly" }
    );

    expect(result.statusCode).toBe(200);
    const outboundPayloads = pushRestrictions.mock.calls[0][1];
    expectValidChannexRestrictionProviderValues(outboundPayloads);
    outboundPayloads[0].values.forEach((value) => {
      expect(value).not.toHaveProperty("min_stay_through");
    });
    expect(outboundPayloads[0].values.some((value) => value.max_stay === 7)).toBe(true);
  });

  test("restrictions sync sanitizes invalid rates and restriction values before provider calls", async () => {
    Database.getInstance.mockResolvedValue(
      buildDatabaseClient({
        availabilityRestrictions: [
          {
            id: "restriction-min",
            property_id: "domits-property-1",
            restriction: "MinimumStay",
            value: 0,
          },
          {
            id: "restriction-max",
            property_id: "domits-property-1",
            restriction: "MaximumStay",
            value: 0,
          },
        ],
        calendarOverrides: [
          {
            property_id: "domits-property-1",
            calendar_date: 20260524,
            is_available: true,
            nightly_price: 0,
            stop_sell: true,
            closed_to_arrival: false,
            closed_to_departure: true,
            min_stay: 0,
            max_stay: 0,
            updated_at: 1,
          },
        ],
        pricing: [
          {
            property_id: "domits-property-1",
            roomrate: 0,
            cleaning: 0,
            weekendrate: 0,
          },
        ],
      })
    );
    const pushRestrictions = createSuccessfulRestrictionsPush();
    const service = createService({
      channexProviderClient: {
        pushAvailability: jest.fn(),
        pushRestrictions,
      },
    });

    const result = await service.syncChannexRestrictions(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2026-05-24",
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(200);
    const outboundPayloads = pushRestrictions.mock.calls[0][1];
    expectValidChannexRestrictionProviderValues(outboundPayloads);
    expect(outboundPayloads[0].values[0]).toEqual({
      property_id: "external-property-1",
      rate_plan_id: "rate-plan-1",
      date: "2026-05-24",
      stop_sell: true,
      closed_to_arrival: false,
      closed_to_departure: true,
    });
  });

  test("full certification sync providerMode can isolate the availability provider call", async () => {
    const pushAvailability = createSuccessfulAvailabilityPush();
    const pushRestrictions = jest.fn();
    const service = createService({
      channexProviderClient: {
        pushAvailability,
        pushRestrictions,
      },
    });

    const result = await service.syncChannexFull(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2027-10-05",
      { skipEvidence: true, providerMode: "availabilityOnly" }
    );

    expect(result.statusCode).toBe(200);
    expect(result.response.providerMode).toBe("availabilityOnly");
    expect(result.response.requestCount).toBe(1);
    expect(result.response.steps.availability).toEqual(expect.objectContaining({ calledProvider: true }));
    expect(result.response.steps.restrictions).toBeNull();
    expect(pushAvailability).toHaveBeenCalledTimes(1);
    expect(pushRestrictions).not.toHaveBeenCalled();
  });

  test("full certification sync starts both provider calls without waiting for the first one to finish", async () => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    let resolveAvailability;
    let resolveRestrictions;
    let resolveAvailabilityStarted;
    let resolveRestrictionsStarted;
    const availabilityStarted = new Promise((resolve) => {
      resolveAvailabilityStarted = resolve;
    });
    const restrictionsStarted = new Promise((resolve) => {
      resolveRestrictionsStarted = resolve;
    });
    const pushAvailability = jest.fn((_secret, payloads) => {
      resolveAvailabilityStarted();
      return new Promise((providerResolve) => {
        resolveAvailability = () =>
          providerResolve({
            success: true,
            results: payloads.map((payload) => ({
              externalPropertyId: payload.externalPropertyId,
              externalRoomTypeId: payload.externalRoomTypeId,
              requestBody: { values: payload.values },
              providerStatus: "SYNCED",
              httpStatus: 202,
              success: true,
              taskId: "task-availability-parallel",
              warnings: [],
              errorCode: null,
              errorMessage: null,
            })),
          });
      });
    });
    const pushRestrictions = jest.fn((_secret, payloads) => {
      resolveRestrictionsStarted();
      return new Promise((providerResolve) => {
        resolveRestrictions = () =>
          providerResolve({
            success: true,
            results: payloads.map((payload) => ({
              externalPropertyId: payload.externalPropertyId,
              externalRoomTypeId: payload.externalRoomTypeId,
              externalRoomTypeIds: payload.externalRoomTypeIds,
              externalRatePlanId: payload.externalRatePlanId,
              externalRatePlanIds: payload.externalRatePlanIds,
              requestBody: { values: payload.values },
              providerStatus: "SYNCED",
              httpStatus: 202,
              success: true,
              taskId: "task-restrictions-parallel",
              warnings: [],
              errorCode: null,
              errorMessage: null,
            })),
          });
      });
    });
    const service = createService({
      channexProviderClient: {
        pushAvailability,
        pushRestrictions,
      },
    });

    const fullSyncPromise = service.syncChannexFull(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2027-10-05",
      { skipEvidence: true }
    );

    const startedTogether = await Promise.race([
      Promise.all([availabilityStarted, restrictionsStarted]).then(() => true),
      delay(75).then(() => false),
    ]);
    expect(startedTogether).toBe(true);

    resolveAvailability();
    resolveRestrictions();
    const result = await fullSyncPromise;

    expect(result.statusCode).toBe(200);
    expect(result.response.requestCount).toBe(2);
  });

  test("full certification sync persists summarized outbound evidence", async () => {
    const evidenceCreate = jest.fn(async (row) => row);
    const pushAvailability = createSuccessfulAvailabilityPush();
    const pushRestrictions = createSuccessfulRestrictionsPush();
    const service = createService({
      channexEvidence: {
        create: evidenceCreate,
      },
      channexProviderClient: {
        pushAvailability,
        pushRestrictions,
      },
    });

    const result = await service.syncChannexFull(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2027-10-05"
    );

    expect(result.statusCode).toBe(200);
    expect(result.response.evidencePersisted).toBe(true);
    expect(evidenceCreate).toHaveBeenCalledTimes(1);
    const persistedEvidence = evidenceCreate.mock.calls[0][0];
    const groupedSnapshot = JSON.parse(persistedEvidence.groupedOutboundPayloadSnapshot);
    expect(groupedSnapshot.availability[0].requestBody).toEqual(
      expect.objectContaining({
        valuesOmitted: true,
        valueCount: 500,
      })
    );
    expect(groupedSnapshot.restrictions[0].requestBody).toEqual(
      expect.objectContaining({
        valuesOmitted: true,
        valueCount: 500,
      })
    );
    expect(groupedSnapshot.availability[0]).not.toHaveProperty("values");
    expect(groupedSnapshot.restrictions[0]).not.toHaveProperty("values");
  });

  test("full certification sync returns controlled JSON when one provider step fails", async () => {
    const pushAvailability = jest.fn(async (_secret, payloads) => ({
      success: true,
      results: payloads.map((payload) => ({
        endpoint: "/api/v1/availability",
        method: "POST",
        externalPropertyId: payload.externalPropertyId,
        externalRoomTypeId: payload.externalRoomTypeId,
        requestBody: { values: payload.values },
        providerStatus: "SYNCED",
        httpStatus: 202,
        success: true,
        taskId: "task-availability-full",
        warnings: [],
        errorCode: null,
        errorMessage: null,
      })),
    }));
    const pushRestrictions = jest.fn(async (_secret, payloads) => ({
      success: false,
      results: payloads.map((payload) => ({
        endpoint: "/api/v1/restrictions",
        method: "POST",
        externalPropertyId: payload.externalPropertyId,
        externalRoomTypeId: payload.externalRoomTypeId,
        externalRoomTypeIds: payload.externalRoomTypeIds,
        externalRatePlanId: payload.externalRatePlanId,
        externalRatePlanIds: payload.externalRatePlanIds,
        requestBody: { values: payload.values },
        providerStatus: "RESTRICTIONS_PUSH_FAILED",
        httpStatus: 504,
        success: false,
        taskId: null,
        warnings: [],
        errorCode: "CHANNEX_RESTRICTIONS_PUSH_504",
        errorMessage: "Channex restrictions push failed with status 504.",
      })),
    }));
    const service = createService({
      channexProviderClient: {
        pushAvailability,
        pushRestrictions,
      },
    });

    const result = await service.syncChannexFull(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2027-10-05",
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(500);
    expect(result.response).toEqual(
      expect.objectContaining({
        fullCertificationSyncVersion: CHANNEX_FULL_CERTIFICATION_SYNC_VERSION,
        errorCode: "CHANNEX_CERTIFICATION_FULL_SYNC_PROVIDER_FAILED",
        requestCount: 2,
        taskIds: ["task-availability-full"],
      })
    );
    expect(result.response.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          errorCode: "CHANNEX_RESTRICTIONS_PUSH_504",
          errorMessage: "Channex restrictions push failed with status 504.",
          httpStatus: 504,
        }),
      ])
    );
  });

  test("full certification sync returns controlled JSON when a provider call throws", async () => {
    const providerError = new Error("Availability provider exploded");
    providerError.endpoint = "/api/v1/availability";
    providerError.method = "POST";
    providerError.status = 503;
    const pushAvailability = jest.fn().mockRejectedValue(providerError);
    const pushRestrictions = createSuccessfulRestrictionsPush();
    const service = createService({
      channexProviderClient: {
        pushAvailability,
        pushRestrictions,
      },
    });

    const result = await service.syncChannexFull(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2027-10-05",
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(500);
    expect(result.response).toEqual(
      expect.objectContaining({
        fullCertificationSyncVersion: CHANNEX_FULL_CERTIFICATION_SYNC_VERSION,
        stage: "provider_calls_start",
        errorCode: "CHANNEX_CERTIFICATION_FULL_SYNC_FAILED",
        errorName: "Error",
        errorMessage: "Availability provider exploded",
        stackSummary: expect.any(Array),
      })
    );
    expect(result.response.details).toEqual(
      expect.objectContaining({
        endpoint: "/api/v1/availability",
        method: "POST",
        httpStatus: 503,
      })
    );
    expect(pushAvailability).toHaveBeenCalledTimes(1);
    expect(pushRestrictions).toHaveBeenCalledTimes(1);
  });

  test("restrictions sync ignores stale frontend pagination metadata and persists certification-safe evidence", async () => {
    const evidenceCreate = jest.fn(async (row) => row);
    const pushRestrictions = jest.fn(async (_secret, payloads) => ({
      success: true,
      results: payloads.map((payload) => ({
        externalPropertyId: payload.externalPropertyId,
        externalRoomTypeId: payload.externalRoomTypeId,
        externalRoomTypeIds: payload.externalRoomTypeIds,
        externalRatePlanId: payload.externalRatePlanId,
        externalRatePlanIds: payload.externalRatePlanIds,
        requestBody: { values: payload.values },
        providerStatus: "SYNCED",
        httpStatus: 202,
        success: true,
        taskId: "task-restrictions-stale-metadata",
        warnings: [],
        errorCode: null,
        errorMessage: null,
      })),
    }));
    const service = createService({
      channexEvidence: {
        create: evidenceCreate,
      },
      channexProviderClient: {
        pushAvailability: jest.fn().mockResolvedValue({ results: [] }),
        pushRestrictions,
      },
    });

    const result = await service.syncChannexRestrictions(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2026-06-22",
      {
        syncRunId: "sync-run-1",
        requestedDateFrom: "2026-05-24",
        requestedDateTo: "2027-10-05",
        pageNumber: 1,
        totalPages: 17,
        pageSizeDays: 30,
      }
    );

    expect(result.statusCode).toBe(200);
    expect(result.response).toEqual(
      expect.objectContaining({
        restrictionsSyncMode: "single-request-v1",
        requestCount: 1,
        evidencePersisted: true,
      })
    );
    expect(result.response).not.toHaveProperty("syncRunId");
    expect(result.response).not.toHaveProperty("requestedFullRange");
    expect(result.response).not.toHaveProperty("pageRange");
    expect(result.response).not.toHaveProperty("pageNumber");
    expect(result.response).not.toHaveProperty("totalPages");
    expect(result.response).not.toHaveProperty("pageSizeDays");
    expect(evidenceCreate).toHaveBeenCalledTimes(1);
    const persistedEvidence = evidenceCreate.mock.calls[0][0];
    expect(JSON.parse(persistedEvidence.providerResponseSummary)).not.toHaveProperty("syncRun");
    expect(JSON.parse(persistedEvidence.rawDetails)).not.toHaveProperty("syncRun");
    expect(JSON.parse(persistedEvidence.groupedOutboundPayloadSnapshot)[0].requestBody).toEqual(
      expect.objectContaining({
        valuesOmitted: true,
        valueCount: 30,
      })
    );
  });

  test("restrictions sync rejects ranges over 500 days", async () => {
    const pushRestrictions = jest.fn();
    const service = createService({
      channexProviderClient: {
        pushAvailability: jest.fn().mockResolvedValue({ results: [] }),
        pushRestrictions,
      },
    });

    const result = await service.syncChannexRestrictions(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2027-10-06",
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(400);
    expect(result.response).toEqual(
      expect.objectContaining({
        errorCode: "CHANNEX_SYNC_RANGE_TOO_LARGE",
        maxDays: 500,
        totalDays: 501,
      })
    );
    expect(pushRestrictions).not.toHaveBeenCalled();
  });

  test("restrictions sync returns a controlled error response when the provider call throws", async () => {
    const providerError = new Error("Provider restrictions gateway unavailable");
    providerError.status = 503;
    providerError.endpoint = "/api/v1/restrictions";
    providerError.method = "POST";
    const service = createService({
      channexProviderClient: {
        pushAvailability: jest.fn().mockResolvedValue({ results: [] }),
        pushRestrictions: jest.fn().mockRejectedValue(providerError),
      },
    });

    const result = await service.syncChannexRestrictions(
      "user-1",
      "domits-property-1",
      "2026-05-01",
      "2026-05-02",
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(500);
    expect(result.response).toEqual(
      expect.objectContaining({
        error: "Failed to sync Channex restrictions.",
        errorCode: "CHANNEX_RESTRICTIONS_SYNC_FAILED",
        restrictionsSyncVersion: "single-request-v3",
        details: expect.objectContaining({
          message: "Provider restrictions gateway unavailable",
          httpStatus: 503,
          endpoint: "/api/v1/restrictions",
          method: "POST",
        }),
      })
    );
  });

  test("restrictions sync returns controlled JSON when the provider request fails", async () => {
    const service = createService({
      channexProviderClient: {
        pushAvailability: jest.fn().mockResolvedValue({ results: [] }),
        pushRestrictions: jest.fn(async (_secret, payloads) => ({
          success: false,
          results: [
            {
              externalPropertyId: payloads[0].externalPropertyId,
              externalRoomTypeId: payloads[0].externalRoomTypeId,
              externalRoomTypeIds: payloads[0].externalRoomTypeIds,
              externalRatePlanId: payloads[0].externalRatePlanId,
              externalRatePlanIds: payloads[0].externalRatePlanIds,
              requestBody: { values: payloads[0].values },
              providerStatus: "RESTRICTIONS_PUSH_FAILED",
              httpStatus: 504,
              success: false,
              taskId: null,
              warnings: [],
              errorCode: "CHANNEX_RESTRICTIONS_PUSH_504",
              errorMessage: "Channex restrictions push failed with status 504.",
            },
          ],
        })),
      },
    });

    const result = await service.syncChannexRestrictions(
      "user-1",
      "domits-property-1",
      "2026-05-01",
      "2026-05-02",
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(500);
    expect(result.response).toEqual(
      expect.objectContaining({
        error: "Failed to sync Channex restrictions.",
        errorCode: "CHANNEX_RESTRICTIONS_SYNC_FAILED",
        restrictionsSyncVersion: "single-request-v3",
        calledProvider: true,
        requestCount: 1,
        results: [
          expect.objectContaining({
            success: false,
            httpStatus: 504,
            errorCode: "CHANNEX_RESTRICTIONS_PUSH_504",
            requestBody: expect.objectContaining({
              valuesOmitted: true,
              valueCount: 2,
            }),
          }),
        ],
      })
    );
  });

  test("restrictions sync sends stop sell-only override when nightly price is missing", async () => {
    Database.getInstance.mockResolvedValue(
      buildDatabaseClient({
        availabilityRestrictions: [],
        pricing: [],
        calendarOverrides: [
          {
            property_id: "domits-property-1",
            calendar_date: 20260524,
            is_available: true,
            nightly_price: null,
            stop_sell: true,
            closed_to_arrival: null,
            closed_to_departure: null,
            min_stay: null,
            max_stay: null,
            updated_at: 1,
          },
        ],
      })
    );
    const pushRestrictions = createSuccessfulRestrictionsPush();
    const service = createService({
      channexProviderClient: {
        pushAvailability: jest.fn().mockResolvedValue({ results: [] }),
        pushRestrictions,
      },
    });

    const result = await service.syncChannexRestrictions(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2026-05-24",
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(200);
    expect(result.response.calledProvider).toBe(true);
    expect(result.response.requestCount).toBe(1);
    const [, outboundPayloads] = pushRestrictions.mock.calls[0];
    expect(outboundPayloads[0].values[0]).toEqual(
      expect.objectContaining({
        property_id: "external-property-1",
        rate_plan_id: "rate-plan-1",
        date: "2026-05-24",
        stop_sell: true,
      })
    );
    expect(outboundPayloads[0].values[0]).not.toHaveProperty("rate");
  });

  test("restrictions sync sends min and max stay-only override when nightly price is missing", async () => {
    Database.getInstance.mockResolvedValue(
      buildDatabaseClient({
        availabilityRestrictions: [],
        pricing: [],
        calendarOverrides: [
          {
            property_id: "domits-property-1",
            calendar_date: 20260524,
            is_available: true,
            nightly_price: null,
            stop_sell: null,
            closed_to_arrival: null,
            closed_to_departure: null,
            min_stay: 3,
            max_stay: 7,
            updated_at: 1,
          },
        ],
      })
    );
    const pushRestrictions = createSuccessfulRestrictionsPush();
    const service = createService({
      channexProviderClient: {
        pushAvailability: jest.fn().mockResolvedValue({ results: [] }),
        pushRestrictions,
      },
    });

    const result = await service.syncChannexRestrictions(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2026-05-24",
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(200);
    expect(result.response.calledProvider).toBe(true);
    expect(result.response.requestCount).toBe(1);
    const [, outboundPayloads] = pushRestrictions.mock.calls[0];
    expect(outboundPayloads[0].values[0]).toEqual(
      expect.objectContaining({
        property_id: "external-property-1",
        rate_plan_id: "rate-plan-1",
        date: "2026-05-24",
        min_stay_through: 3,
        max_stay: 7,
      })
    );
    expect(outboundPayloads[0].values[0]).not.toHaveProperty("rate");
  });

  test("restrictions sync does not skip supported restrictions when nightly price is zero", async () => {
    Database.getInstance.mockResolvedValue(
      buildDatabaseClient({
        availabilityRestrictions: [],
        pricing: [],
        calendarOverrides: [
          {
            property_id: "domits-property-1",
            calendar_date: 20260524,
            is_available: true,
            nightly_price: 0,
            stop_sell: true,
            closed_to_arrival: true,
            closed_to_departure: true,
            min_stay: null,
            max_stay: null,
            updated_at: 1,
          },
        ],
      })
    );
    const pushRestrictions = createSuccessfulRestrictionsPush();
    const service = createService({
      channexProviderClient: {
        pushAvailability: jest.fn().mockResolvedValue({ results: [] }),
        pushRestrictions,
      },
    });

    const result = await service.syncChannexRestrictions(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2026-05-24",
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(200);
    expect(result.response.calledProvider).toBe(true);
    const [, outboundPayloads] = pushRestrictions.mock.calls[0];
    expect(outboundPayloads[0].values[0]).toEqual(
      expect.objectContaining({
        date: "2026-05-24",
        stop_sell: true,
        closed_to_arrival: true,
        closed_to_departure: true,
      })
    );
    expect(outboundPayloads[0].values[0]).not.toHaveProperty("rate");
  });

  test("restrictions sync skips safely when no rate or supported restrictions exist", async () => {
    Database.getInstance.mockResolvedValue(
      buildDatabaseClient({
        availabilityRestrictions: [],
        pricing: [],
        calendarOverrides: [],
      })
    );
    const pushRestrictions = createSuccessfulRestrictionsPush();
    const service = createService({
      channexProviderClient: {
        pushAvailability: jest.fn().mockResolvedValue({ results: [] }),
        pushRestrictions,
      },
    });

    const result = await service.syncChannexRestrictions(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2026-05-24",
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(200);
    expect(result.response.calledProvider).toBe(false);
    expect(result.response.requestCount).toBe(0);
    expect(result.response.results).toEqual([]);
    expect(pushRestrictions).not.toHaveBeenCalled();
    expect(result.response.notes).toContain(
      "No nightlyPrice values or supported restriction fields were available to send, so nothing was posted to Channex."
    );
  });

  test("restrictions sync sends mapped Channex restriction fields from preview payloads", async () => {
    const pushRestrictions = jest.fn(async (_secret, payloads) => ({
      success: true,
      results: payloads.map((payload) => ({
        externalPropertyId: payload.externalPropertyId,
        externalRoomTypeId: payload.externalRoomTypeId,
        externalRoomTypeIds: payload.externalRoomTypeIds,
        externalRatePlanId: payload.externalRatePlanId,
        externalRatePlanIds: payload.externalRatePlanIds,
        requestBody: { values: payload.values },
        providerStatus: "SYNCED",
        httpStatus: 202,
        success: true,
        taskId: "task-restrictions-mapping",
        warnings: [],
        errorCode: null,
        errorMessage: null,
      })),
    }));
    const channexProviderClient = {
      pushRestrictions,
    };
    const service = createService({ channexProviderClient });

    const result = await service.syncChannexRestrictions(
      "user-1",
      "domits-property-1",
      "2026-05-01",
      "2026-05-02",
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(200);
    expect(pushRestrictions).toHaveBeenCalledTimes(1);

    const [, outboundPayloads] = pushRestrictions.mock.calls[0];
    expect(outboundPayloads[0].values[0]).toEqual(
      expect.objectContaining({
        property_id: "external-property-1",
        rate_plan_id: "rate-plan-1",
        date: "2026-05-01",
        rate: "123.00",
        stop_sell: true,
        closed_to_arrival: true,
        closed_to_departure: false,
        min_stay_through: 4,
      })
    );
    expect(outboundPayloads[0].values[0]).not.toHaveProperty("max_stay");
    expect(outboundPayloads[0].values[1]).toEqual(
      expect.objectContaining({
        date: "2026-05-02",
        rate: "120.00",
        min_stay_through: 2,
        max_stay: 9,
      })
    );
  });

  test("full sync restrictions/rates includes all safely supported restriction fields when values exist", async () => {
    Database.getInstance.mockResolvedValue(
      buildDatabaseClient({
        availabilityRestrictions: [],
        calendarOverrides: [
          {
            property_id: "domits-property-1",
            calendar_date: 20260524,
            is_available: true,
            nightly_price: 123,
            stop_sell: true,
            closed_to_arrival: true,
            closed_to_departure: true,
            min_stay: 3,
            max_stay: 7,
            updated_at: 1,
          },
        ],
      })
    );
    const pushRestrictions = createSuccessfulRestrictionsPush();
    const service = createService({
      channexProviderClient: {
        pushAvailability: jest.fn(async (_secret, payloads) => ({
          success: true,
          results: payloads.map((payload) => ({
            externalPropertyId: payload.externalPropertyId,
            externalRoomTypeId: payload.externalRoomTypeId,
            requestBody: { values: payload.values },
            providerStatus: "SYNCED",
            httpStatus: 202,
            success: true,
            taskId: "task-availability-full-fields",
            warnings: [],
            errorCode: null,
            errorMessage: null,
          })),
        })),
        pushRestrictions,
      },
    });

    const result = await service.syncChannexFull(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2026-05-24",
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(200);
    expect(result.response.requestCount).toBe(2);
    const [, outboundPayloads] = pushRestrictions.mock.calls[0];
    expect(outboundPayloads).toHaveLength(1);
    expect(outboundPayloads[0].values[0]).toEqual(
      expect.objectContaining({
        property_id: "external-property-1",
        rate_plan_id: "rate-plan-1",
        date: "2026-05-24",
        rate: "123.00",
        stop_sell: true,
        closed_to_arrival: true,
        closed_to_departure: true,
        min_stay_through: 3,
        max_stay: 7,
      })
    );
    expect(outboundPayloads[0].values[0]).not.toHaveProperty("min_stay_arrival");
  });

  test("full sync snapshot sends explicit false values for Channex boolean restrictions", async () => {
    Database.getInstance.mockResolvedValue(
      buildDatabaseClient({
        availabilityRestrictions: [],
        calendarOverrides: [],
      })
    );
    const pushAvailability = createSuccessfulAvailabilityPush();
    const pushRestrictions = createSuccessfulRestrictionsPush();
    const service = createService({
      channexProviderClient: {
        pushAvailability,
        pushRestrictions,
      },
    });

    const result = await service.syncChannexFull(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2026-05-24",
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(200);
    expect(result.response.requestCount).toBe(2);
    const [, outboundPayloads] = pushRestrictions.mock.calls[0];
    expect(outboundPayloads[0].values[0]).toEqual(
      expect.objectContaining({
        property_id: "external-property-1",
        rate_plan_id: "rate-plan-1",
        date: "2026-05-24",
        closed_to_arrival: false,
        closed_to_departure: false,
        stop_sell: false,
      })
    );
    expect(result.response.payloadSummaries.restrictions[0].requestBody.booleanRestrictionCounts).toEqual({
      closed_to_arrival: { true: 0, false: 1 },
      closed_to_departure: { true: 0, false: 1 },
      stop_sell: { true: 0, false: 1 },
    });
  });

  test("full sync snapshot summarizes true and false Channex boolean restriction values", async () => {
    Database.getInstance.mockResolvedValue(
      buildDatabaseClient({
        availabilityRestrictions: [],
        calendarOverrides: [
          {
            property_id: "domits-property-1",
            calendar_date: 20260524,
            is_available: true,
            nightly_price: 123,
            stop_sell: true,
            closed_to_arrival: true,
            closed_to_departure: true,
            min_stay: null,
            max_stay: null,
            updated_at: 1,
          },
        ],
      })
    );
    const pushRestrictions = createSuccessfulRestrictionsPush();
    const service = createService({
      channexProviderClient: {
        pushAvailability: createSuccessfulAvailabilityPush(),
        pushRestrictions,
      },
    });

    const result = await service.syncChannexFull(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2026-05-25",
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(200);
    const [, outboundPayloads] = pushRestrictions.mock.calls[0];
    expect(outboundPayloads[0].values.find((value) => value.date === "2026-05-24")).toEqual(
      expect.objectContaining({
        closed_to_arrival: true,
        closed_to_departure: true,
        stop_sell: true,
      })
    );
    expect(outboundPayloads[0].values.find((value) => value.date === "2026-05-25")).toEqual(
      expect.objectContaining({
        closed_to_arrival: false,
        closed_to_departure: false,
        stop_sell: false,
      })
    );
    expect(result.response.payloadSummaries.restrictions[0].requestBody.booleanRestrictionCounts).toEqual({
      closed_to_arrival: { true: 1, false: 1 },
      closed_to_departure: { true: 1, false: 1 },
      stop_sell: { true: 1, false: 1 },
    });
  });

  test("certification test cases #2 through #10 send change-only payloads", async () => {
    const expected = {
      "2": { provider: "restrictions", count: 1, fields: ["rate"] },
      "3": { provider: "restrictions", count: 3, fields: ["rate"] },
      "4": { provider: "restrictions", count: 37, fields: ["rate"] },
      "5": { provider: "restrictions", count: 3, fields: ["min_stay_through"] },
      "6": { provider: "restrictions", count: 3, fields: ["stop_sell"] },
      "7": { provider: "restrictions", count: 42, fields: ["closed_to_arrival", "closed_to_departure", "max_stay", "min_stay_through"] },
      "8": { provider: "restrictions", count: 304, fields: ["closed_to_arrival", "closed_to_departure", "min_stay_through", "rate"] },
      "9": { provider: "availability", count: 2, fields: ["availability"] },
      "10": { provider: "availability", count: 15, fields: ["availability"] },
    };

    for (const [testCaseId, expectation] of Object.entries(expected)) {
      const pushAvailability = jest.fn(async (_secret, payloads) => ({
        success: true,
        results: payloads.map((payload) => ({
          externalPropertyId: payload.externalPropertyId,
          externalRoomTypeId: payload.externalRoomTypeId,
          externalRoomTypeIds: payload.externalRoomTypeIds,
          requestBody: { values: payload.values },
          providerStatus: "SYNCED",
          httpStatus: 202,
          success: true,
          taskId: `task-availability-${testCaseId}`,
          warnings: [],
          errorCode: null,
          errorMessage: null,
        })),
      }));
      const pushRestrictions = jest.fn(async (_secret, payloads) => ({
        success: true,
        results: payloads.map((payload) => ({
          externalPropertyId: payload.externalPropertyId,
          externalRoomTypeId: payload.externalRoomTypeId,
          externalRoomTypeIds: payload.externalRoomTypeIds,
          externalRatePlanId: payload.externalRatePlanId,
          externalRatePlanIds: payload.externalRatePlanIds,
          requestBody: { values: payload.values },
          providerStatus: "SYNCED",
          httpStatus: 202,
          success: true,
          taskId: `task-restrictions-${testCaseId}`,
          warnings: [],
          errorCode: null,
          errorMessage: null,
        })),
      }));
      const service = createService({
        channexProviderClient: {
          pushAvailability,
          pushRestrictions,
        },
      });
      service.getChannexAriTargets.mockResolvedValue(buildCertificationAriTargets());

      const result = await service.syncChannexCertificationTestCase(
        "user-1",
        "domits-property-1",
        { testCaseId },
        { skipEvidence: true }
      );

      expect(result.statusCode).toBe(200);
      expect(result.response.syncMode).toBe("changeUpdate");
      expect(result.response.requestCount).toBe(1);
      const providerMock = expectation.provider === "availability" ? pushAvailability : pushRestrictions;
      const otherProviderMock = expectation.provider === "availability" ? pushRestrictions : pushAvailability;
      expect(providerMock).toHaveBeenCalledTimes(1);
      expect(otherProviderMock).not.toHaveBeenCalled();
      const values = providerMock.mock.calls[0][1][0].values;
      expect(values).toHaveLength(expectation.count);
      const identifierFields =
        expectation.provider === "availability"
          ? ["availability", "date", "property_id", "room_type_id"]
          : ["date", "property_id", "rate_plan_id", ...expectation.fields];
      const allowedFields = new Set(identifierFields);
      for (const value of values) {
        expect(Object.keys(value).every((field) => allowedFields.has(field))).toBe(true);
        expect(value).not.toHaveProperty("min_stay_arrival");
        if (expectation.provider === "availability") {
          expect(Number.isInteger(value.availability)).toBe(true);
          expect(value.availability).toBeGreaterThanOrEqual(0);
          expect(value.availability).toBeLessThanOrEqual(CHANNEX_CERTIFICATION_MAX_AVAILABILITY);
        }
      }
    }
  });

  test("certification rate-only update does not include min or max stay", async () => {
    const pushRestrictions = createSuccessfulRestrictionsPush();
    const service = createService({
      channexProviderClient: {
        pushAvailability: jest.fn().mockResolvedValue({ results: [] }),
        pushRestrictions,
      },
    });
    service.getChannexAriTargets.mockResolvedValue(buildCertificationAriTargets());

    await service.syncChannexCertificationTestCase(
      "user-1",
      "domits-property-1",
      { testCaseId: "2" },
      { skipEvidence: true }
    );

    const value = pushRestrictions.mock.calls[0][1][0].values[0];
    expect(value).toEqual({
      property_id: "external-property-1",
      rate_plan_id: "rate-plan-twin-bar",
      date: "2026-11-22",
      rate: "333.00",
    });
  });

  test("certification change-only update keeps changed boolean false and omits unrelated fields", async () => {
    const pushRestrictions = createSuccessfulRestrictionsPush();
    const service = createService({
      channexProviderClient: {
        pushAvailability: jest.fn().mockResolvedValue({ results: [] }),
        pushRestrictions,
      },
    });
    service.getChannexAriTargets.mockResolvedValue(buildCertificationAriTargets());

    const result = await service.syncChannexCertificationTestCase(
      "user-1",
      "domits-property-1",
      { testCaseId: "7" },
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(200);
    const values = pushRestrictions.mock.calls[0][1][0].values;
    const value = values.find((item) => item.rate_plan_id === "rate-plan-twin-bar" && item.date === "2026-11-01");
    expect(value).toEqual({
      property_id: "external-property-1",
      rate_plan_id: "rate-plan-twin-bar",
      date: "2026-11-01",
      closed_to_arrival: true,
      closed_to_departure: false,
      max_stay: 4,
      min_stay_through: 1,
    });
    expect(value).not.toHaveProperty("rate");
    expect(value).not.toHaveProperty("stop_sell");
  });

  test("certification documented cases produce exact changed values for mixed restriction and availability cases", async () => {
    const runCase = async (testCaseId) => {
      const pushAvailability = createSuccessfulAvailabilityPush();
      const pushRestrictions = createSuccessfulRestrictionsPush();
      const service = createService({
        channexProviderClient: {
          pushAvailability,
          pushRestrictions,
        },
      });
      service.getChannexAriTargets.mockResolvedValue(buildCertificationAriTargets());

      const result = await service.syncChannexCertificationTestCase(
        "user-1",
        "domits-property-1",
        { testCaseId },
        { skipEvidence: true }
      );

      expect(result.statusCode).toBe(200);
      const providerMock = testCaseId === "9" || testCaseId === "10" ? pushAvailability : pushRestrictions;
      return providerMock.mock.calls[0][1][0].values;
    };

    const case3Values = await runCase("3");
    expect(case3Values).toEqual(
      expect.arrayContaining([
        {
          property_id: "external-property-1",
          rate_plan_id: "rate-plan-twin-bar",
          date: "2026-11-21",
          rate: "333.00",
        },
        {
          property_id: "external-property-1",
          rate_plan_id: "rate-plan-double-bar",
          date: "2026-11-25",
          rate: "444.00",
        },
        {
          property_id: "external-property-1",
          rate_plan_id: "rate-plan-double-bb",
          date: "2026-11-29",
          rate: "456.23",
        },
      ])
    );

    const case7Values = await runCase("7");
    expect(case7Values.find((value) => value.rate_plan_id === "rate-plan-twin-bar" && value.date === "2026-11-01")).toEqual({
      property_id: "external-property-1",
      rate_plan_id: "rate-plan-twin-bar",
      date: "2026-11-01",
      closed_to_arrival: true,
      closed_to_departure: false,
      max_stay: 4,
      min_stay_through: 1,
    });
    expect(case7Values.find((value) => value.rate_plan_id === "rate-plan-double-bar" && value.date === "2026-11-10")).toEqual({
      property_id: "external-property-1",
      rate_plan_id: "rate-plan-double-bar",
      date: "2026-11-10",
      closed_to_arrival: true,
      min_stay_through: 2,
    });

    const case8Values = await runCase("8");
    expect(case8Values.find((value) => value.rate_plan_id === "rate-plan-twin-bar" && value.date === "2026-12-01")).toEqual({
      property_id: "external-property-1",
      rate_plan_id: "rate-plan-twin-bar",
      date: "2026-12-01",
      rate: "432.00",
      closed_to_arrival: false,
      closed_to_departure: false,
      min_stay_through: 2,
    });
    expect(case8Values.find((value) => value.rate_plan_id === "rate-plan-double-bar" && value.date === "2027-05-01")).toEqual({
      property_id: "external-property-1",
      rate_plan_id: "rate-plan-double-bar",
      date: "2027-05-01",
      rate: "342.00",
      min_stay_through: 3,
    });

    const case9Values = await runCase("9");
    expect(case9Values).toEqual(
      expect.arrayContaining([
        {
          property_id: "external-property-1",
          room_type_id: "room-type-twin",
          date: "2026-11-21",
          availability: 1,
        },
        {
          property_id: "external-property-1",
          room_type_id: "room-type-double",
          date: "2026-11-25",
          availability: 0,
        },
      ])
    );
    case9Values.forEach((value) => {
      expect(value.availability).toBeLessThanOrEqual(CHANNEX_CERTIFICATION_MAX_AVAILABILITY);
    });

    const case10Values = await runCase("10");
    expect(case10Values).toHaveLength(15);
    expect(case10Values.find((value) => value.room_type_id === "room-type-twin" && value.date === "2026-11-10")).toEqual({
      property_id: "external-property-1",
      room_type_id: "room-type-twin",
      date: "2026-11-10",
      availability: 1,
    });
    expect(case10Values.find((value) => value.room_type_id === "room-type-double" && value.date === "2026-11-24")).toEqual({
      property_id: "external-property-1",
      room_type_id: "room-type-double",
      date: "2026-11-24",
      availability: 1,
    });
    case10Values.forEach((value) => {
      expect(value.availability).toBeLessThanOrEqual(CHANNEX_CERTIFICATION_MAX_AVAILABILITY);
    });
  });

  test("certification availability provider warnings keep overallSuccess false", async () => {
    const pushAvailability = jest.fn(async (_secret, payloads) => ({
      success: true,
      results: payloads.map((payload) => ({
        externalPropertyId: payload.externalPropertyId,
        externalRoomTypeId: payload.externalRoomTypeId,
        externalRoomTypeIds: payload.externalRoomTypeIds,
        requestBody: { values: payload.values },
        providerStatus: "ACCEPTED_WITH_WARNINGS",
        httpStatus: 200,
        success: true,
        taskId: "task-availability-warning",
        warnings: ["Provided value is greater than max availability (1). Value changes to max availability."],
        errorCode: null,
        errorMessage: "Channex accepted the request with warnings.",
      })),
    }));
    const service = createService({
      channexProviderClient: {
        pushAvailability,
        pushRestrictions: jest.fn(),
      },
    });
    service.getChannexAriTargets.mockResolvedValue(buildCertificationAriTargets());

    const result = await service.syncChannexCertificationTestCase(
      "user-1",
      "domits-property-1",
      { testCaseId: "9" },
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(500);
    expect(result.response).toEqual(
      expect.objectContaining({
        testCaseId: "9",
        payloadType: "availability",
        calledProvider: true,
        requestCount: 1,
        overallSuccess: false,
        errorCode: "CHANNEX_CERTIFICATION_TEST_CASE_SYNC_FAILED",
        taskIds: ["task-availability-warning"],
      })
    );
    expect(result.response.results[0]).toEqual(
      expect.objectContaining({
        providerStatus: "ACCEPTED_WITH_WARNINGS",
        httpStatus: 200,
        warnings: ["Provided value is greater than max availability (1). Value changes to max availability."],
      })
    );
  });

  test("certification min stay update does not include rate unless rate changed", async () => {
    const pushRestrictions = createSuccessfulRestrictionsPush();
    const service = createService({
      channexProviderClient: {
        pushAvailability: jest.fn().mockResolvedValue({ results: [] }),
        pushRestrictions,
      },
    });
    service.getChannexAriTargets.mockResolvedValue(buildCertificationAriTargets());

    await service.syncChannexCertificationTestCase(
      "user-1",
      "domits-property-1",
      { testCaseId: "5" },
      { skipEvidence: true }
    );

    const value = pushRestrictions.mock.calls[0][1][0].values[0];
    expect(value).toEqual({
      property_id: "external-property-1",
      rate_plan_id: "rate-plan-twin-bar",
      date: "2026-11-23",
      min_stay_through: 3,
    });
  });
});
