const IntegrationService = require("./integrationService.js").default;

const CHANNEX_TEST_FIXTURE = Object.freeze({
  integrationAccountId: "integration-account-1",
  domitsPropertyId: "domits-property-1",
  externalPropertyId: "external-property-1",
  externalRoomTypeId: "external-room-type-1",
  externalRatePlanId: "external-rate-plan-1",
  credentialsRef: "channex-secret-1",
  hostId: "host-1",
  guestName: "External Guest",
  arrivalDate: "2026-06-01",
  departureDate: "2026-06-03",
});

const buildMappingFixture = (fields = {}, overrides = {}) => ({
  domitsPropertyId: CHANNEX_TEST_FIXTURE.domitsPropertyId,
  externalPropertyId: CHANNEX_TEST_FIXTURE.externalPropertyId,
  status: "ACTIVE",
  ...fields,
  ...overrides,
});

const buildPropertyMapping = (overrides = {}) =>
  buildMappingFixture({ externalPropertyName: "Test Property" }, overrides);

const buildRoomTypeMapping = (overrides = {}) =>
  buildMappingFixture(
    {
      externalRoomTypeId: CHANNEX_TEST_FIXTURE.externalRoomTypeId,
      externalRoomTypeName: "Demo room",
    },
    overrides
  );

const buildRatePlanMapping = (overrides = {}) =>
  buildMappingFixture(
    {
      externalRoomTypeId: CHANNEX_TEST_FIXTURE.externalRoomTypeId,
      externalRatePlanId: CHANNEX_TEST_FIXTURE.externalRatePlanId,
      externalRatePlanName: "Standard",
    },
    overrides
  );

const buildIntegrationAccount = (overrides = {}) => ({
  id: CHANNEX_TEST_FIXTURE.integrationAccountId,
  status: "CONNECTED",
  credentialsRef: CHANNEX_TEST_FIXTURE.credentialsRef,
  ...overrides,
});

