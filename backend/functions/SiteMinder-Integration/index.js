import { createSiteMinderServices } from "./business/createSiteMinderServices.js";
import { SiteMinderSecretRepository } from "./data/siteMinderSecretRepository.js";
import { readSiteMinderConfig } from "./util/siteMinderConfig.js";

export const RESERVATIONS_TASK = "read-reservations";

export const isReservationsEnabled = (env = process.env) =>
  String(env.SITEMINDER_RESERVATIONS_ENABLED ?? "").trim() === "true";

const createSecretRepository = (env) => new SiteMinderSecretRepository({ secretName: readSiteMinderConfig(env).secretName });

export const createHandler = ({
  createServices = createSiteMinderServices,
  secretRepositoryFactory = createSecretRepository,
  env = process.env,
} = {}) => {
  let secretRepository = null;

  return async (event) => {
    if (event?.task !== RESERVATIONS_TASK) {
      return { statusCode: 400, body: JSON.stringify({ message: `Unknown task, expected ${RESERVATIONS_TASK}` }) };
    }

    if (!isReservationsEnabled(env)) {
      return {
        statusCode: 200,
        body: JSON.stringify({ skipped: true, reason: "SITEMINDER_RESERVATIONS_ENABLED is not true" }),
      };
    }

    secretRepository ??= secretRepositoryFactory(env);
    const { reservationSync } = await createServices({ env, secretRepository });
    const summary = await reservationSync.run();
    if (summary.retryLater > 0) {
      throw new Error(`SiteMinder reservations left ${summary.retryLater} to retry: ${JSON.stringify(summary)}`);
    }

    return { statusCode: 200, body: JSON.stringify(summary) };
  };
};

export const handler = createHandler();
