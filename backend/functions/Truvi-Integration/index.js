import { createTruviScreener } from "./business/createTruviScreener.js";
import { createTruviCanceller } from "./business/createTruviCanceller.js";
import { createTruviModifier } from "./business/createTruviModifier.js";
import { TruviSecretRepository } from "./data/truviSecretRepository.js";
import { readTruviConfig } from "./util/truviConfig.js";

export const SCREEN_TASK = "screen-pending-bookings";
export const CANCEL_TASK = "cancel-cancelled-bookings";
export const MODIFY_TASK = "modify-changed-bookings";

export const isScreeningEnabled = (env = process.env) => String(env.TRUVI_SCREENING_ENABLED ?? "").trim() === "true";

const createSecretRepository = () => new TruviSecretRepository({ secretName: readTruviConfig().secretName });

export const createHandler = ({
  createScreener = createTruviScreener,
  createCanceller = createTruviCanceller,
  createModifier = createTruviModifier,
  secretRepositoryFactory = createSecretRepository,
  env = process.env,
} = {}) => {
  let secretRepository = null;
  const tasks = { [SCREEN_TASK]: createScreener, [CANCEL_TASK]: createCanceller, [MODIFY_TASK]: createModifier };

  return async (event = {}) => {
    const createRunner = tasks[event?.task];
    if (!createRunner) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: `Unknown task, expected ${SCREEN_TASK}, ${CANCEL_TASK} or ${MODIFY_TASK}` }),
      };
    }

    if (!isScreeningEnabled(env)) {
      return { statusCode: 200, body: JSON.stringify({ skipped: true, reason: "TRUVI_SCREENING_ENABLED is not true" }) };
    }

    secretRepository ??= secretRepositoryFactory();
    const runner = await createRunner({ secretRepository });
    const summary = await runner.run({ limit: event.limit });
    if (summary.errors.length > 0) {
      throw new Error(`Truvi ${event.task} left ${summary.errors.length} failures: ${JSON.stringify(summary)}`);
    }

    return { statusCode: 200, body: JSON.stringify(summary) };
  };
};

export const handler = createHandler();
