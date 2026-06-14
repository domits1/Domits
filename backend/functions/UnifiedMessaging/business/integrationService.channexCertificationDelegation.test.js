const {
  expectIntegrationServiceDelegation,
} = require("./integrationServiceDelegationTestUtils.js");

describe("IntegrationService Channex certification delegation", () => {
  test.each([
    [
      "buildChannexCertificationCancelSkippedEvidence",
      [{ booking: { id: "booking-1" }, reason: "BOOKING_ALREADY_CANCELLED" }],
    ],
    [
      "cancelChannexCertificationBooking",
      ["admin-user", "property-1", { bookingId: "booking-1" }],
    ],
    [
      "buildChannexCertificationTestCasePayload",
      [{ readiness: {}, testCase: { payloadType: "availability", updates: [] } }],
    ],
    [
      "syncChannexCertificationTestCase",
      ["admin-user", "property-1", { testCaseId: "9" }, { skipEvidence: true }],
    ],
  ])("%s delegates to the shared certification service", async (methodName, args) => {
    const expected = { delegated: methodName };
    await expectIntegrationServiceDelegation({
      dependencyName: "channexCertificationService",
      methodName,
      args,
      expected,
    });
  });
});
