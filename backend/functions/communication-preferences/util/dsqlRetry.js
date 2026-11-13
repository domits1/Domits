const CONFLICT_CODES = new Set(["40001", "OC001"]);
const DEFAULT_ATTEMPTS = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomJitterMs = () => 20 + Math.floor(Math.random() * 31);

export const isDsqlConflict = (error) => CONFLICT_CODES.has(
  String(error?.code || error?.driverError?.code || "")
);

export const withDsqlRetry = async (
  work,
  { attempts = DEFAULT_ATTEMPTS, wait = sleep, jitterMs = randomJitterMs } = {}
) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      if (!isDsqlConflict(error) || attempt >= attempts) throw error;
      await wait(jitterMs());
    }
  }
};
