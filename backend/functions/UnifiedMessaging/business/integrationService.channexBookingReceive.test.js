jest.mock("@aws-sdk/client-secrets-manager", () => require("./integrationService.secretsManagerMock.js"), {
  virtual: true,
});

jest.mock("../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

const channexBookingRevisionFixture = require("./integrationService.channexBookingRevisions.fixture.js");

const buildFeedRevision = channexBookingRevisionFixture.buildFeedRevision;
const createService = channexBookingRevisionFixture.createService;

const USER_ID = "host-1";
const DOMITS_PROPERTY_ID = "domits-property-1";
const EXTERNAL_PROPERTY_ID = "external-property-1";
const INTEGRATION_ACCOUNT_ID = "integration-account-1";
const ACKNOWLEDGEMENT_SEPARATE_NOTE =
  "Acknowledgement is intentionally separate in this certification-prep slice and is not performed by this receive endpoint.";

const receive = (service, userId = USER_ID, domitsPropertyId = DOMITS_PROPERTY_ID) =>
  service.receiveChannexBookingRevisions(userId, domitsPropertyId);

describe("IntegrationService Channex booking receive", () => {
  describe("required parameters are rejected before the provider is called", () => {
    it.each([
      {
        description: "userId is missing",
        args: ["", DOMITS_PROPERTY_ID],
        error: "Missing required query param: userId",
      },
      {
        description: "domitsPropertyId is missing",
        args: [USER_ID, ""],
        error: "Missing required query param: domitsPropertyId",
      },
    ])("returns 400 when $description", async ({ args, error }) => {
      const { service, channexProviderClient } = createService();

      const result = await service.receiveChannexBookingRevisions(...args);

      expect(result.statusCode).toBe(400);
      expect(result.response).toEqual(expect.objectContaining({ error }));
      expect(channexProviderClient.listBookingRevisionFeed).not.toHaveBeenCalled();
    });

    it("still records evidence when only domitsPropertyId is missing", async () => {
      const { service, channexEvidence } = createService();

      await service.receiveChannexBookingRevisions(USER_ID, "");

      expect(channexEvidence.create).toHaveBeenCalledWith(
        expect.objectContaining({
          syncType: "booking_receive",
          status: "INVALID_REQUEST",
          errors: JSON.stringify([
            {
              errorCode: "MISSING_DOMITS_PROPERTY_ID",
              errorMessage: "Missing required query param: domitsPropertyId",
            },
          ]),
        })
      );
    });

    it("records no evidence at all when userId is missing, because the account cannot be resolved", async () => {
      const { service, channexEvidence } = createService();

      const result = await service.receiveChannexBookingRevisions("", DOMITS_PROPERTY_ID);

      expect(channexEvidence.create).not.toHaveBeenCalled();
      expect(result.response).toEqual(
        expect.objectContaining({
          evidencePersisted: false,
          evidenceSkipped: true,
          evidenceSkipReason: "CHANNEX_INTEGRATION_ACCOUNT_UNRESOLVED",
        })
      );
    });
  });

  describe("acknowledgement stays separate from receiving", () => {
    it("persists the fetched revisions without acknowledging any of them", async () => {
      const { service, channexProviderClient, channexBookingRevisions } = createService({
        feedRevisions: [buildFeedRevision()],
      });

      const result = await receive(service);

      expect(result.statusCode).toBe(200);
      expect(result.response).toEqual(
        expect.objectContaining({
          acknowledgedCount: 0,
          acknowledged: [],
          fetchedCount: 1,
          persistedCount: 1,
          failedCount: 0,
          overallSuccess: true,
        })
      );
      expect(channexBookingRevisions.upsert).toHaveBeenCalledTimes(1);
      expect(channexProviderClient.acknowledgeBookingRevision).not.toHaveBeenCalled();
      expect(channexBookingRevisions.markAcknowledged).not.toHaveBeenCalled();
    });

    it("states in the response that acknowledgement is not performed here", async () => {
      const { service } = createService({ feedRevisions: [buildFeedRevision()] });

      const result = await receive(service);

      expect(result.response.notes).toContain(ACKNOWLEDGEMENT_SEPARATE_NOTE);
    });
  });

  describe("successful receive", () => {
    it("reports the provider call and the resolved property mapping", async () => {
      const { service, channexProviderClient } = createService({ feedRevisions: [buildFeedRevision()] });

      const result = await receive(service);

      expect(result.response).toEqual(
        expect.objectContaining({
          channel: "CHANNEX",
          integrationAccountId: INTEGRATION_ACCOUNT_ID,
          domitsPropertyId: DOMITS_PROPERTY_ID,
          externalPropertyId: EXTERNAL_PROPERTY_ID,
          calledProvider: true,
        })
      );
      expect(channexProviderClient.listBookingRevisionFeed).toHaveBeenCalledWith(
        { apiKey: "secret" },
        { externalPropertyId: EXTERNAL_PROPERTY_ID }
      );
    });

    it("records booking_receive evidence for the run", async () => {
      const { service, channexEvidence } = createService({ feedRevisions: [buildFeedRevision()] });

      await receive(service);

      expect(channexEvidence.create).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationAccountId: INTEGRATION_ACCOUNT_ID,
          domitsPropertyId: DOMITS_PROPERTY_ID,
          syncType: "booking_receive",
          status: "SUCCESS",
          overallSuccess: true,
        })
      );
    });

    it("adds an explanatory note when the feed returns nothing", async () => {
      const { service, channexBookingRevisions, channexEvidence } = createService({ feedRevisions: [] });

      const result = await receive(service);

      expect(result.response).toEqual(
        expect.objectContaining({ fetchedCount: 0, persistedCount: 0, overallSuccess: true })
      );
      expect(result.response.notes).toContain(
        "No booking revisions were returned for the currently selected Channex property."
      );
      expect(channexBookingRevisions.upsert).not.toHaveBeenCalled();
      expect(channexEvidence.create).toHaveBeenCalledWith(expect.objectContaining({ status: "NOOP" }));
    });
  });

  describe("failure handling", () => {
    it.each([
      {
        description: "the Channex integration is not connected",
        overrides: {
          account: { id: INTEGRATION_ACCOUNT_ID, status: "DISCONNECTED", credentialsRef: "channex-secret-1" },
        },
        error: "Channex integration is not connected for this user.",
        errorCode: "CHANNEX_NOT_CONNECTED",
      },
      {
        description: "the property has no Channex mapping",
        overrides: { propertyMappings: [] },
        error: "Current Channex property mapping is missing for this Domits property.",
        errorCode: "CHANNEX_PROPERTY_MAPPING_MISSING",
      },
    ])("returns 409 without calling the provider when $description", async ({ overrides, error, errorCode }) => {
      const { service, channexProviderClient, channexBookingRevisions, channexEvidence } = createService(overrides);

      const result = await receive(service);

      expect(result.statusCode).toBe(409);
      expect(result.response).toEqual(expect.objectContaining({ error, errorCode }));
      expect(channexProviderClient.listBookingRevisionFeed).not.toHaveBeenCalled();
      expect(channexBookingRevisions.upsert).not.toHaveBeenCalled();
      expect(channexEvidence.create).toHaveBeenCalledWith(
        expect.objectContaining({ syncType: "booking_receive", status: "BLOCKED", overallSuccess: false })
      );
    });

    it("omits the payload-storage note when the run is blocked before fetching", async () => {
      const { service } = createService({ propertyMappings: [] });

      const result = await receive(service);

      expect(result.response.notes).toBeUndefined();
    });

    it("returns 502 when the provider feed reports a failure", async () => {
      const { service, channexProviderClient, channexBookingRevisions } = createService();
      channexProviderClient.listBookingRevisionFeed.mockResolvedValue({
        success: false,
        revisions: [],
        providerStatus: "UNAUTHORIZED",
        errorCode: "CHANNEX_BOOKING_FEED_401",
        errorMessage: "Channex booking revision feed failed with status 401.",
      });

      const result = await receive(service);

      expect(result.statusCode).toBe(502);
      expect(result.response).toEqual(
        expect.objectContaining({
          error: "Failed to fetch Channex booking revision feed.",
          errorCode: "CHANNEX_BOOKING_FEED_401",
          providerStatus: "UNAUTHORIZED",
        })
      );
      expect(channexBookingRevisions.upsert).not.toHaveBeenCalled();
    });

    it("returns 500 when the provider call itself throws", async () => {
      const { service, channexProviderClient, channexEvidence } = createService();
      channexProviderClient.listBookingRevisionFeed.mockRejectedValue(new Error("socket hang up"));

      const result = await receive(service);

      expect(result.statusCode).toBe(500);
      expect(result.response).toEqual(
        expect.objectContaining({
          error: "Failed to receive Channex booking revisions.",
          errorCode: "CHANNEX_BOOKING_RECEIVE_FAILED",
        })
      );
      expect(channexEvidence.create).toHaveBeenCalledWith(
        expect.objectContaining({ syncType: "booking_receive", status: "FAILED", overallSuccess: false })
      );
    });

    it("reports a partial run when a revision cannot be persisted", async () => {
      const { service, channexBookingRevisions, channexEvidence } = createService({
        feedRevisions: [
          buildFeedRevision({ revisionId: "revision-ok-1" }),
          buildFeedRevision({ revisionId: "revision-bad-1" }),
        ],
      });
      channexBookingRevisions.upsert
        .mockImplementationOnce(async (data) => ({ id: "local-revision-1", ...data }))
        .mockRejectedValueOnce(new Error("constraint violation"));

      const result = await receive(service);

      expect(result.response).toEqual(
        expect.objectContaining({
          fetchedCount: 2,
          persistedCount: 1,
          failedCount: 1,
          acknowledgedCount: 0,
          overallSuccess: false,
        })
      );
      expect(result.response.failed[0]).toEqual(
        expect.objectContaining({
          revisionId: "revision-bad-1",
          stage: "persist",
          errorCode: "CHANNEX_BOOKING_PERSIST_FAILED",
          errorMessage: "constraint violation",
        })
      );
      expect(channexEvidence.create).toHaveBeenCalledWith(expect.objectContaining({ status: "PARTIAL" }));
    });
  });
});
