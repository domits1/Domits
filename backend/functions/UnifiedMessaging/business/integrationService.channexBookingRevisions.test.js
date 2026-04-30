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

const IntegrationService = require("./integrationService.js").default;

const buildRevisionRow = (overrides = {}) => ({
  id: "local-revision-1",
  integrationAccountId: "integration-account-1",
  domitsPropertyId: "domits-property-1",
  externalPropertyId: "external-property-1",
  externalReservationId: "booking-1",
  revisionId: "revision-1",
  bookingStatus: "new",
  arrivalDate: "2026-05-01",
  departureDate: "2026-05-05",
  guestSummary: "Guest Example",
  rawPayload: JSON.stringify({ provider: "CHANNEX", payload: { id: "revision-1" } }),
  acknowledgementState: "RECEIVED",
  acknowledgedAt: null,
  createdAt: 1770000000000,
  updatedAt: 1770000001000,
  ...overrides,
});

const createService = ({
  account = {
    id: "integration-account-1",
    status: "CONNECTED",
    credentialsRef: "channex-secret-1",
  },
  revisionRows = [buildRevisionRow()],
} = {}) => {
  const accounts = {
    findByUserIdAndChannel: jest.fn().mockResolvedValue(account),
  };
  const channexBookingRevisions = {
    listByFilters: jest.fn().mockResolvedValue(revisionRows),
  };
  const channexProviderClient = {
    listBookingRevisionFeed: jest.fn(),
    getBookingRevision: jest.fn(),
    acknowledgeBookingRevision: jest.fn(),
  };

  const service = new IntegrationService({
    accounts,
    props: {},
    ratePlans: {},
    roomTypes: {},
    sync: {},
    resLinks: {},
    channexEvidence: {},
    channexBookingRevisions,
    runner: {},
    credentialStore: {},
    holiduCredentialStore: {},
    holiduProviderClient: {},
    channexCredentialStore: {},
    channexProviderClient,
  });

  return {
    service,
    accounts,
    channexBookingRevisions,
    channexProviderClient,
  };
};

describe("IntegrationService Channex booking revision listing", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("missing userId returns a validation response", async () => {
    const { service, accounts, channexBookingRevisions } = createService();

    const result = await service.listChannexBookingRevisions(null, {
      domitsPropertyId: "domits-property-1",
    });

    expect(result).toEqual({
      statusCode: 400,
      response: { error: "Missing required query param: userId" },
    });
    expect(accounts.findByUserIdAndChannel).not.toHaveBeenCalled();
    expect(channexBookingRevisions.listByFilters).not.toHaveBeenCalled();
  });

  test("missing domitsPropertyId returns a validation response", async () => {
    const { service, accounts, channexBookingRevisions } = createService();

    const result = await service.listChannexBookingRevisions("user-1");

    expect(result).toEqual({
      statusCode: 400,
      response: { error: "Missing required query param: domitsPropertyId" },
    });
    expect(accounts.findByUserIdAndChannel).not.toHaveBeenCalled();
    expect(channexBookingRevisions.listByFilters).not.toHaveBeenCalled();
  });

  test("happy path lists persisted revisions without raw payload by default", async () => {
    const row = buildRevisionRow();
    const { service } = createService({ revisionRows: [row] });

    const result = await service.listChannexBookingRevisions("user-1", {
      domitsPropertyId: "domits-property-1",
    });

    expect(result.statusCode).toBe(200);
    expect(result.response).toMatchObject({
      channel: "CHANNEX",
      integrationAccountId: "integration-account-1",
      domitsPropertyId: "domits-property-1",
      count: 1,
      includeRawPayload: false,
    });
    expect(result.response.revisions).toEqual([
      {
        id: row.id,
        integrationAccountId: row.integrationAccountId,
        domitsPropertyId: row.domitsPropertyId,
        externalPropertyId: row.externalPropertyId,
        externalReservationId: row.externalReservationId,
        revisionId: row.revisionId,
        bookingStatus: row.bookingStatus,
        arrivalDate: row.arrivalDate,
        departureDate: row.departureDate,
        guestSummary: row.guestSummary,
        acknowledgementState: row.acknowledgementState,
        acknowledgedAt: row.acknowledgedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    ]);
    expect(result.response.revisions[0]).not.toHaveProperty("rawPayload");
  });

  test("filters returned rows by domitsPropertyId", async () => {
    const { service, channexBookingRevisions } = createService({
      revisionRows: [
        buildRevisionRow({ id: "match", domitsPropertyId: "domits-property-1" }),
        buildRevisionRow({ id: "other-property", domitsPropertyId: "domits-property-2" }),
      ],
    });

    const result = await service.listChannexBookingRevisions("user-1", {
      domitsPropertyId: "domits-property-1",
    });

    expect(channexBookingRevisions.listByFilters).toHaveBeenCalledWith({
      integrationAccountId: "integration-account-1",
      domitsPropertyId: "domits-property-1",
      limit: 50,
    });
    expect(result.response.revisions).toHaveLength(1);
    expect(result.response.revisions[0].id).toBe("match");
  });

  test("uses default limit 50", async () => {
    const { service, channexBookingRevisions } = createService();

    const result = await service.listChannexBookingRevisions("user-1", {
      domitsPropertyId: "domits-property-1",
    });

    expect(result.response.limit).toBe(50);
    expect(channexBookingRevisions.listByFilters).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 })
    );
  });

  test("clamps limit to max 100", async () => {
    const { service, channexBookingRevisions } = createService();

    const result = await service.listChannexBookingRevisions("user-1", {
      domitsPropertyId: "domits-property-1",
      limit: 999,
    });

    expect(result.response.limit).toBe(100);
    expect(channexBookingRevisions.listByFilters).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 })
    );
  });

  test("includes rawPayload only when requested", async () => {
    const rawPayload = { provider: "CHANNEX", payload: { id: "revision-1", guest: "Guest Example" } };
    const { service } = createService({
      revisionRows: [buildRevisionRow({ rawPayload: JSON.stringify(rawPayload) })],
    });

    const result = await service.listChannexBookingRevisions("user-1", {
      domitsPropertyId: "domits-property-1",
      includeRawPayload: true,
    });

    expect(result.response.includeRawPayload).toBe(true);
    expect(result.response.revisions[0].rawPayload).toEqual(rawPayload);
  });

  test("does not leak rows from another integration account", async () => {
    const { service } = createService({
      revisionRows: [
        buildRevisionRow({ id: "own-account", integrationAccountId: "integration-account-1" }),
        buildRevisionRow({ id: "other-account", integrationAccountId: "integration-account-2" }),
      ],
    });

    const result = await service.listChannexBookingRevisions("user-1", {
      domitsPropertyId: "domits-property-1",
    });

    expect(result.response.revisions).toHaveLength(1);
    expect(result.response.revisions[0].id).toBe("own-account");
  });

  test("does not call the Channex provider client", async () => {
    const { service, channexProviderClient } = createService();

    await service.listChannexBookingRevisions("user-1", {
      domitsPropertyId: "domits-property-1",
      includeRawPayload: true,
    });

    expect(channexProviderClient.listBookingRevisionFeed).not.toHaveBeenCalled();
    expect(channexProviderClient.getBookingRevision).not.toHaveBeenCalled();
    expect(channexProviderClient.acknowledgeBookingRevision).not.toHaveBeenCalled();
  });
});
