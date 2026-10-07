import ChannexAriOutboxWorker from "../../.shared/channelManagement/services/channexAriOutboxWorker.js";

const createWorker = ({ ready = [{ domitsPropertyId: "property-1" }], clock = [1000] } = {}) => {
  const times = [...clock];
  const outbox = {
    recoverStaleProcessing: jest.fn(async () => 0),
    findReadyProperties: jest.fn(async () => ready),
    cleanup: jest.fn(async () => 0),
  };
  const schemaGuard = { assertReady: jest.fn(async () => ({ ready: true })) };
  const worker = new ChannexAriOutboxWorker({
    outbox,
    schemaGuard,
    now: () => (times.length > 1 ? times.shift() : times[0]),
    log: { error: jest.fn() },
  });
  worker.processProperty = jest.fn(async () => "PROCESSED");
  return { worker, outbox, schemaGuard };
};

describe("ChannexAriOutboxWorker.run", () => {
  test("refuses to run before the migration is applied", async () => {
    const { worker, schemaGuard, outbox } = createWorker();
    schemaGuard.assertReady.mockRejectedValue(new Error("Channex ARI outbox schema is not ready."));

    await expect(worker.run()).rejects.toThrow("schema is not ready");
    expect(outbox.findReadyProperties).not.toHaveBeenCalled();
  });

  test("recovers stale rows, handles every ready property, then cleans up", async () => {
    const { worker, outbox } = createWorker({
      ready: [{ domitsPropertyId: "property-1" }, { domitsPropertyId: "property-2" }],
    });

    const summary = await worker.run();

    expect(outbox.recoverStaleProcessing).toHaveBeenCalled();
    expect(worker.processProperty).toHaveBeenCalledTimes(2);
    expect(outbox.cleanup).toHaveBeenCalled();
    expect(summary).toMatchObject({ properties: 2, outcomes: { PROCESSED: 2 }, errors: 0, stoppedEarly: false });
  });

  test("one failing property never stops the others", async () => {
    const { worker } = createWorker({ ready: [{ domitsPropertyId: "property-1" }, { domitsPropertyId: "property-2" }] });
    worker.processProperty.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("PROCESSED");

    const summary = await worker.run();

    expect(worker.processProperty).toHaveBeenCalledTimes(2);
    expect(summary).toMatchObject({ errors: 1, outcomes: { PROCESSED: 1 } });
  });

  test("starts no new property after the time budget", async () => {
    const { worker } = createWorker({
      ready: [{ domitsPropertyId: "property-1" }, { domitsPropertyId: "property-2" }],
      clock: [0, 0, 50_000],
    });

    const summary = await worker.run({ timeBudgetMs: 45_000 });

    expect(worker.processProperty).toHaveBeenCalledTimes(1);
    expect(summary.stoppedEarly).toBe(true);
  });

  test("a 40001 while recovering stale rows means another run did it: carry on", async () => {
    const { worker, outbox } = createWorker();
    outbox.recoverStaleProcessing.mockRejectedValue(Object.assign(new Error("conflict"), { code: "40001" }));

    await expect(worker.run()).resolves.toMatchObject({ properties: 1 });
  });

  test("a failing cleanup does not fail the run", async () => {
    const { worker, outbox } = createWorker();
    outbox.cleanup.mockRejectedValue(new Error("cleanup failed"));

    await expect(worker.run()).resolves.toMatchObject({ properties: 1, cleaned: 0 });
  });

  test("with no time left it starts no property at all", async () => {
    const { worker } = createWorker();

    const summary = await worker.run({ timeBudgetMs: 0 });

    expect(worker.processProperty).not.toHaveBeenCalled();
    expect(summary.stoppedEarly).toBe(true);
  });
});
