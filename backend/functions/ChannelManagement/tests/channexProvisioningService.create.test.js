import ChannexProvisioningService from "../../.shared/channelManagement/services/channexProvisioningService.js";

// Design note D2 (#506), step 3d-3: look before create. For each Channex object the service first lists
// what exists and adopts a match, so a retry after a lost answer never creates a second one.
// Each created or adopted id is saved before the next call, so a later attempt continues from there.
const listing = {
  propertyId: "listing-1",
  hostId: "host-1",
  title: "Villa Malee",
  propertyType: "Villa",
  guests: 8,
  location: { country: "Thailand", city: "Phuket" },
};
const place = { countryCode: "TH", timezone: "Asia/Bangkok" };
const OWN_LINK = "https://www.domits.com/listingdetails?ID=listing-1";
const account = { id: "account-1", credentialsRef: "domits-channex-secret" };
const freshClaim = () => ({ id: "claim-1", externalPropertyId: null, status: "PROVISIONING" });

const created = (externalId) => ({ success: true, externalId, outcomeUnknown: false });
const listed = (key, rows) => ({ success: true, [key]: rows });

const build = ({
  properties = [],
  roomTypes = [],
  ratePlans = [],
  inUse = new Set(),
  secret = { apiKey: "key-1" },
} = {}) => {
  const channex = {
    listProperties: jest.fn().mockResolvedValue(listed("properties", properties)),
    createProperty: jest.fn().mockResolvedValue(created("property-new")),
    listRoomTypes: jest.fn().mockResolvedValue(listed("roomTypes", roomTypes)),
    createRoomType: jest.fn().mockResolvedValue(created("room-new")),
    listRatePlans: jest.fn().mockResolvedValue(listed("ratePlans", ratePlans)),
    createRatePlan: jest.fn().mockResolvedValue(created("rate-new")),
  };
  const props = {
    isExternalPropertyInUse: jest.fn(async (id) => inUse.has(id)),
    setClaimExternalProperty: jest.fn().mockResolvedValue(undefined),
  };
  const roomTypeMappings = { upsert: jest.fn().mockResolvedValue({}) };
  const ratePlanMappings = { upsert: jest.fn().mockResolvedValue({}) };
  const service = new ChannexProvisioningService({
    props,
    roomTypes: roomTypeMappings,
    ratePlans: ratePlanMappings,
    channex,
    credentialStore: { readSecretOrNull: jest.fn().mockResolvedValue(secret) },
    credentialsRef: "domits-channex-secret",
  });
  const finish = jest
    .spyOn(service, "finishProvisioning")
    .mockResolvedValue({ statusCode: 200, response: { status: "PROVISIONED" } });
  return { service, channex, props, roomTypeMappings, ratePlanMappings, finish };
};

const run = (service, claim = freshClaim()) => service.createChannexObjects({ account, claim, listing, place });

describe("ChannexProvisioningService.createChannexObjects: nothing exists yet", () => {
  test("creates property, room type and rate plan in order, saving each id before the next call", async () => {
    const { service, channex, props, roomTypeMappings, ratePlanMappings, finish } = build();

    await run(service);

    expect(channex.createProperty).toHaveBeenCalledWith(
      { apiKey: "key-1" },
      expect.objectContaining({
        property: expect.objectContaining({ title: "Villa Malee", country: "TH", website: OWN_LINK }),
      }),
      { requestTimeoutMs: 7000 }
    );
    expect(props.setClaimExternalProperty).toHaveBeenCalledWith("claim-1", "property-new", "Villa Malee");
    expect(channex.createRoomType).toHaveBeenCalledWith(
      { apiKey: "key-1" },
      expect.objectContaining({ room_type: expect.objectContaining({ property_id: "property-new", occ_adults: 8 }) }),
      { requestTimeoutMs: 7000 }
    );
    expect(roomTypeMappings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ externalPropertyId: "property-new", externalRoomTypeId: "room-new", status: "ACTIVE" })
    );
    expect(channex.createRatePlan).toHaveBeenCalledWith(
      { apiKey: "key-1" },
      expect.objectContaining({ rate_plan: expect.objectContaining({ room_type_id: "room-new" }) }),
      { requestTimeoutMs: 7000 }
    );
    expect(ratePlanMappings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ externalRoomTypeId: "room-new", externalRatePlanId: "rate-new", status: "ACTIVE" })
    );
    expect(finish).toHaveBeenCalledWith(
      expect.objectContaining({ externalPropertyId: "property-new", externalRoomTypeId: "room-new", externalRatePlanId: "rate-new" })
    );
  });
});

