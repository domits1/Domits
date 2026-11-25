import { TIMEOUT_MESSAGE, isTimeoutError, withTimeout } from "./withTimeout";

describe("withTimeout", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("gives the answer when it arrives before the limit, and leaves no timer behind", async () => {
    const answer = withTimeout(Promise.resolve("ok"), 1000);

    await expect(answer).resolves.toBe("ok");
    expect(jest.getTimerCount()).toBe(0);
  });

  test("passes a failure that arrives before the limit on unchanged", async () => {
    const failure = new Error("boom");

    await expect(withTimeout(Promise.reject(failure), 1000)).rejects.toBe(failure);
  });

  test("rejects with a timeout error once the limit has passed, and not before", async () => {
    const answer = withTimeout(new Promise(() => {}), 1000);
    const outcome = answer.then(
      () => "answered",
      (error) => error
    );

    jest.advanceTimersByTime(999);
    expect(jest.getTimerCount()).toBe(1);
    jest.advanceTimersByTime(1);

    const error = await outcome;
    expect(isTimeoutError(error)).toBe(true);
    expect(isTimeoutError(new Error("boom"))).toBe(false);
    expect(TIMEOUT_MESSAGE).toBe("This is taking longer than expected. Try again.");
  });
});
