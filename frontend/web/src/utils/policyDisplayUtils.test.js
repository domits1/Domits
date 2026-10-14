import { parseCancellationPolicyString } from "./policyDisplayUtils";

// The tiers here must match backend/functions/General-Bookings-CRUD-Bookings-develop/util/refundCalculator.js,
// because guests are refunded by that calculator and shown this text.
describe("cancellation policy text matches the refund calculator", () => {
  it.each([
    [
      "flexible",
      "Full refund until 1 day before check-in",
      ["At least 1 day before check-in: guests receive a full refund.", "Less than 1 day before check-in: no refund."],
    ],
    [
      "moderate",
      "Full refund until 5 days before check-in",
      [
        "At least 5 days before check-in: guests receive a full refund.",
        "Less than 5 days before check-in: guests receive a 50% refund.",
      ],
    ],
    [
      "limited",
      "Full refund until 14 days before check-in",
      [
        "At least 14 days before check-in: guests receive a full refund.",
        "Between 7 and 14 days before check-in: guests receive a 50% refund.",
        "Less than 7 days before check-in: no refund.",
      ],
    ],
    [
      "firm",
      "Full refund until 30 days before check-in",
      [
        "At least 30 days before check-in: guests receive a full refund.",
        "Between 7 and 30 days before check-in: guests receive a 50% refund.",
        "Less than 7 days before check-in: no refund.",
      ],
    ],
    [
      "semi-strict",
      "Full refund until 60 days before check-in",
      [
        "At least 60 days before check-in: guests receive a full refund.",
        "Less than 60 days before check-in: no refund.",
      ],
    ],
    [
      "strict",
      "Full refund until 90 days before check-in",
      [
        "At least 90 days before check-in: guests receive a full refund.",
        "Less than 90 days before check-in: no refund.",
      ],
    ],
    [
      "super-strict",
      "Full refund until 180 days before check-in",
      [
        "At least 180 days before check-in: guests receive a full refund.",
        "Less than 180 days before check-in: no refund.",
      ],
    ],
    ["non-refundable", "No refunds provided", ["No refund at any time."]],
  ])("%s", (policyId, expectedSummary, expectedDetails) => {
    const policy = parseCancellationPolicyString(policyId);

    expect(policy.summary).toBe(expectedSummary);
    expect(policy.details).toEqual(expectedDetails);
  });

  it.each([
    ["flexible", "1 day before check-in"],
    ["moderate", "at check-in"],
    ["limited", "7 days before check-in"],
    ["firm", "7 days before check-in"],
    ["strict", "90 days before check-in"],
  ])("tells the host the payout follows the last refund (%s)", (policyId, payoutMoment) => {
    expect(parseCancellationPolicyString(policyId).important).toBe(
      `Your payout is processed once no refund is due anymore (${payoutMoment}). You should receive your payout within 3 days of processing.`
    );
  });
});
