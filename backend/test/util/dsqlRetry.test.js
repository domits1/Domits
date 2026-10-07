import { describe, expect, it, jest } from "@jest/globals";
import { isDsqlConflict, withDsqlRetry } from "../../functions/.shared/dsqlRetry.js";

const conflict = (code = "40001") => Object.assign(new Error("change conflicts with another transaction"), { code });

describe("withDsqlRetry", () => {
  it("returns the result of a transaction that commits the first time", async () => {
    const work = jest.fn().mockResolvedValue("saved");

    await expect(withDsqlRetry(work)).resolves.toBe("saved");
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("runs the transaction again after a DSQL commit conflict, after a short random wait", async () => {
    const work = jest.fn().mockRejectedValueOnce(conflict()).mockResolvedValue("saved");
    const wait = jest.fn().mockResolvedValue();

    await expect(withDsqlRetry(work, { wait })).resolves.toBe("saved");
    expect(work).toHaveBeenCalledTimes(2);
    const [waitedMs] = wait.mock.calls[0];
    expect(waitedMs).toBeGreaterThanOrEqual(20);
    expect(waitedMs).toBeLessThanOrEqual(50);
  });

  it("does not retry an error that is not a conflict", async () => {
    const work = jest.fn().mockRejectedValue(new Error("syntax error"));

    await expect(withDsqlRetry(work, { wait: jest.fn() })).rejects.toThrow("syntax error");
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("gives up after the last attempt and throws the conflict", async () => {
    const work = jest.fn().mockRejectedValue(conflict());

    await expect(withDsqlRetry(work, { attempts: 3, wait: jest.fn() })).rejects.toMatchObject({ code: "40001" });
    expect(work).toHaveBeenCalledTimes(3);
  });
});

describe("isDsqlConflict", () => {
  it.each([
    [{ code: "40001" }, true],
    [{ driverError: { code: "40001" } }, true],
    [{ code: "OC001" }, true],
    [{ code: "23505" }, false],
    [null, false],
  ])("%j -> %s", (error, expected) => {
    expect(isDsqlConflict(error)).toBe(expected);
  });
});
