const CONFLICT_ATTEMPTS = 3;

export const isConcurrencyConflict = (error) =>
  [error?.code, error?.driverError?.code].includes("40001") || /\bOC00[01]\b/.test(String(error?.message ?? ""));

export const retryOnConflict = async (run) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= CONFLICT_ATTEMPTS || !isConcurrencyConflict(error)) {
        throw error;
      }
    }
  }
};
