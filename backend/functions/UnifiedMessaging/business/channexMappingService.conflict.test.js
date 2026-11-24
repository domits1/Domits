jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./integrationService.secretsManagerMock.js"),
  { virtual: true }
);

const ChannexMappingService =
  require("../.shared/channelManagement/services/channexMappingService.js").default;
const { MappingConflictError } = require("../.shared/integrations/repositories/integrationPropertyRepository.js");

const body = {
  domitsPropertyId: "property-1",
  externalPropertyId: "channex-new",
  externalRoomTypeId: "external-room-1",
  externalRatePlanId: "external-rate-1",
};

const buildService = () => {
  const props = { upsert: jest.fn().mockRejectedValue(new MappingConflictError("channex-old")) };
  const roomTypes = { upsert: jest.fn().mockResolvedValue({}) };
  const ratePlans = { upsert: jest.fn().mockResolvedValue({}) };
  const service = new ChannexMappingService({
    accounts: {
      findByUserIdAndChannel: jest.fn().mockResolvedValue({
        id: "integration-account-1",
        status: "CONNECTED",
        credentialsRef: "channex-secret-1",
      }),
    },
    props,
    roomTypes,
    ratePlans,
    propertyLookup: {
      getDomitsPropertyContext: jest.fn().mockResolvedValue({ propertyId: "property-1", hostId: "user-1" }),
    },
    channexCredentialStore: {},
    channexProviderClient: {},
  });
  return { service, roomTypes, ratePlans };
};

// Design note D2: a listing already connected to another Channex property is refused with a clear
// 409, not a 500, so the host or admin knows to turn the OTAs off first.
describe.each(["linkChannexProperty", "saveChannexSetupMapping"])(
  "ChannexMappingService.%s with another Channex property in use",
  (method) => {
    test("answers 409 with the Channex property that is already connected", async () => {
      const { service } = buildService();

      const result = await service[method]("user-1", body);

      expect(result).toEqual({
        statusCode: 409,
        response: expect.objectContaining({
          errorCode: "CHANNEX_PROPERTY_ALREADY_MAPPED",
          existingExternalPropertyId: "channex-old",
        }),
      });
    });

    test("saves no room type or rate plan for the refused property", async () => {
      const { service, roomTypes, ratePlans } = buildService();

      await service[method]("user-1", body);

      expect(roomTypes.upsert).not.toHaveBeenCalled();
      expect(ratePlans.upsert).not.toHaveBeenCalled();
    });
  }
);
