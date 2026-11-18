import { describe, expect, it, jest } from "@jest/globals";
import { createHandler, RESERVATIONS_TASK } from "../../functions/SiteMinder-Integration/index.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const ENABLED = { SITEMINDER_RESERVATIONS_ENABLED: "true", SITEMINDER_PMS_CODE: "PMSXTEST" };

const summary = (overrides = {}) => ({ read: 2, skipped: 0, saved: 2, failed: 0, retryLater: 0, ...overrides });

const build = ({ runResult = summary(), env = ENABLED } = {}) => {
  const reservationSync = { run: jest.fn(async () => runResult) };
  const createServices = jest.fn(async () => ({ reservationSync }));
  const secretRepository = { getCredentials: jest.fn() };
  const secretRepositoryFactory = jest.fn(() => secretRepository);
  const handler = createHandler({ createServices, secretRepositoryFactory, env });
  return { handler, reservationSync, createServices, secretRepository, secretRepositoryFactory };
};

describe("SiteMinder-Integration handler", () => {
  it("runs one reservations sync and answers its counts", async () => {
    const { handler, reservationSync, createServices, secretRepository } = build();

    const response = await handler({ task: RESERVATIONS_TASK });

    expect(createServices).toHaveBeenCalledWith({ env: ENABLED, secretRepository });
    expect(reservationSync.run).toHaveBeenCalledTimes(1);
    expect(response).toEqual({ statusCode: 200, body: JSON.stringify(summary()) });
  });

  it("keeps the secret repository between runs so the login is read once per container", async () => {
    const { handler, secretRepositoryFactory, createServices } = build();

    await handler({ task: RESERVATIONS_TASK });
    await handler({ task: RESERVATIONS_TASK });

    expect(secretRepositoryFactory).toHaveBeenCalledTimes(1);
    expect(secretRepositoryFactory).toHaveBeenCalledWith(ENABLED);
    expect(createServices).toHaveBeenCalledTimes(2);
  });

  it.each([[undefined], [null], [{}], [{ task: "something-else" }]])(
    "answers 400 for an unknown task without calling SiteMinder (%#)",
    async (event) => {
      const { handler, createServices, secretRepositoryFactory } = build();

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({ message: `Unknown task, expected ${RESERVATIONS_TASK}` });
      expect(secretRepositoryFactory).not.toHaveBeenCalled();
      expect(createServices).not.toHaveBeenCalled();
    }
  );

  it.each([[undefined], [""], ["false"], ["TRUE"], ["1"], [" yes "]])(
    "skips without reading the secret or calling SiteMinder when SITEMINDER_RESERVATIONS_ENABLED is %p",
    async (value) => {
      const { handler, createServices, secretRepositoryFactory } = build({
        env: { SITEMINDER_RESERVATIONS_ENABLED: value, SITEMINDER_PMS_CODE: "PMSXTEST" },
      });

      const response = await handler({ task: RESERVATIONS_TASK });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ skipped: true, reason: "SITEMINDER_RESERVATIONS_ENABLED is not true" });
      expect(secretRepositoryFactory).not.toHaveBeenCalled();
      expect(createServices).not.toHaveBeenCalled();
    }
  );

  it("accepts the switch with spaces around true", async () => {
    const { handler, reservationSync } = build({ env: { ...ENABLED, SITEMINDER_RESERVATIONS_ENABLED: " true " } });

    await handler({ task: RESERVATIONS_TASK });

    expect(reservationSync.run).toHaveBeenCalledTimes(1);
  });

  it("does not fail when reservations were only refused to SiteMinder", async () => {
    const { handler } = build({ runResult: summary({ saved: 1, failed: 1 }) });

    const response = await handler({ task: RESERVATIONS_TASK });

    expect(response.statusCode).toBe(200);
  });

  it("fails the run with only the counts when a reservation has to wait for the next read, so the alarm sees it", async () => {
    const { handler } = build({ runResult: summary({ saved: 1, retryLater: 1 }) });

    const run = handler({ task: RESERVATIONS_TASK });

    await expect(run).rejects.toThrow(
      `SiteMinder reservations left 1 to retry: ${JSON.stringify(summary({ saved: 1, retryLater: 1 }))}`
    );
  });

  it("lets a failed run surface, for example when the confirmation does not reach SiteMinder", async () => {
    const { handler, reservationSync } = build();
    reservationSync.run.mockRejectedValueOnce(new Error("SiteMinder timeout"));

    await expect(handler({ task: RESERVATIONS_TASK })).rejects.toThrow("SiteMinder timeout");
  });

  it("tries again on the next run when building the services failed", async () => {
    const { handler, createServices, reservationSync } = build();
    createServices.mockRejectedValueOnce(new Error("The SiteMinder secret needs a username and a password"));

    await expect(handler({ task: RESERVATIONS_TASK })).rejects.toThrow("needs a username and a password");
    await handler({ task: RESERVATIONS_TASK });

    expect(reservationSync.run).toHaveBeenCalledTimes(1);
  });
});
