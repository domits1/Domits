import { describe, expect, it, jest } from "@jest/globals";
import { createExpiringRead } from "../../functions/PropertyHandler/util/expiringRead.js";

describe("an expiring read", () => {
  it("keeps a value until it expires and reads it again after that", async () => {
    const clock = { now: 0 };
    const read = jest.fn(async () => clock.now);
    const cached = createExpiringRead({ read, ttlMs: 1000, now: () => clock.now });

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
    const cached = createExpiringRead({ read, ttlMs: 1000, now: () => 0 });

    const first = cached();
    const second = cached();
    release("value");

    expect(await Promise.all([first, second])).toEqual(["value", "value"]);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("does not keep a failed read, so the next caller reads again", async () => {
    const read = jest.fn().mockRejectedValueOnce(new Error("throttled")).mockResolvedValueOnce("value");
    const cached = createExpiringRead({ read, ttlMs: 1000, now: () => 0 });

    await expect(cached()).rejects.toThrow("throttled");
    expect(await cached()).toBe("value");
    expect(read).toHaveBeenCalledTimes(2);
  });
});
