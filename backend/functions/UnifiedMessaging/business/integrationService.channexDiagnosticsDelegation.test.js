const {
  expectIntegrationServiceDelegation,
} = require("./integrationServiceDelegationTestUtils.js");

describe("IntegrationService Channex diagnostics delegation", () => {
  test.each([
    ["formatChannexEvidenceRow", [{ id: "evidence-1" }]],
    ["formatChannexEvidenceLatestSummary", [{ id: "evidence-1" }]],
    ["persistChannexSyncEvidence", [{ userId: "user-1", syncType: "ari" }]],
    [
      "finalizeChannexSyncResult",
      [{ statusCode: 200, response: {} }, { userId: "user-1" }, { skipEvidence: true }],
    ],
    ["listChannexSyncEvidence", ["user-1", { limit: 10 }]],
    ["getChannexSyncEvidence", ["user-1", "evidence-1"]],
    ["getLatestChannexSyncEvidenceSummary", ["user-1", "property-1"]],
  ])("%s delegates to the shared diagnostics service", async (methodName, args) => {
    const expected = { delegated: methodName };
    await expectIntegrationServiceDelegation({
      dependencyName: "channexDiagnosticsService",
      methodName,
      args,
      expected,
    });
  });
});
