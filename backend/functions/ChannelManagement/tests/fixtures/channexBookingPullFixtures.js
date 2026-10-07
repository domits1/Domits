import ChannexBookingRevisionImportService from "../../../.shared/channelManagement/services/channexBookingRevisionImportService.js";

// Shared setup for the Channex booking pull tests: one property to pull for, the import service with
// stubbed repositories, and a clock frozen at START_MS.
export const START_MS = 1_000_000;

export const PULL_CONTEXT = {
  normalizedUserId: "user-1",
  normalizedDomitsPropertyId: "property-1",
  integration: { id: "account-1" },
  propertyMapping: { externalPropertyId: "channex-1" },
  secret: {},
};

export const buildImportService = (channexProviderClient) =>
  new ChannexBookingRevisionImportService({
    roomTypes: { listByAccountId: jest.fn(async () => []) },
    ratePlans: { listByAccountId: jest.fn(async () => []) },
    externalBookingImportRepository: { getDomitsPropertyContext: jest.fn(async () => ({})) },
    channexProviderClient,
    finalizeChannexSyncResult: async (result) => result,
  });

export const pullForProperty = (service, overrides = {}) =>
  service.pullLatestChannexBookingsForResolvedContext({ ...PULL_CONTEXT, ...overrides });

// Call inside a describe block.
export const freezeNowAtStart = () => {
  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(START_MS);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
};
