import { describe, expect, it, jest } from "@jest/globals";
import Database from "database";
import {
  GuestRiskAssessmentRepository,
  withWriteRetry,
} from "../../functions/Truvi-Integration/data/guestRiskAssessmentRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const failure = (code) => Object.assign(new Error(`failed with ${code}`), { code });
const noWait = { wait: async () => undefined, jitterMs: () => 0 };

const failingTimes = (times, error, value = "saved") => {
  let calls = 0;
  const work = async () => {
    calls += 1;
    if (calls <= times) throw error;
    return value;
  };
  return { work, calls: () => calls };
};

describe("withWriteRetry", () => {
  it.each([["40001"], ["OC001"], ["23505"]])("runs the write again after a %s", async (code) => {
    const { work, calls } = failingTimes(1, failure(code));

    const result = await withWriteRetry(work, noWait);

    expect(result).toBe("saved");
    expect(calls()).toBe(2);
  });

  it("reads the code from driverError too", async () => {
    const { work, calls } = failingTimes(1, Object.assign(new Error("conflict"), { driverError: { code: "40001" } }));

    expect(await withWriteRetry(work, noWait)).toBe("saved");
    expect(calls()).toBe(2);
  });

  it("gives up after three attempts", async () => {
    const { work, calls } = failingTimes(10, failure("40001"));

    const error = await withWriteRetry(work, noWait).catch((e) => e);

    expect(error.message).toBe("failed with 40001");
    expect(calls()).toBe(3);
  });

  it("does not retry other errors", async () => {
    const { work, calls } = failingTimes(10, failure("42P01"));

    const error = await withWriteRetry(work, noWait).catch((e) => e);

    expect(error.message).toBe("failed with 42P01");
    expect(calls()).toBe(1);
  });
});

describe("GuestRiskAssessmentRepository.saveResult retry", () => {
  it("reads the row again and saves after a conflict, keeping the createdAt of the row that won", async () => {
    const existing = [null, { id: "truvi:booking-1", createdAt: 500 }];
    let reads = 0;
    let saves = 0;
    const findOne = async () => existing[reads++];
    const save = async (row) => {
      saves += 1;
      if (saves === 1) throw failure("23505");
      return row;
    };
    Database.getInstance.mockResolvedValue({ getRepository: () => ({ findOne, save }) });

    const row = await new GuestRiskAssessmentRepository().saveResult({
      bookingId: "booking-1",
      result: { providerAssessmentId: "v-1", status: "PASSED", flaggedReason: null },
      now: 1000,
    });

    expect(reads).toBe(2);
    expect(saves).toBe(2);
    expect(row.createdAt).toBe(500);
  });
});
