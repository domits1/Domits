import { renderHook, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Auth } from "aws-amplify";
import QRCode from "qrcode";
import useAuthenticatorSetup from "../../features/hostdashboard/hostsettings/hooks/useAuthenticatorSetup";

jest.mock("aws-amplify");

jest.mock("qrcode", () => ({
  toDataURL: jest.fn(),
}));

const MOCK_COGNITO_USER = {
  username: "user-abc-123",
  attributes: { email: "host+mfa@example.com" },
};
const SECRET = "JBSWY3DPEHPK3PXP";
const QR_DATA_URL = "data:image/png;base64,QR";
const VALID_CODE = "123456";

const cognitoError = (code) => Object.assign(new Error(code), { code });

const setup = () => {
  const onStatusChange = jest.fn().mockResolvedValue(undefined);
  const { result } = renderHook(() => useAuthenticatorSetup({ onStatusChange }));
  return { result, onStatusChange };
};

const startSetup = async (result) => {
  await act(async () => {
    await result.current.startSetup();
  });
};

const verifySetup = async (result, code = VALID_CODE) => {
  await act(async () => {
    await result.current.verifySetup(code);
  });
};

describe("useAuthenticatorSetup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    Auth.setupTOTP.mockResolvedValue(SECRET);
    Auth.verifyTotpToken.mockResolvedValue({});
    Auth.setPreferredMFA.mockResolvedValue("SUCCESS");
    QRCode.toDataURL.mockResolvedValue(QR_DATA_URL);
  });

  test("starts idle with nothing to show", () => {
    const { result } = setup();

    expect(result.current.step).toBe("idle");
    expect(result.current.qrCodeUrl).toBe("");
    expect(result.current.secretKey).toBe("");
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.errorKey).toBeNull();
  });

  test("startSetup associates a token and exposes the QR code and manual key", async () => {
    const { result } = setup();

    await startSetup(result);

    expect(Auth.setupTOTP).toHaveBeenCalledWith(MOCK_COGNITO_USER);
    const otpauthUri = QRCode.toDataURL.mock.calls[0][0];
    expect(otpauthUri).toMatch(/^otpauth:\/\/totp\/Domits:/);
    expect(otpauthUri).toContain("host%2Bmfa%40example.com");
    expect(otpauthUri).toContain(`secret=${SECRET}`);
    expect(otpauthUri).toContain("issuer=Domits");
    expect(result.current.step).toBe("setup");
    expect(result.current.qrCodeUrl).toBe(QR_DATA_URL);
    expect(result.current.secretKey).toBe(SECRET);
    expect(result.current.errorKey).toBeNull();
  });

  test("startSetup falls back to the username when the user has no email", async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue({ username: "user-abc-123", attributes: {} });
    const { result } = setup();

    await startSetup(result);

    expect(QRCode.toDataURL.mock.calls[0][0]).toMatch(/^otpauth:\/\/totp\/Domits:user-abc-123\?/);
  });

  test("startSetup stays idle and reports the mapped error when Cognito rejects", async () => {
    Auth.setupTOTP.mockRejectedValue(cognitoError("NotAuthorizedException"));
    const { result } = setup();

    await startSetup(result);

    expect(result.current.step).toBe("idle");
    expect(result.current.errorKey).toBe("sessionExpired");
    expect(result.current.secretKey).toBe("");
    expect(result.current.isSubmitting).toBe(false);
  });

  test("verifySetup confirms the code, prefers TOTP, refreshes the status and clears the secret", async () => {
    const { result, onStatusChange } = setup();
    await startSetup(result);

    await verifySetup(result);

    expect(Auth.verifyTotpToken).toHaveBeenCalledWith(MOCK_COGNITO_USER, VALID_CODE);
    expect(Auth.setPreferredMFA).toHaveBeenCalledWith(MOCK_COGNITO_USER, "TOTP");
    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(result.current.step).toBe("done");
    expect(result.current.secretKey).toBe("");
    expect(result.current.qrCodeUrl).toBe("");
    expect(result.current.errorKey).toBeNull();
  });

  test.each(["12345", "1234567", "12a456", ""])("verifySetup rejects %p without calling Cognito", async (code) => {
    const { result } = setup();
    await startSetup(result);

    await verifySetup(result, code);

    expect(result.current.errorKey).toBe("invalidCode");
    expect(result.current.step).toBe("setup");
    expect(Auth.verifyTotpToken).not.toHaveBeenCalled();
  });

  test.each([
    ["CodeMismatchException", "invalidCode"],
    ["EnableSoftwareTokenMFAException", "invalidCode"],
    ["NotAuthorizedException", "sessionExpired"],
    ["LimitExceededException", "tooManyAttempts"],
    ["SomethingUnexpected", "generic"],
  ])("verifySetup maps %s to %s and stays on the setup step", async (code, expectedKey) => {
    Auth.verifyTotpToken.mockRejectedValue(cognitoError(code));
    const { result, onStatusChange } = setup();
    await startSetup(result);

    await verifySetup(result);

    expect(result.current.errorKey).toBe(expectedKey);
    expect(result.current.step).toBe("setup");
    expect(result.current.secretKey).toBe(SECRET);
    expect(result.current.isSubmitting).toBe(false);
    expect(Auth.setPreferredMFA).not.toHaveBeenCalled();
    expect(onStatusChange).not.toHaveBeenCalled();
  });

  test("verifySetup reads the error name when the error has no code", async () => {
    Auth.verifyTotpToken.mockRejectedValue(Object.assign(new Error("mismatch"), { name: "CodeMismatchException" }));
    const { result } = setup();
    await startSetup(result);

    await verifySetup(result);

    expect(result.current.errorKey).toBe("invalidCode");
  });

  test("a failed preference after a verified code waits for retryEnable, which only retries the preference", async () => {
    Auth.setPreferredMFA.mockRejectedValueOnce(cognitoError("InternalErrorException"));
    const { result, onStatusChange } = setup();
    await startSetup(result);

    await verifySetup(result);

    expect(result.current.step).toBe("enablePending");
    expect(result.current.errorKey).toBe("enableFailed");
    expect(onStatusChange).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.retryEnable();
    });

    expect(Auth.verifyTotpToken).toHaveBeenCalledTimes(1);
    expect(Auth.setupTOTP).toHaveBeenCalledTimes(1);
    expect(Auth.setPreferredMFA).toHaveBeenCalledTimes(2);
    expect(Auth.setPreferredMFA).toHaveBeenLastCalledWith(MOCK_COGNITO_USER, "TOTP");
    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(result.current.step).toBe("done");
    expect(result.current.errorKey).toBeNull();
  });

  test("a session expiry while preferring TOTP returns to idle and clears the secret", async () => {
    Auth.setPreferredMFA.mockRejectedValue(cognitoError("NotAuthorizedException"));
    const { result, onStatusChange } = setup();
    await startSetup(result);

    await verifySetup(result);

    expect(result.current.step).toBe("idle");
    expect(result.current.errorKey).toBe("sessionExpired");
    expect(result.current.secretKey).toBe("");
    expect(result.current.qrCodeUrl).toBe("");
    expect(onStatusChange).not.toHaveBeenCalled();
  });

  test("cancelSetup is ignored while a verification is in flight, which then completes for the original user", async () => {
    let resolveVerify;
    Auth.verifyTotpToken.mockReturnValue(new Promise((resolve) => (resolveVerify = resolve)));
    const { result, onStatusChange } = setup();
    await startSetup(result);

    let pendingVerify;
    act(() => {
      pendingVerify = result.current.verifySetup(VALID_CODE);
    });
    act(() => {
      result.current.cancelSetup();
    });

    expect(result.current.step).toBe("setup");
    expect(result.current.secretKey).toBe(SECRET);
    expect(result.current.qrCodeUrl).toBe(QR_DATA_URL);

    await act(async () => {
      resolveVerify({});
      await pendingVerify;
    });

    expect(Auth.setPreferredMFA).toHaveBeenCalledWith(MOCK_COGNITO_USER, "TOTP");
    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(result.current.step).toBe("done");
  });

  test("cancelSetup returns to idle and clears the secret, QR code and error", async () => {
    Auth.verifyTotpToken.mockRejectedValue(cognitoError("CodeMismatchException"));
    const { result } = setup();
    await startSetup(result);
    await verifySetup(result);

    act(() => {
      result.current.cancelSetup();
    });

    expect(result.current.step).toBe("idle");
    expect(result.current.secretKey).toBe("");
    expect(result.current.qrCodeUrl).toBe("");
    expect(result.current.errorKey).toBeNull();
  });

  test("verifySetup sends the code only once while a verification is in flight", async () => {
    const { result } = setup();
    await startSetup(result);
    Auth.verifyTotpToken.mockReturnValue(new Promise(() => {}));

    act(() => {
      result.current.verifySetup(VALID_CODE);
      result.current.verifySetup(VALID_CODE);
    });

    expect(Auth.verifyTotpToken).toHaveBeenCalledTimes(1);
    expect(result.current.isSubmitting).toBe(true);
  });

  test("startSetup associates only once while a setup is in flight", async () => {
    Auth.setupTOTP.mockReturnValue(new Promise(() => {}));
    const { result } = setup();

    act(() => {
      result.current.startSetup();
      result.current.startSetup();
    });

    expect(Auth.currentAuthenticatedUser).toHaveBeenCalledTimes(1);
    expect(result.current.isSubmitting).toBe(true);
  });
});
