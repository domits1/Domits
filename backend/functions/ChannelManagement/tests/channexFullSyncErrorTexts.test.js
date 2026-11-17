import ChannexFullSyncService from "../../.shared/channelManagement/services/channexFullSyncService.js";

// The full sync is used long after the certification, so its error texts no longer mention it (#3567).
// The error codes stay: API consumers and stored evidence depend on them.
const buildService = (thrown) =>
  new ChannexFullSyncService({
    channexProviderClient: {},
    normalizeChannexFullSyncDateContext: () => ({
      rawDateFrom: "2026-11-01",
      rawDateTo: "2026-11-02",
      usingDefaultDateRange: false,
      normalizedDateFrom: "2026-11-01",
      normalizedDateTo: "2026-11-02",
    }),
    buildChannexFullSyncPayloadContext: jest.fn(),
    buildChannexFullSyncAvailabilityPayloadContext: jest.fn(),
    buildChannexFullSyncRestrictionsPayloadContext: jest.fn(),
    finalizeChannexSyncResult: jest.fn(async (result) => result),
    getChannexAriTargets: jest.fn(async () => {
      throw thrown;
    }),
    buildChannexAriTargetsFailureEvidencePatch: jest.fn(),
    buildChannexMultiStepMappingSnapshot: jest.fn(),
    buildBlockedChannexMultiStepSyncResult: jest.fn(),
    resolveChannexSyncCredentialContext: jest.fn(),
    logChannexFullCertificationSync: jest.fn(),
  });

describe("ChannexFullSyncService error texts", () => {
  test("names a failed run a full sync, not a certification sync", async () => {
    const result = await buildService(new Error("database unavailable")).syncChannexFull(
      "user-1",
      "property-1",
      "2026-11-01",
      "2026-11-02"
    );

    expect(result.statusCode).toBe(500);
    expect(result.response).toMatchObject({
      error: "Failed to run the Channex full sync.",
      errorCode: "CHANNEX_CERTIFICATION_FULL_SYNC_FAILED",
    });
  });

  test("names an error without a message a full sync error", async () => {
    const result = await buildService({ name: "WeirdError" }).syncChannexFull(
      "user-1",
      "property-1",
      "2026-11-01",
      "2026-11-02"
    );

    expect(result.response.errorMessage).toBe("Unhandled Channex full sync error.");
  });
});
