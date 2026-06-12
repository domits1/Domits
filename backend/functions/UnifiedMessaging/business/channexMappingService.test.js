jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./integrationService.secretsManagerMock.js"),
  { virtual: true }
);

const ChannexMappingService =
  require("../.shared/channelManagement/services/channexMappingService.js").default;

const buildService = ({ propertyMappings = [], roomTypeMappings = [], ratePlanMappings = [] } = {}) =>
  new ChannexMappingService({
    accounts: {
      findByUserIdAndChannel: jest.fn().mockResolvedValue({
        id: "integration-account-1",
        status: "CONNECTED",
        credentialsRef: "channex-secret-1",
      }),
    },
    props: {
      listByAccountId: jest.fn().mockResolvedValue(propertyMappings),
    },
    roomTypes: {
      listByAccountId: jest.fn().mockResolvedValue(roomTypeMappings),
    },
    ratePlans: {
      listByAccountId: jest.fn().mockResolvedValue(ratePlanMappings),
    },
    channexCredentialStore: {},
    channexProviderClient: {},
  });

describe("ChannexMappingService", () => {
  test("computes readiness using mappings scoped to the selected external property", async () => {
    const service = buildService({
      propertyMappings: [
        {
          domitsPropertyId: "property-1",
          externalPropertyId: "external-property-1",
          externalPropertyName: "Selected property",
          status: "ACTIVE",
        },
      ],
      roomTypeMappings: [
        {
          domitsPropertyId: "property-1",
          externalPropertyId: "external-property-2",
          externalRoomTypeId: "wrong-room",
          status: "ACTIVE",
        },
        {
          domitsPropertyId: "property-1",
          externalPropertyId: "external-property-1",
          externalRoomTypeId: "selected-room",
          status: "ACTIVE",
        },
      ],
      ratePlanMappings: [
        {
          domitsPropertyId: "property-1",
          externalPropertyId: "external-property-1",
          externalRoomTypeId: "selected-room",
          externalRatePlanId: "selected-rate",
          status: "ACTIVE",
        },
      ],
    });

    const result = await service.getChannexAriTargets("user-1", "property-1");

    expect(result).toEqual({
      statusCode: 200,
      response: expect.objectContaining({
        ready: true,
        missingMappings: [],
        propertyMapping: expect.objectContaining({
          externalPropertyId: "external-property-1",
        }),
        roomTypeMappings: [
          expect.objectContaining({
            externalRoomTypeId: "selected-room",
          }),
        ],
        ratePlanMappings: [
          expect.objectContaining({
            externalRatePlanId: "selected-rate",
          }),
        ],
      }),
    });
  });

  test("reports missing room and rate mappings without changing the response contract", async () => {
    const service = buildService({
      propertyMappings: [
        {
          domitsPropertyId: "property-1",
          externalPropertyId: "external-property-1",
          status: "ACTIVE",
        },
      ],
    });

    const result = await service.getChannexAriTargets("user-1", "property-1");

    expect(result).toEqual({
      statusCode: 200,
      response: expect.objectContaining({
        ready: false,
        missingMappings: [
          "ROOM_TYPE_MAPPING_MISSING",
          "RATE_PLAN_MAPPING_MISSING",
        ],
        roomTypeMappings: [],
        ratePlanMappings: [],
      }),
    });
  });
});
