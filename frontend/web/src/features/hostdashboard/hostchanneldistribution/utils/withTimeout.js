export const TIMEOUT_MESSAGE = "This is taking longer than expected. Try again.";

const TIMEOUT_CODE = "CLIENT_TIMEOUT";

export const isTimeoutError = (error) => error?.code === TIMEOUT_CODE;

// Stops waiting for a request after `ms`. The request itself is not cancelled, so a caller that
// gives up must also ignore its late answer.
export function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error(`No answer after ${ms} ms.`), { code: TIMEOUT_CODE })), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