describe("ChannexProvisioningService.createChannexObjects: look before create", () => {
  test("a claim that already has its Channex property does not look for or create one", async () => {
    const { service, channex } = build();

    await run(service, { ...freshClaim(), externalPropertyId: "property-saved" });

    expect(channex.listProperties).not.toHaveBeenCalled();
    expect(channex.createProperty).not.toHaveBeenCalled();
    expect(channex.listRoomTypes).toHaveBeenCalledWith({ apiKey: "key-1" }, "property-saved");
  });

  // The link is unique per listing; the title may have been changed in Channex since the lost answer.
  test("adopts one unused Channex property that carries this listing's link, whatever its title", async () => {
    const { service, channex, props } = build({
      properties: [{ externalPropertyId: "property-orphan", externalPropertyName: "Renamed in Channex", website: OWN_LINK }],
    });

    await run(service);

    expect(channex.createProperty).not.toHaveBeenCalled();
    expect(props.setClaimExternalProperty).toHaveBeenCalledWith("claim-1", "property-orphan", "Villa Malee");
  });

  test("adopts the property when Channex stored this listing's link in another form", async () => {
    const { service, channex } = build({
      properties: [
        {
          externalPropertyId: "property-orphan",
          externalPropertyName: "Villa Malee",
          website: "http://domits.com/listingdetails/?ID=listing-1",
        },
      ],
    });

    await run(service);

    expect(channex.createProperty).not.toHaveBeenCalled();
  });

  // All hosts share Domits' Channex key (D8): another host's "Villa Malee" must never become this listing.
  test.each([
    ["another listing's link", "https://www.domits.com/listingdetails?ID=listing-2"],
    ["no link at all", null],
  ])("never adopts a property with the same title but %s", async (_label, website) => {
    const { service, channex, props } = build({
      properties: [{ externalPropertyId: "property-other-host", externalPropertyName: "Villa Malee", website }],
    });

    await run(service);

    expect(channex.createProperty).toHaveBeenCalled();
    expect(props.setClaimExternalProperty).toHaveBeenCalledWith("claim-1", "property-new", "Villa Malee");
  });

  test("never adopts a property another mapping already uses, even with this listing's link", async () => {
    const { service, channex } = build({
      properties: [{ externalPropertyId: "property-taken", externalPropertyName: "Villa Malee", website: OWN_LINK }],
      inUse: new Set(["property-taken"]),
    });

    await run(service);

    expect(channex.createProperty).toHaveBeenCalled();
  });

  test("two unused properties with this listing's link stop with needs attention, creating nothing", async () => {
    const { service, channex } = build({
      properties: [
        { externalPropertyId: "property-a", externalPropertyName: "Villa Malee", website: OWN_LINK },
        { externalPropertyId: "property-b", externalPropertyName: "Villa Malee", website: OWN_LINK },
      ],
    });

    const result = await run(service);

    expect(result).toEqual({
      statusCode: 409,
      response: expect.objectContaining({ errorCode: "DISTRIBUTION_NEEDS_ATTENTION" }),
    });
    expect(channex.createProperty).not.toHaveBeenCalled();
    expect(channex.createRoomType).not.toHaveBeenCalled();
  });

  test("adopts the room type and rate plan that already exist under the property", async () => {
    const { service, channex, roomTypeMappings, ratePlanMappings } = build({
      roomTypes: [{ externalRoomTypeId: "room-existing", externalRoomTypeName: "Villa Malee" }],
      ratePlans: [{ externalRatePlanId: "rate-existing", externalRatePlanName: "Standard Rate" }],
    });

    await run(service, { ...freshClaim(), externalPropertyId: "property-saved" });

    expect(channex.createRoomType).not.toHaveBeenCalled();
    expect(channex.createRatePlan).not.toHaveBeenCalled();
    expect(roomTypeMappings.upsert).toHaveBeenCalledWith(expect.objectContaining({ externalRoomTypeId: "room-existing" }));
    expect(ratePlanMappings.upsert).toHaveBeenCalledWith(expect.objectContaining({ externalRatePlanId: "rate-existing" }));
  });
});

