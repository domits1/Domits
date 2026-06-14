const {
  expectIntegrationServiceDelegation,
} = require("./integrationServiceDelegationTestUtils.js");

describe("IntegrationService Channex full-sync delegation", () => {
  test("syncChannexFull delegates to the shared full-sync service", async () => {
    const expected = { statusCode: 200, response: { delegated: true } };
    const args = [
      "user-1",
      "property-1",
      "2026-06-01",
      "2026-06-02",
      { skipEvidence: true },
    ];
    await expectIntegrationServiceDelegation({
      dependencyName: "channexFullSyncService",
      methodName: "syncChannexFull",
      args,
      expected,
    });
  });
});
