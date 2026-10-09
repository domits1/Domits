import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import AuthenticatorAppSection from "../../features/hostdashboard/hostsettings/components/AuthenticatorAppSection";
import en from "../../content/en.json";

const { auth: labels, authenticator: t } = en.settings.privacySecurity;

const SECRET = "JBSWY3DPEHPK3PXP";
const QR_DATA_URL = "data:image/png;base64,QR";

const baseProps = {
  authStatus: { emailVerified: true, phoneVerified: false, preferredMFA: "NOMFA" },
  authStatusLoading: false,
  authStatusError: false,
  mfaStatusError: false,
  labels,
  t,
  step: "idle",
  qrCodeUrl: "",
  secretKey: "",
  isSubmitting: false,
  errorKey: null,
  startSetup: jest.fn(),
  verifySetup: jest.fn(),
  retryEnable: jest.fn(),
  cancelSetup: jest.fn(),
};

const setupProps = { step: "setup", qrCodeUrl: QR_DATA_URL, secretKey: SECRET };

const renderSection = (overrides = {}) => render(<AuthenticatorAppSection {...baseProps} {...overrides} />);

const authenticatorRow = () => screen.getByRole("group", { name: labels.authenticatorApp });

describe("AuthenticatorAppSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("offers Set up next to an Inactive status once loaded", async () => {
    renderSection();

    expect(within(authenticatorRow()).getByText(labels.inactive)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: t.setUp }));
    expect(baseProps.startSetup).toHaveBeenCalledTimes(1);
  });

  test("renders nothing while the status is loading", () => {
    renderSection({ authStatusLoading: true });

    expect(screen.queryByText(labels.authenticatorApp)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t.setUp })).not.toBeInTheDocument();
  });

  test("shows Active without a Set up button when TOTP is already on", () => {
    renderSection({ authStatus: { ...baseProps.authStatus, preferredMFA: "TOTP" } });

    expect(within(authenticatorRow()).getByText(labels.active)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t.setUp })).not.toBeInTheDocument();
  });

  test.each([
    ["the MFA lookup failed", { mfaStatusError: true }],
    ["the whole profile fetch failed", { authStatusError: true }],
  ])("shows Unavailable without a Set up button when %s", (_case, overrides) => {
    renderSection(overrides);

    expect(within(authenticatorRow()).getByText(labels.unavailable)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t.setUp })).not.toBeInTheDocument();
  });

  test("the setup panel shows the QR code, the grouped key and a labelled code input", () => {
    renderSection(setupProps);

    expect(screen.getByText(t.scanInstruction)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: t.qrAlt })).toHaveAttribute("src", QR_DATA_URL);
    expect(screen.getByText(t.manualKeyLabel)).toBeInTheDocument();
    expect(screen.getByText("JBSW Y3DP EHPK 3PXP")).toBeInTheDocument();

    const codeInput = screen.getByLabelText(t.codeLabel);
    expect(codeInput).toHaveAttribute("inputmode", "numeric");
    expect(codeInput).toHaveAttribute("autocomplete", "one-time-code");
    expect(codeInput).toHaveAttribute("maxlength", "6");
    expect(screen.queryByRole("button", { name: t.setUp })).not.toBeInTheDocument();
  });

  test("Verify sends the entered code, keeping digits only", async () => {
    renderSection(setupProps);

    await userEvent.type(screen.getByLabelText(t.codeLabel), "12a3456");
    await userEvent.click(screen.getByRole("button", { name: t.verify }));

    expect(baseProps.verifySetup).toHaveBeenCalledWith("123456");
  });

  test("while submitting, Verify shows the progress label and both actions are disabled", () => {
    renderSection({ ...setupProps, isSubmitting: true });

    expect(screen.getByRole("button", { name: t.verifying })).toBeDisabled();
    expect(screen.getByRole("button", { name: t.cancel })).toBeDisabled();
  });

  test("Cancel leaves the setup", async () => {
    renderSection(setupProps);

    await userEvent.click(screen.getByRole("button", { name: t.cancel }));

    expect(baseProps.cancelSetup).toHaveBeenCalledTimes(1);
  });

  test("enablePending explains the failure and offers Try again and Cancel", async () => {
    renderSection({ step: "enablePending", errorKey: "enableFailed" });

    expect(screen.getByText(t.errors.enableFailed)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t.tryAgain })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: t.tryAgain }));
    expect(baseProps.retryEnable).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: t.cancel }));
    expect(baseProps.cancelSetup).toHaveBeenCalledTimes(1);
  });

  test("done shows the success message, focuses Close, and returns focus to the row once closed", async () => {
    const activeStatus = { ...baseProps.authStatus, preferredMFA: "TOTP" };
    const { rerender } = renderSection({ step: "done", authStatus: activeStatus });

    expect(screen.getByText(t.success)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t.close })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: t.close }));
    expect(baseProps.cancelSetup).toHaveBeenCalledTimes(1);

    rerender(<AuthenticatorAppSection {...baseProps} step="idle" authStatus={activeStatus} />);

    expect(authenticatorRow()).toHaveFocus();
  });

  test("moves focus to the code input when the setup panel opens", async () => {
    const { rerender } = renderSection();
    await userEvent.click(screen.getByRole("button", { name: t.setUp }));

    rerender(<AuthenticatorAppSection {...baseProps} {...setupProps} />);

    expect(screen.getByLabelText(t.codeLabel)).toHaveFocus();
  });

  test("returns focus to Set up after the setup is cancelled", async () => {
    const { rerender } = renderSection(setupProps);
    await userEvent.click(screen.getByRole("button", { name: t.cancel }));

    rerender(<AuthenticatorAppSection {...baseProps} />);

    expect(screen.getByRole("button", { name: t.setUp })).toHaveFocus();
  });

  test.each(["invalidCode", "sessionExpired", "tooManyAttempts", "generic"])(
    "shows the translated %s error on the setup step, linked to the code input",
    (errorKey) => {
      renderSection({ ...setupProps, errorKey });

      const message = screen.getByText(t.errors[errorKey]);
      expect(message).toBeInTheDocument();
      expect(screen.getByLabelText(t.codeLabel)).toHaveAccessibleDescription(t.errors[errorKey]);
      expect(screen.getByLabelText(t.codeLabel)).toHaveAttribute("aria-invalid", "true");
    }
  );

  test("shows an error from a failed start next to the Set up button", () => {
    renderSection({ errorKey: "sessionExpired" });

    expect(screen.getByText(t.errors.sessionExpired)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t.setUp })).toBeInTheDocument();
  });
});