const buildRevisionRow = (overrides = {}) => ({
  id: "local-revision-1",
  integrationAccountId: CHANNEX_TEST_FIXTURE.integrationAccountId,
  domitsPropertyId: CHANNEX_TEST_FIXTURE.domitsPropertyId,
  externalPropertyId: CHANNEX_TEST_FIXTURE.externalPropertyId,
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

const buildRevisionRoomLine = (overrides = {}) => ({
  room_type_id: CHANNEX_TEST_FIXTURE.externalRoomTypeId,
  rate_plan_id: CHANNEX_TEST_FIXTURE.externalRatePlanId,
  ...overrides,
});

const buildRevisionRawPayload = ({
  revisionId = "revision-new-1",
  bookingId = "booking-ota-1",
  propertyId = CHANNEX_TEST_FIXTURE.externalPropertyId,
  status = "new",
  arrivalDate = CHANNEX_TEST_FIXTURE.arrivalDate,
  departureDate = CHANNEX_TEST_FIXTURE.departureDate,
  guestName = CHANNEX_TEST_FIXTURE.guestName,
  rooms = [buildRevisionRoomLine()],
  attributes = {},
} = {}) => ({
  id: revisionId,
  attributes: {
    booking_id: bookingId,
    property_id: propertyId,
    status,
    arrival_date: arrivalDate,
    departure_date: departureDate,
    customer: { name: guestName },
    rooms,
    ...attributes,
  },
});

const buildFeedRevision = (overrides = {}) => {
  const revision = {
    revisionId: "revision-new-1",
    bookingId: "booking-ota-1",
    propertyId: CHANNEX_TEST_FIXTURE.externalPropertyId,
    uniqueId: "unique-ota-1",
    systemId: "system-ota-1",
    otaReservationCode: "OTA-123",
    otaName: "Booking.com",
    status: "new",
    arrivalDate: CHANNEX_TEST_FIXTURE.arrivalDate,
    departureDate: CHANNEX_TEST_FIXTURE.departureDate,
    guestName: CHANNEX_TEST_FIXTURE.guestName,
    amount: "200.00",
    currency: "EUR",
    insertedAt: "2026-05-21T10:00:00Z",
    roomTypeId: CHANNEX_TEST_FIXTURE.externalRoomTypeId,
    ratePlanId: CHANNEX_TEST_FIXTURE.externalRatePlanId,
    ...overrides,
  };

  return {
    ...revision,
    rawPayload: Object.hasOwn(overrides, "rawPayload") ? overrides.rawPayload : buildRevisionRawPayload(revision),
  };
};

const buildPropertyContext = (overrides = {}) => ({
  propertyId: CHANNEX_TEST_FIXTURE.domitsPropertyId,
  hostId: CHANNEX_TEST_FIXTURE.hostId,
  propertyName: "Demo property",
  ...overrides,
});

const buildImportedBookingRow = (overrides = {}) => ({
  id: "domits-booking-1",
  propertyId: CHANNEX_TEST_FIXTURE.domitsPropertyId,
  hostId: CHANNEX_TEST_FIXTURE.hostId,
  guestName: CHANNEX_TEST_FIXTURE.guestName,
  arrivalDateMs: Date.parse(`${CHANNEX_TEST_FIXTURE.arrivalDate}T00:00:00.000Z`),
  departureDateMs: Date.parse(`${CHANNEX_TEST_FIXTURE.departureDate}T00:00:00.000Z`),
  status: "Paid",
  ...overrides,
});

const createListByAccountRepository = (rows) => ({
  listByAccountId: jest.fn().mockResolvedValue(rows),
});

const createAccountRepository = ({ account, channelAccounts }) => ({
  findByUserIdAndChannel: jest.fn().mockResolvedValue(account),
  listByChannel: jest.fn().mockResolvedValue(channelAccounts || (account ? [account] : [])),
});

const createReservationLinkRepository = (state) => ({
  getByIntegrationAccountIdAndExternalReservation: jest.fn().mockImplementation(async () => state.storedLink),
  upsert: jest.fn(async (data) => {
    state.storedLink = {
      id: state.storedLink?.id || "reservation-link-1",
      ...data,
      createdAt: state.storedLink?.createdAt || 1770000000000,
      updatedAt: 1770000001000,
    };
    return state.storedLink;
  }),
});

const createBookingRevisionRepository = ({ state, revisionRows }) => ({
  listByFilters: jest.fn().mockResolvedValue(revisionRows),
  getByIntegrationAccountIdAndRevisionId: jest.fn().mockImplementation(async () => state.storedRevision),
  upsert: jest.fn(async (data) => {
    state.storedRevision = buildRevisionRow({
      id: state.storedRevision?.id || "local-revision-1",
      ...data,
    });
    return state.storedRevision;
  }),
  markAcknowledged: jest.fn(async (_integrationAccountId, revisionId, acknowledgedAt) => {
    const acknowledgedRevision = {
      revisionId,
      acknowledgementState: "ACKNOWLEDGED",
      acknowledgedAt,
    };
    state.storedRevision = state.storedRevision
      ? buildRevisionRow({ ...state.storedRevision, ...acknowledgedRevision })
      : buildRevisionRow(acknowledgedRevision);
    return state.storedRevision;
  }),
});

const createExternalBookingImportRepository = ({ propertyContext, bookingRowsById }) => ({
  getDomitsPropertyContext: jest.fn().mockResolvedValue(propertyContext),
  getBookingById: jest.fn(async (bookingId) => bookingRowsById.get(bookingId) || null),
  createExternalBooking: jest.fn(async (data) => {
    const booking = buildImportedBookingRow({
      id: data.bookingId,
      propertyId: data.propertyId,
      hostId: data.hostId,
      guestName: data.guestName,
      arrivalDateMs: data.arrivalDateMs,
      departureDateMs: data.departureDateMs,
    });
    bookingRowsById.set(data.bookingId, booking);
    return booking;
  }),
  updateImportedBooking: jest.fn(async ({ bookingId, guestName, arrivalDateMs, departureDateMs }) => {
    const existing = bookingRowsById.get(bookingId);
    if (!existing) return null;
    const updated = buildImportedBookingRow({ ...existing, guestName, arrivalDateMs, departureDateMs });
    bookingRowsById.set(bookingId, updated);
    return updated;
  }),
  cancelImportedBooking: jest.fn(async (bookingId) => {
    const existing = bookingRowsById.get(bookingId);
    if (!existing) return null;
    const cancelled = { ...existing, status: "Cancelled" };
    bookingRowsById.set(bookingId, cancelled);
    return cancelled;
  }),
});

const createChannexProviderClient = (feedRevisions) => ({
  listBookingRevisionFeed: jest.fn().mockResolvedValue({
    success: true,
    revisions: feedRevisions,
    providerStatus: "ACTIVE",
    errorCode: null,
    errorMessage: null,
  }),
  getBookingRevision: jest.fn(),
  acknowledgeBookingRevision: jest.fn().mockResolvedValue({
    success: true,
    providerStatus: "ACKNOWLEDGED",
    errorCode: null,
    errorMessage: null,
  }),
});

const createSyncRepository = (override) =>
  override || {
    tryAcquireLock: jest.fn().mockResolvedValue({ acquired: true }),
    releaseLock: jest.fn().mockResolvedValue(null),
    insertLog: jest.fn(async (row) => row),
  };

const createEvidenceRepository = (override) =>
  override || {
    create: jest.fn(async (row) => row),
  };

const createService = ({
  account = buildIntegrationAccount(),
  revisionRows = [buildRevisionRow()],
  propertyMappings = [buildPropertyMapping()],
  roomTypeMappings = [buildRoomTypeMapping()],
  ratePlanMappings = [buildRatePlanMapping()],
  existingRevision = buildRevisionRow(),
  existingLink = null,
  feedRevisions = [],
  propertyContext = buildPropertyContext(),
  initialBookings = [],
  channelAccounts,
  sync: syncOverride = null,
  channexEvidence: channexEvidenceOverride = null,
} = {}) => {
  const state = {
    storedRevision: existingRevision,
    storedLink: existingLink,
  };
  const bookingRowsById = new Map(initialBookings.map((booking) => [booking.id, booking]));
  const accounts = createAccountRepository({ account, channelAccounts });
  const props = createListByAccountRepository(propertyMappings);
  const roomTypes = createListByAccountRepository(roomTypeMappings);
  const ratePlans = createListByAccountRepository(ratePlanMappings);
  const resLinks = createReservationLinkRepository(state);
  const channexBookingRevisions = createBookingRevisionRepository({ state, revisionRows });
  const externalBookingImportRepository = createExternalBookingImportRepository({ propertyContext, bookingRowsById });
  const channexProviderClient = createChannexProviderClient(feedRevisions);
  const sync = createSyncRepository(syncOverride);
  const channexEvidence = createEvidenceRepository(channexEvidenceOverride);

  const service = new IntegrationService({
    accounts,
    props,
    ratePlans,
    roomTypes,
    sync,
    resLinks,
    channexEvidence,
    channexBookingRevisions,
    externalBookingImportRepository,
    runner: {},
    credentialStore: {},
    holiduCredentialStore: {},
    holiduProviderClient: {},
    channexCredentialStore: {
      readSecretOrNull: jest.fn().mockResolvedValue({ apiKey: "secret" }),
    },
    channexProviderClient,
  });

  return {
    service,
    accounts,
    props,
    ratePlans,
    roomTypes,
    resLinks,
    channexBookingRevisions,
    channexProviderClient,
    externalBookingImportRepository,
    sync,
    channexEvidence,
    bookingRowsById,
  };
};

module.exports = {
  buildFeedRevision,
  buildImportedBookingRow,
  buildIntegrationAccount,
  buildPropertyContext,
  buildPropertyMapping,
  buildRatePlanMapping,
  buildRevisionRawPayload,
  buildRevisionRoomLine,
  buildRevisionRow,
  buildRoomTypeMapping,
  createService,
};
