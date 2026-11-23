import { describeSyncOutcome } from "./syncOutcome";

// A Map, so a syncType such as "constructor" can never match an inherited property.
const SYNC_KIND_LABELS = new Map([
  ["ari", "Prices, availability and rules"],
  ["availability", "Availability"],
  ["restrictions", "Prices and stay rules"],
  ["calendar-change", "Calendar update"],
  ["certification_full", "Full sync"],
  ["booking_pull", "Bookings import"],
  ["booking_receive", "Booking received"],
  ["booking_ack", "Booking confirmed"],
]);
const FALLBACK_KIND_LABEL = "Sync";

const countOf = (list) => (Array.isArray(list) ? list.length : 0);

// Keeps only what the card shows. The list answers whole evidence rows, including payload snapshots,
// notes and error details, and none of that is held in state.
export function toSyncHistoryRow(item) {
  const warningCount = countOf(item.warnings);
  const errorCount = countOf(item.errors);
  const outcome = describeSyncOutcome({
    status: item.status,
    overallSuccess: item.overallSuccess === true,
    startedAt: item.startedAt,
    finishedAt: item.finishedAt,
    warningCount,
    errorCount,
  });

  return {
    id: item.id,
    startedAt: item.startedAt,
    kind: SYNC_KIND_LABELS.get(item.syncType) ?? FALLBACK_KIND_LABEL,
    tone: outcome.tone,
    outcomeLabel: outcome.label,
    warningCount,
    errorCount,
  };
}

// An answer without a list is a broken answer, not an empty history, so it throws and the card reports an error.
export function toSyncHistoryRows(response) {
  if (!Array.isArray(response?.items)) {
    throw new TypeError("The sync evidence answer has no items list.");
  }
  return response.items.filter(Boolean).map(toSyncHistoryRow);
}
