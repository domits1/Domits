import { renderHook, act } from "@testing-library/react";
import {
  getErrorCode,
  isSessionExpired,
  toErrorKey,
  useExclusiveSubmit,
} from "../../features/hostdashboard/hostsettings/hooks/authenticatorErrors";

const cognitoError = (code) => Object.assign(new Error(code), { code });

describe("authenticatorErrors", () => {
  test("getErrorCode prefers code and falls back to name", () => {
    expect(getErrorCode(cognitoError("LimitExceededException"))).toBe("LimitExceededException");
    expect(getErrorCode(Object.assign(new Error("x"), { name: "NotAuthorizedException" }))).toBe(
      "NotAuthorizedException"
    );
    expect(getErrorCode(undefined)).toBeUndefined();
  });

  test.each([
    ["Amplify's not-authenticated string", "The user is not authenticated", true],
    ["NotAuthorizedException", cognitoError("NotAuthorizedException"), true],
    ["another string", "No current user", false],
    ["another Cognito error", cognitoError("LimitExceededException"), false],
  ])("isSessionExpired recognises %s", (_case, error, expected) => {
    expect(isSessionExpired(error)).toBe(expected);
  });

  test.each([
    ["NotAuthorizedException", "sessionExpired"],
    ["LimitExceededException", "tooManyAttempts"],
    ["TooManyRequestsException", "tooManyAttempts"],
    ["CodeMismatchException", "generic"],
    ["InternalErrorException", "generic"],
  ])("toErrorKey maps %s to %s", (code, expectedKey) => {
    expect(toErrorKey(cognitoError(code))).toBe(expectedKey);
  });

  test("toErrorKey applies extra mappings for a flow", () => {
    const extra = { CodeMismatchException: "invalidCode" };

    expect(toErrorKey(cognitoError("CodeMismatchException"), extra)).toBe("invalidCode");
    expect(toErrorKey(cognitoError("LimitExceededException"), extra)).toBe("tooManyAttempts");
  });

  describe("useExclusiveSubmit", () => {
    test("runs one action at a time and reports progress", async () => {
      let finish;
      const action = jest.fn(() => new Promise((resolve) => (finish = resolve)));
      const { result } = renderHook(() => useExclusiveSubmit());

      let running;
      act(() => {
        running = result.current.runExclusive(action);
        result.current.runExclusive(action);
      });

      expect(action).toHaveBeenCalledTimes(1);
      expect(result.current.isSubmitting).toBe(true);
      expect(result.current.isBusy()).toBe(true);

      await act(async () => {
        finish();
        await running;
      });

      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.isBusy()).toBe(false);
    });

    test("releases the lock when the action throws", async () => {
      const { result } = renderHook(() => useExclusiveSubmit());

      await act(async () => {
        await expect(result.current.runExclusive(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
      });

      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.isBusy()).toBe(false);
    });
  });
});
