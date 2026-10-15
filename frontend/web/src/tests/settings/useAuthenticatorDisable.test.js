import { renderHook, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Auth } from "aws-amplify";
import useAuthenticatorDisable from "../../features/hostdashboard/hostsettings/hooks/useAuthenticatorDisable";

jest.mock("aws-amplify");

const MOCK_COGNITO_USER = { username: "user-abc-123", attributes: { email: "host@example.com" } };
const FRESH_USER = { username: "user-abc-123", attributes: { email: "host@example.com" }, session: "fresh" };
const AMPLIFY_NOT_AUTHENTICATED = "The user is not authenticated";

const cognitoError = (code) => Object.assign(new Error(code), { code });

const setup = () => {
  const onStatusChange = jest.fn().mockResolvedValue(undefined);
  const { result } = renderHook(() => useAuthenticatorDisable({ onStatusChange }));
  return { result, onStatusChange };
};

const requestDisable = (result) => {
  act(() => {
    result.current.requestDisable();
  });
};

const confirmDisable = async (result) => {
  await act(async () => {
    await result.current.confirmDisable();
  });
};

describe("useAuthenticatorDisable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    Auth.setPreferredMFA.mockResolvedValue("SUCCESS");
  });

  test("starts idle", () => {
    const { result } = setup();

    expect(result.current.step).toBe("idle");
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.errorKey).toBeNull();
  });

  test("requestDisable asks for confirmation without calling Cognito", () => {
    const { result } = setup();

    requestDisable(result);

    expect(result.current.step).toBe("confirm");
    expect(Auth.setPreferredMFA).not.toHaveBeenCalled();
  });

  test("confirmDisable turns MFA off, refreshes the status and finishes", async () => {
    const { result, onStatusChange } = setup();
    requestDisable(result);

    await confirmDisable(result);

    expect(Auth.setPreferredMFA).toHaveBeenCalledWith(MOCK_COGNITO_USER, "NOMFA");
    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(result.current.step).toBe("done");
    expect(result.current.errorKey).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  test("confirmDisable loads the current user when confirming and turns MFA off for that user", async () => {
    const { result } = setup();
    requestDisable(result);
    Auth.currentAuthenticatedUser.mockResolvedValue(FRESH_USER);

    await confirmDisable(result);

    expect(Auth.currentAuthenticatedUser).toHaveBeenCalledTimes(1);
    expect(Auth.setPreferredMFA).toHaveBeenCalledWith(FRESH_USER, "NOMFA");
  });

  test("an expired session returns to idle with sessionExpired", async () => {
    Auth.setPreferredMFA.mockRejectedValue(cognitoError("NotAuthorizedException"));
    const { result, onStatusChange } = setup();
    requestDisable(result);

    await confirmDisable(result);

    expect(result.current.step).toBe("idle");
    expect(result.current.errorKey).toBe("sessionExpired");
    expect(onStatusChange).not.toHaveBeenCalled();
  });

  test("an expired session while loading the user also returns to idle with sessionExpired", async () => {
    Auth.currentAuthenticatedUser.mockRejectedValue(Object.assign(new Error("expired"), { name: "NotAuthorizedException" }));
    const { result } = setup();
    requestDisable(result);

    await confirmDisable(result);

    expect(result.current.step).toBe("idle");
    expect(result.current.errorKey).toBe("sessionExpired");
    expect(Auth.setPreferredMFA).not.toHaveBeenCalled();
  });

  test.each([
    ["loading the user", () => Auth.currentAuthenticatedUser.mockRejectedValue(AMPLIFY_NOT_AUTHENTICATED)],
    ["turning MFA off", () => Auth.setPreferredMFA.mockRejectedValue(AMPLIFY_NOT_AUTHENTICATED)],
  ])("Amplify's not-authenticated string while %s returns to idle with sessionExpired", async (_case, arrange) => {
    arrange();
    const { result, onStatusChange } = setup();
    requestDisable(result);

    await confirmDisable(result);

    expect(result.current.step).toBe("idle");
    expect(result.current.errorKey).toBe("sessionExpired");
    expect(onStatusChange).not.toHaveBeenCalled();
  });

  test("a failure while loading the user keeps the confirmation open with generic", async () => {
    Auth.currentAuthenticatedUser.mockRejectedValue(new Error("network"));
    const { result } = setup();
    requestDisable(result);

    await confirmDisable(result);

    expect(result.current.step).toBe("confirm");
    expect(result.current.errorKey).toBe("generic");
    expect(Auth.setPreferredMFA).not.toHaveBeenCalled();
  });

  test.each([
    ["LimitExceededException", "tooManyAttempts"],
    ["TooManyRequestsException", "tooManyAttempts"],
    ["CodeMismatchException", "generic"],
    ["InternalErrorException", "generic"],
  ])("%s keeps the confirmation open with %s", async (code, expectedKey) => {
    Auth.setPreferredMFA.mockRejectedValue(cognitoError(code));
    const { result, onStatusChange } = setup();
    requestDisable(result);

    await confirmDisable(result);

    expect(result.current.step).toBe("confirm");
    expect(result.current.errorKey).toBe(expectedKey);
    expect(result.current.isSubmitting).toBe(false);
    expect(onStatusChange).not.toHaveBeenCalled();
  });

  test("requestDisable clears an error left from an earlier attempt", async () => {
    Auth.setPreferredMFA.mockRejectedValue(cognitoError("NotAuthorizedException"));
    const { result } = setup();
    requestDisable(result);
    await confirmDisable(result);

    requestDisable(result);

    expect(result.current.step).toBe("confirm");
    expect(result.current.errorKey).toBeNull();
  });

  test("cancelDisable returns to idle and clears the error", async () => {
    Auth.setPreferredMFA.mockRejectedValue(cognitoError("InternalErrorException"));
    const { result } = setup();
    requestDisable(result);
    await confirmDisable(result);

    act(() => {
      result.current.cancelDisable();
    });

    expect(result.current.step).toBe("idle");
    expect(result.current.errorKey).toBeNull();
  });

  test("cancelDisable is ignored while the request is running", () => {
    Auth.setPreferredMFA.mockReturnValue(new Promise(() => {}));
    const { result } = setup();
    requestDisable(result);

    act(() => {
      result.current.confirmDisable();
    });
    act(() => {
      result.current.cancelDisable();
    });

    expect(result.current.step).toBe("confirm");
    expect(result.current.isSubmitting).toBe(true);
  });

  test("confirmDisable sends only one request while one is in flight", () => {
    Auth.currentAuthenticatedUser.mockReturnValue(new Promise(() => {}));
    const { result } = setup();
    requestDisable(result);

    act(() => {
      result.current.confirmDisable();
      result.current.confirmDisable();
    });

    expect(Auth.currentAuthenticatedUser).toHaveBeenCalledTimes(1);
    expect(result.current.isSubmitting).toBe(true);
  });
});
