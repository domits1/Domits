import ChannexBookingWebhookService from "../../.shared/channelManagement/services/channexBookingWebhookService.js";

const RECEIVED_AT_MS = 1_000_000;
const MAPPING = { integrationAccountId: "account-1", domitsPropertyId: "property-1", externalPropertyId: "channex-1" };
const INTEGRATION = { id: "account-1", userId: "host-1", status: "CONNECTED", credentialsRef: "domits/channex/host-1/account-1" };
const CHANNEX_SECRET = { apiKey: "key-1" };

const pullResult = (overrides = {}) => ({
  statusCode: 200,
  response: { fetchedCount: 1, ackedCount: 1, unackedCount: 0, errors: [], overallSuccess: true, ...overrides },
});

const buildService = ({ mapping = MAPPING, integration = INTEGRATION, secret = CHANNEX_SECRET, pull = pullResult() } = {}) => {
  const deps = {
    props: { findActiveChannexMappingByExternalPropertyId: jest.fn(async () => mapping) },
    accounts: { getById: jest.fn(async () => integration), touchSyncFailure: jest.fn(async () => null) },
    channexCredentialStore: { readSecretOrNull: jest.fn(async () => secret) },
    sync: {
      tryAcquireLock: jest.fn(async () => ({ acquired: true })),
      releaseLock: jest.fn(async () => null),
    },
    pullLatestChannexBookingsForResolvedContext: jest.fn(async () => pull),
  };
  const service = new ChannexBookingWebhookService({ ...deps, now: () => RECEIVED_AT_MS });
  return { service, ...deps };
};

const receive = (service) =>
  service.receiveBookingEvent({ externalPropertyId: "channex-1", requestId: "request-1", receivedAtMs: RECEIVED_AT_MS });

let errorLog;

