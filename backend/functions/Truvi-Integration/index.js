import { createTruviScreener } from "./business/createTruviScreener.js";
import { TruviSecretRepository } from "./data/truviSecretRepository.js";
import { readTruviConfig } from "./util/truviConfig.js";

export const SCREEN_TASK = "screen-pending-bookings";

export const isScreeningEnabled = (env = process.env) => String(env.TRUVI_SCREENING_ENABLED ?? "").trim() === "true";

const createSecretRepository = () => new TruviSecretRepository({ secretName: readTruviConfig().secretName });

export const createHandler = ({
  createScreener = createTruviScreener,
  secretRepositoryFactory = createSecretRepository,
  env = process.env,
} = {}) => {
  let secretRepository = null;

  return async (event = {}) => {
    if (event?.task !== SCREEN_TASK) {
      return { statusCode: 400, body: JSON.stringify({ message: `Unknown task, expected ${SCREEN_TASK}` }) };
    }

    if (!isScreeningEnabled(env)) {
      return { statusCode: 200, body: JSON.stringify({ skipped: true, reason: "TRUVI_SCREENING_ENABLED is not true" }) };
    }

    secretRepository ??= secretRepositoryFactory();
    const screener = await createScreener({ secretRepository });
    const summary = await screener.run({ limit: event.limit });
    if (summary.errors.length > 0) {
      throw new Error(`Truvi screening left ${summary.errors.length} failures: ${JSON.stringify(summary)}`);
    }

    return { statusCode: 200, body: JSON.stringify(summary) };
  };
};

export const handler = createHandler();
