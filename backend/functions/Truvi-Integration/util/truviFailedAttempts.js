export const MAX_FAILED_ATTEMPTS = 3;

const BAD_REQUEST = 400;

export const countsAsFailedAttempt = (error) => error?.status === BAD_REQUEST;

export const nextFailedAttempt = ({ counts, failedAttempts }) => {
  if (!counts) {
    return { giveUp: false, changes: {} };
  }
  const attempts = (Number(failedAttempts) || 0) + 1;
  return attempts < MAX_FAILED_ATTEMPTS ? { giveUp: false, changes: { failedAttempts: attempts } } : { giveUp: true };
};