describe("ChannexBookingWebhookService", () => {
  beforeEach(() => {
    errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("pulls the mapped property's feed with the webhook trigger and a 20-second budget from arrival", async () => {
    const { service, pullLatestChannexBookingsForResolvedContext } = buildService();

    const result = await receive(service);

    expect(pullLatestChannexBookingsForResolvedContext).toHaveBeenCalledWith(
      expect.objectContaining({
        normalizedUserId: "host-1",
        normalizedDomitsPropertyId: "property-1",
        integration: INTEGRATION,
        propertyMapping: MAPPING,
        secret: CHANNEX_SECRET,
        trigger: "WEBHOOK",
        deadlineMs: RECEIVED_AT_MS + 20_000,
      })
    );
    expect(result).toMatchObject({ statusCode: 200, outcome: "PROCESSED", domitsPropertyId: "property-1" });
  });

  test("answers 200 PROPERTY_NOT_MAPPED and pulls nothing for an unmapped Channex property", async () => {
    const { service, pullLatestChannexBookingsForResolvedContext, sync } = buildService({ mapping: null });

    await expect(receive(service)).resolves.toMatchObject({ statusCode: 200, outcome: "PROPERTY_NOT_MAPPED" });
    expect(sync.tryAcquireLock).not.toHaveBeenCalled();
    expect(pullLatestChannexBookingsForResolvedContext).not.toHaveBeenCalled();
  });

  // The mapping lookup only checks the mapping; a disconnected account must not import bookings.
  it.each([
    { description: "missing", integration: null },
    { description: "disconnected", integration: { ...INTEGRATION, status: "DISCONNECTED" } },
  ])("answers 200 INTEGRATION_NOT_CONNECTED when the account is $description", async ({ integration }) => {
    const { service, pullLatestChannexBookingsForResolvedContext } = buildService({ integration });

    await expect(receive(service)).resolves.toMatchObject({ statusCode: 200, outcome: "INTEGRATION_NOT_CONNECTED" });
    expect(pullLatestChannexBookingsForResolvedContext).not.toHaveBeenCalled();
  });

  test("answers 503 when the account's Channex credentials cannot be read", async () => {
    const { service, channexCredentialStore, pullLatestChannexBookingsForResolvedContext } = buildService();
    channexCredentialStore.readSecretOrNull.mockRejectedValue(new Error("ThrottlingException"));

    await expect(receive(service)).resolves.toMatchObject({ statusCode: 503, outcome: "CREDENTIALS_UNREADABLE" });
    expect(pullLatestChannexBookingsForResolvedContext).not.toHaveBeenCalled();
  });

  // Incomplete credentials do not fix themselves on a retry, so retrying for 24 hours only adds noise.
  test("answers 200 CREDENTIALS_INVALID when the stored credentials are incomplete", async () => {
    const { service, pullLatestChannexBookingsForResolvedContext } = buildService({ secret: { unrelated: true } });

    await expect(receive(service)).resolves.toMatchObject({ statusCode: 200, outcome: "CREDENTIALS_INVALID" });
    expect(pullLatestChannexBookingsForResolvedContext).not.toHaveBeenCalled();
  });

  test("takes the same per-property lock as booking polling", async () => {
    const { service, sync } = buildService();

    await receive(service);

    expect(sync.tryAcquireLock).toHaveBeenCalledWith("account-1", "booking_poll:property-1", {
      staleBeforeMs: RECEIVED_AT_MS - 5 * 60 * 1000,
    });
  });

  test("answers 503 LOCKED and pulls nothing while another pull holds the lock", async () => {
    const { service, sync, pullLatestChannexBookingsForResolvedContext } = buildService();
    sync.tryAcquireLock.mockResolvedValue({ acquired: false });

    await expect(receive(service)).resolves.toMatchObject({ statusCode: 503, outcome: "LOCKED" });
    expect(pullLatestChannexBookingsForResolvedContext).not.toHaveBeenCalled();
    expect(sync.releaseLock).not.toHaveBeenCalled();
  });

  test("releases the lock after a successful pull", async () => {
    const { service, sync } = buildService();

    await receive(service);

    expect(sync.releaseLock).toHaveBeenCalledWith("account-1", "booking_poll:property-1", expect.objectContaining({ status: "SUCCESS" }));
  });

  // A failing revision is caught inside the pull and never throws, so a thrown error is infrastructure
  // (database, AWS). Those deserve Channex's retry, even when the error carries no code at all.
  it.each([
    {
      description: "the pull throws a database conflict",
      arrange: ({ pullLatestChannexBookingsForResolvedContext }) =>
        pullLatestChannexBookingsForResolvedContext.mockRejectedValue(Object.assign(new Error("conflict"), { code: "40001" })),
    },
    {
      description: "the database connection cannot be opened (an error without a code)",
      arrange: ({ pullLatestChannexBookingsForResolvedContext }) =>
        pullLatestChannexBookingsForResolvedContext.mockRejectedValue(
          new Error("Something went wrong while initializing database connection.")
        ),
    },
    {
      description: "taking the lock throws",
      arrange: ({ sync }) => sync.tryAcquireLock.mockRejectedValue(Object.assign(new Error("conflict"), { code: "40001" })),
    },
    {
      description: "the mapping lookup throws",
      arrange: ({ props }) => props.findActiveChannexMappingByExternalPropertyId.mockRejectedValue(new Error("timeout")),
    },
  ])("answers 503 UNEXPECTED_ERROR when $description", async ({ arrange }) => {
    const deps = buildService();
    arrange(deps);

    await expect(receive(deps.service)).resolves.toMatchObject({ statusCode: 503, outcome: "UNEXPECTED_ERROR" });
  });

  test("releases the lock as FAILED when the pull throws", async () => {
    const { service, sync, pullLatestChannexBookingsForResolvedContext } = buildService();
    pullLatestChannexBookingsForResolvedContext.mockRejectedValue(new Error("boom"));

    await receive(service);

    expect(sync.releaseLock).toHaveBeenCalledWith("account-1", "booking_poll:property-1", expect.objectContaining({ status: "FAILED" }));
  });

  // Channex retries quietly; without the cause in the logs nobody can tell why bookings stopped.
  test("logs a thrown error with its name, message, code and the request id", async () => {
    const { service, pullLatestChannexBookingsForResolvedContext } = buildService();
    pullLatestChannexBookingsForResolvedContext.mockRejectedValue(
      Object.assign(new Error("Connection terminated unexpectedly"), { code: "57P01" })
    );

    await receive(service);

    expect(errorLog).toHaveBeenCalledTimes(1);
    expect(JSON.parse(errorLog.mock.calls[0][0])).toEqual({
      event: "CHANNEX_BOOKING_WEBHOOK_UNEXPECTED_ERROR",
      requestId: "request-1",
      externalPropertyId: "channex-1",
      errorName: "Error",
      errorMessage: "Connection terminated unexpectedly",
      errorCode: "57P01",
    });
  });

  test("logs why the account's Channex credentials could not be read", async () => {
    const { service, channexCredentialStore } = buildService();
    channexCredentialStore.readSecretOrNull.mockRejectedValue(
      Object.assign(new Error("Rate exceeded"), { name: "ThrottlingException" })
    );

    await receive(service);

    expect(JSON.parse(errorLog.mock.calls[0][0])).toMatchObject({
      event: "CHANNEX_BOOKING_WEBHOOK_CREDENTIALS_UNREADABLE",
      requestId: "request-1",
      errorName: "ThrottlingException",
      errorMessage: "Rate exceeded",
    });
  });

  test("passes the classification of the pull through", async () => {
    const { service } = buildService({ pull: pullResult({ stoppedAtDeadline: true, overallSuccess: false }) });

    await expect(receive(service)).resolves.toMatchObject({ statusCode: 503, outcome: "DEADLINE_REACHED" });
  });

  // Without this, nobody notices that bookings stopped arriving because the key was revoked.
  test("marks the account when Channex rejects its key on the feed", async () => {
    const { service, accounts } = buildService({
      pull: { statusCode: 502, response: { httpStatus: 401, providerStatus: "UNAUTHORIZED" } },
    });

    await expect(receive(service)).resolves.toMatchObject({ statusCode: 200, outcome: "FEED_UNAUTHORIZED" });
    expect(accounts.touchSyncFailure).toHaveBeenCalledWith(
      "account-1",
      "CHANNEX_BOOKING_FEED_UNAUTHORIZED",
      expect.any(String)
    );
  });

  test("returns the pull counts for the log line", async () => {
    const { service } = buildService({ pull: pullResult({ fetchedCount: 3, ackedCount: 2, unackedCount: 1 }) });

    await expect(receive(service)).resolves.toMatchObject({ fetchedCount: 3, ackedCount: 2, unackedCount: 1 });
  });

  test("returns the feed meta for the log line", async () => {
    const { service } = buildService({ pull: pullResult({ feedMeta: { page: 1, total: 12 } }) });

    await expect(receive(service)).resolves.toMatchObject({ feedMeta: { page: 1, total: 12 } });
  });
});
