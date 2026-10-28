import { withinTimeLimit } from "./timeLimit.js";

class ReadTimeout extends Error {
  constructor(timeoutMs) {
    super(`The read took longer than ${timeoutMs} ms.`);
    this.name = "ReadTimeout";
  }
}

export const createExpiringRead = ({ read, ttlMs, timeoutMs, now = () => Date.now() }) => {
  let kept = null;
  let pending = null;
  return () => {
    if (kept && now() < kept.expiresAt) {
      return Promise.resolve(kept.value);
    }
    pending ??= withinTimeLimit(Promise.resolve(read()), timeoutMs, () => new ReadTimeout(timeoutMs))
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
