export const SLA_STATUS = {
    ON_TRACK: "ON_TRACK",
    AT_RISK: "AT_RISK",
    BREACHED: "BREACHED",
};

const RESOLVED_STATUSES = ["Completed", "Cancelled"];

// Flat window for v1 - no priority-based targets yet, just a single
// "approaching due date" warning band ahead of the deadline.
const AT_RISK_WINDOW_MS = 3 * 60 * 60 * 1000;

export const computeSlaStatus = (task, now = Date.now()) => {
    if (!task.due_date) return null;
    if (RESOLVED_STATUSES.includes(task.status)) return null;

    const dueDate = Number(task.due_date);
    if (dueDate < now) return SLA_STATUS.BREACHED;
    if (dueDate - now <= AT_RISK_WINDOW_MS) return SLA_STATUS.AT_RISK;
    return SLA_STATUS.ON_TRACK;
};
