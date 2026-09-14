const { deriveEvidenceOutcome } = require("../.shared/channelManagement/utils/channexAriExecutionUtils.js");

describe("deriveEvidenceOutcome", () => {
  test("reports NOOP, not SUCCESS, when the provider was called but returned no results", () => {
    // calledProvider:true with an empty results array means a batch was sent for zero items
    // (e.g. an empty group survived upstream filtering) - nothing was verified as succeeding,
    // so this must not fall through to the same SUCCESS the "everything succeeded" path returns.
    const outcome = deriveEvidenceOutcome({
      statusCode: 200,
      ready: true,
      calledProvider: true,
      results: [],
      overallSuccess: undefined,
    });

    expect(outcome).toEqual({ status: "NOOP", overallSuccess: false });
  });

  test("still reports SUCCESS when the provider was called and every result succeeded", () => {
    const outcome = deriveEvidenceOutcome({
      statusCode: 200,
      ready: true,
      calledProvider: true,
      results: [{ success: true }],
      overallSuccess: true,
    });

    expect(outcome).toEqual({ status: "SUCCESS", overallSuccess: true });
  });
});
