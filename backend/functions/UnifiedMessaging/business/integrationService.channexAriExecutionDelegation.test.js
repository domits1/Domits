const {
  expectIntegrationServiceDelegation,
} = require("./integrationServiceDelegationTestUtils.js");

describe("IntegrationService Channex ARI execution delegation", () => {
  test.each([
    [
      "resolveChannexSyncCredentialContext",
      [{ userId: "user-1", mappingSnapshot: {} }],
    ],
    [
      "createChannexSyncFinalizer",
      [{ normalizedUserId: "user-1", syncType: "restrictions" }],
    ],
    [
      "syncChannexAvailability",
      ["user-1", "property-1", "2026-06-01", "2026-06-02", { skipEvidence: true }],
    ],
    [
      "syncChannexRestrictions",
      ["user-1", "property-1", "2026-06-01", "2026-06-02", { skipEvidence: true }],
    ],
  ])("%s delegates to the shared ARI execution service", async (methodName, args) => {
    const expected = { delegated: methodName };
    await expectIntegrationServiceDelegation({
      dependencyName: "channexAriExecutionService",
      methodName,
      args,
      expected,
    });
  });
});
