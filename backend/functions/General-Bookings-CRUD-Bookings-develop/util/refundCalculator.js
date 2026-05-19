const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;

const REFUND_POLICIES = {
  flexible: [
    { minimumMsBeforeArrival: 24 * HOUR_IN_MS, refundPercentage: 1 },
    { minimumMsBeforeArrival: 0, refundPercentage: 0 },
  ],
  moderate: [
    { minimumMsBeforeArrival: 5 * DAY_IN_MS, refundPercentage: 1 },
    { minimumMsBeforeArrival: 0, refundPercentage: 0.5 },
  ],
  limited: [
    { minimumMsBeforeArrival: 14 * DAY_IN_MS, refundPercentage: 1 },
    { minimumMsBeforeArrival: 7 * DAY_IN_MS, refundPercentage: 0.5 },
    { minimumMsBeforeArrival: 0, refundPercentage: 0 },
  ],
  firm: [
    { minimumMsBeforeArrival: 30 * DAY_IN_MS, refundPercentage: 1 },
    { minimumMsBeforeArrival: 7 * DAY_IN_MS, refundPercentage: 0.5 },
    { minimumMsBeforeArrival: 0, refundPercentage: 0 },
  ],
};

function normalizePolicy(policy) {
  return String(policy ?? "").trim().toLowerCase();
}

function parseDate(date, fieldName) {
  const parsedDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  return parsedDate;
}

function getRefundPercentage(policy, arrivalDate, cancellationDate = new Date()) {
  const normalizedPolicy = normalizePolicy(policy);
  const tiers = REFUND_POLICIES[normalizedPolicy];

  if (!tiers) {
    throw new Error(`Unsupported cancellation policy: ${policy}`);
  }

  const arrival = parseDate(arrivalDate, "arrivalDate");
  const cancelledAt = parseDate(cancellationDate, "cancellationDate");
  const timeBeforeArrival = arrival.getTime() - cancelledAt.getTime();

  for (const tier of tiers) {
    if (timeBeforeArrival >= tier.minimumMsBeforeArrival) {
      return tier.refundPercentage;
    }
  }

  return 0;
}

function calculateRefundAmountCents(
  policy,
  arrivalDate,
  totalPriceCents,
  cancellationDate = new Date()
) {
  if (!Number.isFinite(totalPriceCents) || totalPriceCents < 0) {
    throw new Error("totalPriceCents must be a non-negative number.");
  }

  const refundPercentage = getRefundPercentage(policy, arrivalDate, cancellationDate);
  return Math.round(totalPriceCents * refundPercentage);
}

export { calculateRefundAmountCents, getRefundPercentage };
export default calculateRefundAmountCents;
