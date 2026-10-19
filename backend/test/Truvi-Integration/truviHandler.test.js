import { describe, expect, it, jest } from "@jest/globals";
import { createHandler, SCREEN_TASK } from "../../functions/Truvi-Integration/index.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const summary = (overrides = {}) => ({ listed: 1, saved: 1, retryLater: 0, rejected: 0, errors: [], ...overrides });

const build = (runResult = summary()) => {
  const screener = { run: jest.fn(async () => runResult) };
  const createScreener = jest.fn(async () => screener);
  const secretRepository = { getSubscriptionKey: jest.fn() };
  const secretRepositoryFactory = jest.fn(() => secretRepository);
  const env = { TRUVI_SCREENING_ENABLED: "true" };
  return { handler: createHandler({ createScreener, secretRepositoryFactory, env }), screener, createScreener, secretRepository, secretRepositoryFactory };
};

describe("Truvi-Integration handler", () => {
  it("runs the screener with the limit from the event", async () => {
    const { handler, screener, createScreener, secretRepository } = build();

    const response = await handler({ task: SCREEN_TASK, limit: 5 });

    expect(createScreener).toHaveBeenCalledWith({ secretRepository });
    expect(screener.run).toHaveBeenCalledWith({ limit: 5 });
    expect(response).toEqual({ statusCode: 200, body: JSON.stringify(summary()) });
  });

  it("keeps the secret repository between runs so the key is read once", async () => {
    const { handler, secretRepositoryFactory, createScreener } = build();

    await handler({ task: SCREEN_TASK });
    await handler({ task: SCREEN_TASK });

    expect(secretRepositoryFactory).toHaveBeenCalledTimes(1);
    expect(createScreener).toHaveBeenCalledTimes(2);
  });

  it("answers 400 for an unknown task without screening", async () => {
    const { handler, createScreener } = build();

    const response = await handler({ task: "something-else" });

    expect(response.statusCode).toBe(400);
    expect(createScreener).not.toHaveBeenCalled();
  });

  it.each([[undefined], [""], ["false"], ["TRUE"], ["1"]])(
    "skips without reading the secret or calling Truvi when TRUVI_SCREENING_ENABLED is %p",
    async (value) => {
      const createScreener = jest.fn();
      const secretRepositoryFactory = jest.fn();
      const handler = createHandler({ createScreener, secretRepositoryFactory, env: { TRUVI_SCREENING_ENABLED: value } });

      const response = await handler({ task: SCREEN_TASK });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ skipped: true, reason: "TRUVI_SCREENING_ENABLED is not true" });
      expect(secretRepositoryFactory).not.toHaveBeenCalled();
      expect(createScreener).not.toHaveBeenCalled();
    }
  );

  it("fails the run when a booking could not be handled, so the alarm sees it", async () => {
    const { handler } = build(summary({ saved: 0, errors: [{ bookingId: "booking-1", message: "database down" }] }));

    await expect(handler({ task: SCREEN_TASK })).rejects.toThrow("Truvi screening left 1 failures");
  });

  it("does not fail when bookings only wait for a retry", async () => {
    const { handler } = build(summary({ saved: 0, retryLater: 2 }));

    const response = await handler({ task: SCREEN_TASK });

    expect(response.statusCode).toBe(200);
  });
});
