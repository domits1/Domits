import { renderHook, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Auth } from "aws-amplify";
import usePasswordChange from "../../hooks/usePasswordChange";

jest.mock("aws-amplify");

describe("usePasswordChange", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("initial state: modal closed and fields empty", () => {
    const { result } = renderHook(() => usePasswordChange());

    expect(result.current.isChangingPassword).toBe(false);
    expect(result.current.currentPassword).toBe("");
    expect(result.current.newPassword).toBe("");
    expect(result.current.confirmPassword).toBe("");
    expect(result.current.passwordError).toBe("");
    expect(result.current.isSavingPassword).toBe(false);
    expect(result.current.passwordChangeSuccess).toBe(false);
  });

  test("onOpenPasswordChange opens the flow", () => {
    const { result } = renderHook(() => usePasswordChange());

    act(() => {
      result.current.onOpenPasswordChange();
    });

    expect(result.current.isChangingPassword).toBe(true);
  });

  test("onClosePasswordChange closes the flow and clears entered values", () => {
    const { result } = renderHook(() => usePasswordChange());

    act(() => {
      result.current.onOpenPasswordChange();
    });
    act(() => {
      result.current.onCurrentPasswordChange({ target: { value: "oldPass1!" } });
      result.current.onNewPasswordChange({ target: { value: "newPass1!" } });
      result.current.onConfirmPasswordChange({ target: { value: "newPass1!" } });
    });
    act(() => {
      result.current.onClosePasswordChange();
    });

    expect(result.current.isChangingPassword).toBe(false);
    expect(result.current.currentPassword).toBe("");
    expect(result.current.newPassword).toBe("");
    expect(result.current.confirmPassword).toBe("");
  });

  test("onSubmitPasswordChange: sets an error when a field is missing", async () => {
    const { result } = renderHook(() => usePasswordChange());

    act(() => {
      result.current.onNewPasswordChange({ target: { value: "newPass1!" } });
      result.current.onConfirmPasswordChange({ target: { value: "newPass1!" } });
    });
    await act(async () => {
      await result.current.onSubmitPasswordChange();
    });

    expect(result.current.passwordError).toBe("Please fill in all password fields.");
    expect(Auth.changePassword).not.toHaveBeenCalled();
  });

  test("onSubmitPasswordChange: sets an error when the new password is too short", async () => {
    const { result } = renderHook(() => usePasswordChange());

    act(() => {
      result.current.onCurrentPasswordChange({ target: { value: "oldPass1!" } });
      result.current.onNewPasswordChange({ target: { value: "short1!" } });
      result.current.onConfirmPasswordChange({ target: { value: "short1!" } });
    });
    await act(async () => {
      await result.current.onSubmitPasswordChange();
    });

    expect(result.current.passwordError).toBe("Password must be at least 8 characters.");
    expect(Auth.changePassword).not.toHaveBeenCalled();
  });

  test("onSubmitPasswordChange: sets an error when new password and confirmation do not match", async () => {
    const { result } = renderHook(() => usePasswordChange());

    act(() => {
      result.current.onCurrentPasswordChange({ target: { value: "oldPass1!" } });
      result.current.onNewPasswordChange({ target: { value: "newPass1!" } });
      result.current.onConfirmPasswordChange({ target: { value: "differentPass1!" } });
    });
    await act(async () => {
      await result.current.onSubmitPasswordChange();
    });

    expect(result.current.passwordError).toBe("New password and confirmation do not match.");
    expect(Auth.changePassword).not.toHaveBeenCalled();
  });

  test("onSubmitPasswordChange: calls Auth.changePassword with the authenticated user and both passwords", async () => {
    const mockCognitoUser = { username: "user-123" };
    Auth.currentAuthenticatedUser.mockResolvedValue(mockCognitoUser);
    Auth.changePassword.mockResolvedValue({});

    const { result } = renderHook(() => usePasswordChange());

    act(() => {
      result.current.onCurrentPasswordChange({ target: { value: "oldPass1!" } });
      result.current.onNewPasswordChange({ target: { value: "newPass1!" } });
      result.current.onConfirmPasswordChange({ target: { value: "newPass1!" } });
    });
    await act(async () => {
      await result.current.onSubmitPasswordChange();
    });

    expect(Auth.changePassword).toHaveBeenCalledWith(mockCognitoUser, "oldPass1!", "newPass1!");
    expect(result.current.passwordChangeSuccess).toBe(true);
    expect(result.current.passwordError).toBe("");
    expect(result.current.isSavingPassword).toBe(false);
    expect(result.current.currentPassword).toBe("");
    expect(result.current.newPassword).toBe("");
    expect(result.current.confirmPassword).toBe("");
  });

  test("onSubmitPasswordChange: surfaces the Cognito error message when the change is rejected", async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue({ username: "user-123" });
    Auth.changePassword.mockRejectedValue(new Error("Incorrect username or password."));

    const { result } = renderHook(() => usePasswordChange());

    act(() => {
      result.current.onCurrentPasswordChange({ target: { value: "wrongPass1!" } });
      result.current.onNewPasswordChange({ target: { value: "newPass1!" } });
      result.current.onConfirmPasswordChange({ target: { value: "newPass1!" } });
    });
    await act(async () => {
      await result.current.onSubmitPasswordChange();
    });

    expect(result.current.passwordError).toBe("Incorrect username or password.");
    expect(result.current.passwordChangeSuccess).toBe(false);
    expect(result.current.isSavingPassword).toBe(false);
  });
});
