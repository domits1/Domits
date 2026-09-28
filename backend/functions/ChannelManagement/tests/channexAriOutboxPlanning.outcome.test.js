import {
  OUTCOME,
  classifySyncResponse,
  worstOutcome,
} from "../../.shared/channelManagement/utils/channexAriOutboxPlanning.js";

const answer = (statusCode, body) => ({ statusCode, response: body });
const withResults = (statusCode, results, extra = {}) =>
  answer(statusCode, { ready: true, overallSuccess: false, steps: [{ results }], ...extra });

describe("classifySyncResponse", () => {
  test("a sent change is PROCESSED and keeps the Channex task ids", () => {
    const result = answer(200, { ready: true, overallSuccess: true, taskIds: ["task-1"], steps: [] });

    expect(classifySyncResponse(result)).toEqual({ outcome: OUTCOME.PROCESSED, reason: null, taskIds: ["task-1"] });
  });

  test("a 2xx push with warnings (success: false, httpStatus 200) still counts as sent", () => {
    const result = withResults(500, [{ success: false, httpStatus: 200 }], { taskIds: ["task-2"] });

    expect(classifySyncResponse(result)).toEqual({ outcome: OUTCOME.PROCESSED, reason: null, taskIds: ["task-2"] });
  });

  test("a property that is no longer mapped is SKIPPED", () => {
    expect(classifySyncResponse(answer(200, { ready: false })).outcome).toBe(OUTCOME.SKIPPED);
  });

  test.each([401, 403])("a rejected API key (%i) is FAILED: retrying cannot help", (httpStatus) => {
    const result = withResults(500, [{ success: false, httpStatus, errorCode: "CHANNEX_UNAUTHORIZED" }]);

    expect(classifySyncResponse(result)).toMatchObject({ outcome: OUTCOME.FAILED, reason: "CHANNEX_UNAUTHORIZED" });
  });

  test.each([429, 500, 503])("a temporary problem (%i) is tried again", (httpStatus) => {
    const result = withResults(500, [{ success: false, httpStatus, errorCode: "CHANNEX_TEMPORARY" }]);

    expect(classifySyncResponse(result).outcome).toBe(OUTCOME.RETRY);
  });

  test("a timeout, which has no HTTP status, is tried again", () => {
    const result = withResults(500, [{ success: false, httpStatus: null, errorCode: "CHANNEX_PUSH_REQUEST_TIMEOUT" }]);

    expect(classifySyncResponse(result).outcome).toBe(OUTCOME.RETRY);
  });

  test("any other 4xx is FAILED, because the request itself is wrong", () => {
    const result = withResults(500, [{ success: false, httpStatus: 422, errorCode: "CHANNEX_INVALID" }]);

    expect(classifySyncResponse(result)).toMatchObject({ outcome: OUTCOME.FAILED, reason: "CHANNEX_INVALID" });
  });

  test("an error before any call (missing credentials) is FAILED", () => {
    const result = answer(409, { ready: true, errorCode: "CHANNEX_RECONNECT_REQUIRED" });

    expect(classifySyncResponse(result)).toMatchObject({ outcome: OUTCOME.FAILED, reason: "CHANNEX_RECONNECT_REQUIRED" });
  });

  test("a local throw with no provider results (500, CHANNEX_CALENDAR_CHANGE_SYNC_FAILED) is tried again", () => {
    const result = answer(500, { ready: true, errorCode: "CHANNEX_CALENDAR_CHANGE_SYNC_FAILED", steps: [] });

    expect(classifySyncResponse(result)).toMatchObject({
      outcome: OUTCOME.RETRY,
      reason: "CHANNEX_CALENDAR_CHANGE_SYNC_FAILED",
    });
  });

  test("a secret that could not be read (409, CHANNEX_SECRET_READ_FAILED) is tried again", () => {
    const result = answer(409, { ready: true, errorCode: "CHANNEX_SECRET_READ_FAILED" });

    expect(classifySyncResponse(result)).toMatchObject({ outcome: OUTCOME.RETRY, reason: "CHANNEX_SECRET_READ_FAILED" });
  });
});

describe("worstOutcome", () => {
  test("one retry among successes sends everything again, which is harmless", () => {
    expect(worstOutcome([OUTCOME.PROCESSED, OUTCOME.RETRY])).toBe(OUTCOME.RETRY);
  });

  test("a hard failure outweighs a retry", () => {
    expect(worstOutcome([OUTCOME.RETRY, OUTCOME.FAILED])).toBe(OUTCOME.FAILED);
  });

  test("an unmapped property outweighs everything", () => {
    expect(worstOutcome([OUTCOME.FAILED, OUTCOME.SKIPPED])).toBe(OUTCOME.SKIPPED);
  });

  test("all successes stay PROCESSED", () => {
    expect(worstOutcome([OUTCOME.PROCESSED, OUTCOME.PROCESSED])).toBe(OUTCOME.PROCESSED);
  });
});
