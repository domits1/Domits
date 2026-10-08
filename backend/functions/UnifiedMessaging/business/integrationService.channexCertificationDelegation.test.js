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
