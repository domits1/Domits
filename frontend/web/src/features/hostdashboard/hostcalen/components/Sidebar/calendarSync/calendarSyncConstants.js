export const SOURCE_SYNC_STATE = {
  IDLE: "idle",
  PENDING: "pending",
  SYNCING: "syncing",
  SUCCESS: "success",
  ERROR: "error",
};

export const REMOVE_SOURCE_FLOW_STEP = {
  REASON: "reason",
  CONFIRM: "confirm",
};

export const REMOVE_SOURCE_REASONS = [
  { id: "sync-not-needed", label: "I no longer need this sync connection." },
  { id: "wrong-calendar", label: "I linked the wrong calendar." },
  { id: "sync-issues", label: "The imported availability does not look right." },
  { id: "managing-manually", label: "I prefer to manage availability manually." },
  { id: "other", label: "Other" },
];
