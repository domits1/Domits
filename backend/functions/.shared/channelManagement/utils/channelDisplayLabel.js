// What the host sees per OTA on the Distribution tab (design note D7, #506).
// Channex is the source of truth for whether a channel is active; the outbox says whether Domits still
// has changes waiting for the listing. DISCONNECTING and NEEDS_ATTENTION need Domits' own channel row,
// which arrives with disconnect (D5).
export const CHANNEL_LABEL = Object.freeze({
  LIVE: "LIVE",
  SYNCING: "SYNCING",
  DISCONNECTED: "DISCONNECTED",
  UNKNOWN: "UNKNOWN",
});

export const channelDisplayLabel = ({ isActive, pendingOutbox } = {}) => {
  // Never guess "Live": when Channex did not say, the host must not think the OTA sells.
  if (typeof isActive !== "boolean") return CHANNEL_LABEL.UNKNOWN;
  if (!isActive) return CHANNEL_LABEL.DISCONNECTED;
  return pendingOutbox ? CHANNEL_LABEL.SYNCING : CHANNEL_LABEL.LIVE;
};
