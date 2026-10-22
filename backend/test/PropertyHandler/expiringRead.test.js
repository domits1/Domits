import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { createExpiringRead } from "../../functions/PropertyHandler/util/expiringRead.js";

describe("an expiring read", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("keeps a value until it expires and reads it again after that", async () => {
    const clock = { now: 0 };
    const read = jest.fn(async () => clock.now);
    const cached = createExpiringRead({ read, ttlMs: 1000, timeoutMs: 5000, now: () => clock.now });

    expect(await cached()).toBe(0);
    clock.now = 999;
    expect(await cached()).toBe(0);
    clock.now = 1000;
    expect(await cached()).toBe(1000);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("shares one read between callers that ask at the same time", async () => {
    let release;
    const read = jest.fn(() => new Promise((resolve) => (release = resolve)));
    const cached = createExpiringRead({ read, ttlMs: 1000, timeoutMs: 5000, now: () => 0 });

    const first = cached();
    const second = cached();
    release("value");

    expect(await Promise.all([first, second])).toEqual(["value", "value"]);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("does not keep a failed read, so the next caller reads again", async () => {
    const read = jest.fn().mockRejectedValueOnce(new Error("throttled")).mockResolvedValueOnce("value");
    const cached = createExpiringRead({ read, ttlMs: 1000, timeoutMs: 5000, now: () => 0 });

    await expect(cached()).rejects.toThrow("throttled");
    expect(await cached()).toBe("value");
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("gives up on a read that hangs past its limit, reads again for the next caller and ignores the late answer", async () => {
    jest.useFakeTimers();
    let answerLate;
    const read = jest
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (answerLate = resolve)))
      .mockResolvedValueOnce("fresh");
    const cached = createExpiringRead({ read, ttlMs: 60000, timeoutMs: 5000, now: () => 0 });

    const hanging = expect(cached()).rejects.toThrow("The read took longer than 5000 ms.");
    await jest.advanceTimersByTimeAsync(5000);
    await hanging;
    expect(await cached()).toBe("fresh");
    answerLate("stale");
    await Promise.resolve();
    expect(await cached()).toBe("fresh");
    expect(read).toHaveBeenCalledTimes(2);
  });
});
