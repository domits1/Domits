import { LISTING_STATUS, getListingStatusLabel } from "../../hostproperty/utils/listingStatus";
import { EMPTY_VALUE } from "../queue/reviewQueueFormat";
import { textOrEmpty } from "./reviewDetailFormat";

const REJECTED_ACTION = "REJECTED";
const UNKNOWN_ACTOR = "Unknown";

const ACTION_LABELS = new Map([
  ["SUBMITTED", "Submitted for review"],
  ["APPROVED", "Approved"],
  [REJECTED_ACTION, "Rejected"],
]);

const KNOWN_STATUSES = new Set(Object.values(LISTING_STATUS));

const WHEN_FORMAT = Object.freeze({
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const hasValidTime = (createdAt) => typeof createdAt === "number" && !Number.isNaN(new Date(createdAt).getTime());

const formatStatus = (status) => (KNOWN_STATUSES.has(status) ? getListingStatusLabel(status) : EMPTY_VALUE);

const formatActor = (actorId, hostId) => {
  const actor = textOrEmpty(actorId);
  const hasActor = actor !== EMPTY_VALUE;
  const isHost = hasActor && actorId === hostId;
  if (isHost) return "Host";
  return hasActor ? `Admin ${actor}` : UNKNOWN_ACTOR;
};

const formatReason = (entry) => {
  const isRejection = entry.action === REJECTED_ACTION;
  const reason = isRejection && typeof entry.reason === "string" ? entry.reason.trim() : "";
  return reason || null;
};

const toRow = (entry, hostId, index) => {
  const isObject = typeof entry === "object" && entry !== null;
  if (!isObject || !ACTION_LABELS.has(entry.action) || !hasValidTime(entry.createdAt)) return null;

  const when = new Date(entry.createdAt);
  return {
    key: `${index}-${textOrEmpty(entry.id)}`,
    label: ACTION_LABELS.get(entry.action),
    iso: when.toISOString(),
    when: when.toLocaleString("en-GB", WHEN_FORMAT),
    actor: formatActor(entry.actorId, hostId),
    transition: `${formatStatus(entry.fromStatus)} → ${formatStatus(entry.toStatus)}`,
    reason: formatReason(entry),
  };
};

// Entries carry the actor and the rejection reason, so the warnings report counts only, never entry contents.
export const buildReviewHistoryRows = (history, hostId) => {
  if (!Array.isArray(history)) {
    console.warn("Review history is not a list, so nothing was shown.");
    return [];
  }

  const rows = history.map((entry, index) => toRow(entry, hostId, index)).filter(Boolean);
  const dropped = history.length - rows.length;
  if (dropped > 0) {
    console.warn(`Review history skipped ${dropped} unreadable ${dropped === 1 ? "entry" : "entries"}.`);
  }
  return rows;
};
