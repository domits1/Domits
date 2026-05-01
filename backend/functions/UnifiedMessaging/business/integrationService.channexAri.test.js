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

const buildDatabaseClient = () => ({
  options: { schema: "main" },
  query: jest.fn(async (sql) => {
    const query = String(sql || "");

    if (query.includes("information_schema.columns")) {
      return [{ column_name: "weekendrate" }];
    }

    if (query.includes("property_availabilityrestriction")) {
      return [
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
      ];
    }

    if (query.includes("property_availability")) {
      return [
        {
          property_id: "domits-property-1",
          availablestartdate: 20260501,
          availableenddate: 20260502,
        },
      ];
    }

    if (query.includes("property_calendar_override")) {
      return [
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
      ];
    }

    if (query.includes("property_pricing")) {
      return [
        {
          property_id: "domits-property-1",
          roomrate: 100,
          cleaning: 0,
          weekendrate: 120,
        },
      ];
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

const waitUntil = async (predicate) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Timed out waiting for condition.");
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
        min_stay_through: 4,
      })
    );
    expect(payloadGroup.values[0]).not.toHaveProperty("closed_to_departure");
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

  test("restrictions sync supports a 500-day range and sends chunked provider requests", async () => {
    const pushRestrictions = jest.fn(async (_secret, payloads) => ({
      success: true,
      results: payloads.map((payload, index) => ({
        chunkIndex: payload.chunkIndex,
        chunkCount: payload.chunkCount,
        externalPropertyId: payload.externalPropertyId,
        externalRoomTypeId: payload.externalRoomTypeId,
        externalRoomTypeIds: payload.externalRoomTypeIds,
        externalRatePlanId: payload.externalRatePlanId,
        externalRatePlanIds: payload.externalRatePlanIds,
        requestBody: { values: payload.values },
        providerStatus: "SYNCED",
        httpStatus: 202,
        success: true,
        taskId: `task-restrictions-${payload.chunkIndex || index + 1}`,
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
    expect(result.response.restrictionsSyncVersion).toBe("chunked-v2");
    expect(result.response.calledProvider).toBe(true);
    expect(result.response.requestCount).toBe(4);
    expect(pushRestrictions).toHaveBeenCalledTimes(4);
    expect(previewSpy).not.toHaveBeenCalled();
    const transformedPayloads = pushRestrictions.mock.calls.map((call) => call[1][0]);
    pushRestrictions.mock.calls.forEach((call) =>
      expect(call[2]).toEqual(
        expect.objectContaining({
          requestTimeoutMs: 10000,
          stopOnFailure: true,
        })
      )
    );
    expect(transformedPayloads).toHaveLength(4);
    expect(transformedPayloads.flatMap((payload) => payload.values)).toHaveLength(1000);
    expect(transformedPayloads.every((payload) => payload.values.length <= 250)).toBe(true);
    expect(transformedPayloads.map((payload) => payload.chunkIndex)).toEqual([1, 2, 3, 4]);
    expect(transformedPayloads.map((payload) => payload.chunkCount)).toEqual([4, 4, 4, 4]);
    expect(result.response.results[0]).toEqual(
      expect.objectContaining({
        success: true,
        taskId: "task-restrictions-1",
        chunkIndex: 1,
        chunkCount: 4,
        requestBody: expect.objectContaining({
          valuesOmitted: true,
          valueCount: 250,
          firstDate: "2026-05-24",
          lastDate: "2027-01-28",
          externalPropertyIds: ["external-property-1"],
          externalRoomTypeIds: ["room-type-1"],
          externalRatePlanIds: ["rate-plan-1"],
        }),
      })
    );
  });

  test("restrictions sync starts provider chunks concurrently instead of sequentially", async () => {
    const pending = [];
    const pushRestrictions = jest.fn(
      (_secret, payloads) =>
        new Promise((resolve) => {
          pending.push({ payload: payloads[0], resolve });
        })
    );
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

    const resultPromise = service.syncChannexRestrictions(
      "user-1",
      "domits-property-1",
      "2026-05-24",
      "2027-10-05",
      { skipEvidence: true }
    );

    await waitUntil(() => pushRestrictions.mock.calls.length === 4);
    expect(pending.map((entry) => entry.payload.chunkIndex)).toEqual([1, 2, 3, 4]);

    pending.forEach(({ payload, resolve }) =>
      resolve({
        success: true,
        results: [
          {
            chunkIndex: payload.chunkIndex,
            chunkCount: payload.chunkCount,
            externalPropertyId: payload.externalPropertyId,
            externalRoomTypeId: payload.externalRoomTypeId,
            externalRoomTypeIds: payload.externalRoomTypeIds,
            externalRatePlanId: payload.externalRatePlanId,
            externalRatePlanIds: payload.externalRatePlanIds,
            requestBody: { values: payload.values },
            providerStatus: "SYNCED",
            httpStatus: 202,
            success: true,
            taskId: `task-restrictions-${payload.chunkIndex}`,
            warnings: [],
            errorCode: null,
            errorMessage: null,
          },
        ],
      })
    );

    const result = await resultPromise;
    expect(result.statusCode).toBe(200);
    expect(result.response.requestCount).toBe(4);
    expect(result.response.results.map((item) => item.chunkIndex)).toEqual([1, 2, 3, 4]);
  });

  test("restrictions sync returns frontend pagination metadata and persists page evidence", async () => {
    const evidenceCreate = jest.fn(async (row) => row);
    const pushRestrictions = jest.fn(async (_secret, payloads) => ({
      success: true,
      results: payloads.map((payload) => ({
        chunkIndex: payload.chunkIndex,
        chunkCount: payload.chunkCount,
        externalPropertyId: payload.externalPropertyId,
        externalRoomTypeId: payload.externalRoomTypeId,
        externalRoomTypeIds: payload.externalRoomTypeIds,
        externalRatePlanId: payload.externalRatePlanId,
        externalRatePlanIds: payload.externalRatePlanIds,
        requestBody: { values: payload.values },
        providerStatus: "SYNCED",
        httpStatus: 202,
        success: true,
        taskId: `task-page-${payload.chunkIndex}`,
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
        restrictionsSyncMode: "frontend-paginated-v1",
        syncRunId: "sync-run-1",
        pageNumber: 1,
        totalPages: 17,
        pageSizeDays: 30,
        requestedFullRange: {
          dateFrom: "2026-05-24",
          dateTo: "2027-10-05",
          totalDays: 500,
        },
        pageRange: {
          dateFrom: "2026-05-24",
          dateTo: "2026-06-22",
          totalDays: 30,
        },
        evidencePersisted: true,
      })
    );
    expect(evidenceCreate).toHaveBeenCalledTimes(1);
    const persistedEvidence = evidenceCreate.mock.calls[0][0];
    expect(JSON.parse(persistedEvidence.providerResponseSummary).syncRun).toEqual(
      expect.objectContaining({
        syncRunId: "sync-run-1",
        pageNumber: 1,
        totalPages: 17,
      })
    );
    expect(JSON.parse(persistedEvidence.rawDetails).syncRun).toEqual(
      expect.objectContaining({
        requestedFullRange: expect.objectContaining({
          totalDays: 500,
        }),
      })
    );
    expect(JSON.parse(persistedEvidence.groupedOutboundPayloadSnapshot)[0].requestBody).toEqual(
      expect.objectContaining({
        valuesOmitted: true,
        valueCount: 30,
      })
    );
  });

  test("restrictions sync rejects requested full ranges over 500 days", async () => {
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
      "2026-06-22",
      {
        syncRunId: "sync-run-too-large",
        requestedDateFrom: "2026-05-24",
        requestedDateTo: "2027-10-06",
        pageNumber: 1,
        totalPages: 18,
        pageSizeDays: 30,
      }
    );

    expect(result.statusCode).toBe(400);
    expect(result.response).toEqual(
      expect.objectContaining({
        restrictionsSyncMode: "frontend-paginated-v1",
        errorCode: "CHANNEX_RESTRICTIONS_SYNC_REQUESTED_RANGE_TOO_LARGE",
        maxDays: 500,
        totalDays: 501,
      })
    );
    expect(pushRestrictions).not.toHaveBeenCalled();
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
        restrictionsSyncVersion: "chunked-v2",
        results: [
          expect.objectContaining({
            success: false,
            httpStatus: 503,
            endpoint: "/api/v1/restrictions",
            method: "POST",
            errorMessage: "Provider restrictions gateway unavailable",
            requestBody: expect.objectContaining({
              valuesOmitted: true,
              valueCount: 2,
            }),
          }),
        ],
      })
    );
  });

  test("restrictions sync returns controlled JSON when a provider chunk fails", async () => {
    const service = createService({
      channexProviderClient: {
        pushAvailability: jest.fn().mockResolvedValue({ results: [] }),
        pushRestrictions: jest.fn(async (_secret, payloads) => ({
          success: false,
          results: [
            {
              chunkIndex: payloads[0].chunkIndex,
              chunkCount: payloads[0].chunkCount,
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
        restrictionsSyncVersion: "chunked-v2",
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

  test("restrictions sync sends mapped Channex restriction fields from preview payloads", async () => {
    const pushRestrictions = jest.fn(async (_secret, payloads) => ({
      success: true,
      results: payloads.map((payload) => ({
        chunkIndex: payload.chunkIndex,
        chunkCount: payload.chunkCount,
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
        min_stay_through: 4,
      })
    );
    expect(outboundPayloads[0].values[0]).not.toHaveProperty("closed_to_departure");
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
});
