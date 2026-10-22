export const createExpiringRead = ({ read, ttlMs, now = () => Date.now() }) => {
  let kept = null;
  let pending = null;
  return () => {
    if (kept && now() < kept.expiresAt) {
      return Promise.resolve(kept.value);
    }
    pending ??= Promise.resolve(read())
      .then((value) => {
        kept = { value, expiresAt: now() + ttlMs };
        return value;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  };
};