describe("ChannexProvisioningService.createChannexObjects: when Channex does not cooperate", () => {
  let log;
  beforeEach(() => {
    log = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => log.mockRestore());

  // The create may still have happened; the next attempt looks first and adopts it.
  test("an unknown create outcome stops with try again, before the next object", async () => {
    const { service, channex, props } = build();
    channex.createProperty.mockResolvedValue({ success: false, outcomeUnknown: true, errorCode: "CHANNEX_CREATE_TIMEOUT" });

    const result = await run(service);

    expect(result).toEqual({
      statusCode: 503,
      response: expect.objectContaining({ errorCode: "DISTRIBUTION_TRY_AGAIN" }),
    });
    expect(props.setClaimExternalProperty).not.toHaveBeenCalled();
    expect(channex.createRoomType).not.toHaveBeenCalled();
  });

  test("a create Channex was too busy for answers try again, not refused", async () => {
    const { service, channex } = build();
    channex.createProperty.mockResolvedValue({ success: false, outcomeUnknown: false, retryable: true, errorCode: "CHANNEX_CREATE_429" });

    expect((await run(service)).response.errorCode).toBe("DISTRIBUTION_TRY_AGAIN");
  });

  test("a refused create answers 502 with Channex's field messages", async () => {
    const { service, channex } = build();
    const details = { occ_adults: ["must be greater than 0"] };
    channex.createProperty.mockResolvedValue({
      success: false,
      outcomeUnknown: false,
      errorCode: "validation_error",
      validationDetails: details,
    });

    const result = await run(service);

    expect(result).toEqual({
      statusCode: 502,
      response: expect.objectContaining({ errorCode: "DISTRIBUTION_CHANNEX_REFUSED", validationDetails: details }),
    });
  });

  // The host only sees a general text; the log says which object Channex refused and why (live check, 26 Nov).
  test("a failed create is logged with the object, the listing and Channex's answer", async () => {
    const { service, channex } = build();
    channex.createRoomType.mockResolvedValue({
      success: false,
      outcomeUnknown: false,
      httpStatus: 403,
      errorCode: "forbidden",
      errorMessage: "Forbidden",
    });

    await run(service);

    expect(JSON.parse(log.mock.calls[0][0])).toEqual({
      event: "CHANNEX_PROVISIONING_CREATE_FAILED",
      object: "roomType",
      domitsPropertyId: "listing-1",
      httpStatus: 403,
      errorCode: "forbidden",
      errorMessage: "Forbidden",
      validationDetails: null,
    });
  });

  test("a refused payload's field messages are in the log too", async () => {
    const { service, channex } = build();
    const details = { occ_adults: ["must be greater than 0"] };
    channex.createProperty.mockResolvedValue({ success: false, outcomeUnknown: false, httpStatus: 422, validationDetails: details });

    await run(service);

    expect(JSON.parse(log.mock.calls[0][0]).validationDetails).toEqual(details);
  });

  // Without the list Domits cannot know whether it already exists, so it does not create blindly.
  test("a list that fails stops with try again instead of creating", async () => {
    const { service, channex } = build();
    channex.listProperties.mockResolvedValue({ success: false, properties: [], errorCode: "CHANNEX_PROPERTIES_500" });

    const result = await run(service);

    expect(result.response.errorCode).toBe("DISTRIBUTION_TRY_AGAIN");
    expect(channex.createProperty).not.toHaveBeenCalled();
  });

  test("a missing Channex key answers 503 not configured, calling nothing", async () => {
    const { service, channex } = build({ secret: null });

    const result = await run(service);

    expect(result.response.errorCode).toBe("DISTRIBUTION_NOT_CONFIGURED");
    expect(channex.listProperties).not.toHaveBeenCalled();
  });
});
