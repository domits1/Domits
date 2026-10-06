jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./integrationService.secretsManagerMock.js"),
  { virtual: true }
);

const ChannexMappingService =
  require("../.shared/channelManagement/services/channexMappingService.js").default;

const body = {
  domitsPropertyId: "property-1",
  externalPropertyId: "external-property-1",
  externalRoomTypeId: "external-room-1",
  externalRatePlanId: "external-rate-1",
};

const buildService = (propertyOwner) => {
  const saved = { upsert: jest.fn().mockResolvedValue({}) };
  const service = new ChannexMappingService({
    accounts: {
      findByUserIdAndChannel: jest.fn().mockResolvedValue({
        id: "integration-account-1",
        status: "CONNECTED",
        credentialsRef: "channex-secret-1",
      }),
    },
    props: saved,
    roomTypes: saved,
    ratePlans: saved,
    propertyLookup: {
      getDomitsPropertyContext: jest
        .fn()
        .mockResolvedValue(propertyOwner === null ? null : { propertyId: "property-1", hostId: propertyOwner }),
    },
    channexCredentialStore: {},
    channexProviderClient: {},
  });
  return { service, saved };
};

// Every way to save a mapping decides whose Channex account a property's data goes through.
describe.each(["linkChannexProperty", "linkChannexRoomType", "linkChannexRatePlan", "saveChannexSetupMapping"])(
  "ChannexMappingService.%s property ownership",
  (method) => {
    test("saves the mapping for a property the user owns", async () => {
      const { service, saved } = buildService("user-1");

      const result = await service[method]("user-1", body);

      expect(result.statusCode).toBe(200);
      expect(saved.upsert).toHaveBeenCalled();
    });

    test("refuses a property owned by someone else with 403 and saves nothing", async () => {
      const { service, saved } = buildService("user-2");

      const result = await service[method]("user-1", body);

      expect(result).toEqual({
        statusCode: 403,
        response: expect.objectContaining({ errorCode: "CHANNEX_MAPPING_PROPERTY_NOT_OWNED" }),
      });
      expect(saved.upsert).not.toHaveBeenCalled();
    });

    test("refuses a property that does not exist with 404 and saves nothing", async () => {
      const { service, saved } = buildService(null);

      const result = await service[method]("user-1", body);

      expect(result).toEqual({
        statusCode: 404,
        response: expect.objectContaining({ errorCode: "CHANNEX_MAPPING_PROPERTY_NOT_FOUND" }),
      });
      expect(saved.upsert).not.toHaveBeenCalled();
    });
  }
);
