export const MAX_FAILED_ATTEMPTS = 3;

export const nextFailedAttempts = (previous) => (Number(previous) || 0) + 1;
