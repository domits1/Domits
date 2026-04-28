jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => ({
    SecretsManagerClient: class {
      send() {
        return Promise.resolve({});
      }
    },
    CreateSecretCommand: class {},
    PutSecretValueCommand: class {},
    GetSecretValueCommand: class {},
    DescribeSecretCommand: class {},
    DeleteSecretCommand: class {},
  }),
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

const buildReadyAriTargets = () => ({
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
      pushRestrictions: jest.fn().mockResolvedValue({ results: [] }),
    },
    ...overrides,
  });

  jest.spyOn(service, "getChannexAriTargets").mockResolvedValue(buildReadyAriTargets());
  return service;
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

  test("restrictions sync sends mapped Channex restriction fields from preview payloads", async () => {
    const channexProviderClient = {
      pushRestrictions: jest.fn().mockResolvedValue({ results: [] }),
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
    expect(channexProviderClient.pushRestrictions).toHaveBeenCalledTimes(1);

    const [, outboundPayloads] = channexProviderClient.pushRestrictions.mock.calls[0];
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
