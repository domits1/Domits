// A rejected request is written with errors, but the status alone is enough to call it a failure.
const FAILED_STATUSES = new Set(["FAILED", "INVALID_REQUEST"]);

// Evidence statuses that are neither a success nor a failure. Both are written on every sync
// attempt that had nothing to send or was not ready. Any other unknown status falls back to the
// warnings outcome.
const NEUTRAL_OUTCOMES = {
  BLOCKED: { label: "Blocked", describe: (date) => `Last sync was blocked on ${date}.` },
  NOOP: { label: "Nothing to send", describe: (date) => `Last sync had nothing to send on ${date}.` },
};

export function formatDateTime(ms) {
  if (!ms) return "—";
  return new Date(Number(ms)).toLocaleString("nl-NL");
}

// The first rule that matches wins.
export function describeSyncOutcome(item) {
  if (item.finishedAt === null || item.finishedAt === undefined) {
    const sentence = item.startedAt
      ? `Last sync started on ${formatDateTime(item.startedAt)} and has not finished.`
      : "Last sync has not finished.";
    return { tone: "pending", label: "Not finished", sentence };
  }

  const finishedOn = formatDateTime(item.finishedAt);
  const warningsOutcome = {
    tone: "pending",
    label: "Warnings",
    sentence: `Last sync finished with warnings on ${finishedOn}.`,
  };

  // The backend sets overallSuccess to true for COMPLETED_WITH_WARNINGS, so warnings are checked
  // before success.
  if (item.status === "COMPLETED_WITH_WARNINGS" || (item.overallSuccess && item.warningCount > 0)) {
    return warningsOutcome;
  }
  if (item.overallSuccess) {
    return { tone: "success", label: "Synced", sentence: `Last sync succeeded on ${finishedOn}.` };
  }
  if (item.status === "PARTIAL") {
    return { tone: "error", label: "Partly failed", sentence: `Last sync partly failed on ${finishedOn}.` };
  }
  if (item.errorCount > 0 || FAILED_STATUSES.has(item.status)) {
    return { tone: "error", label: "Failed", sentence: `Last sync failed on ${finishedOn}.` };
  }

  const neutral = NEUTRAL_OUTCOMES[item.status];
  if (neutral) {
    return { tone: "pending", label: neutral.label, sentence: neutral.describe(finishedOn) };
  }
  return warningsOutcome;
}
