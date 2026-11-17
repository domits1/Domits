import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Auth } from "aws-amplify";
import Login from "../features/auth/Login";

jest.mock("aws-amplify", () => ({
  Auth: {
    currentAuthenticatedUser: jest.fn(),
    signIn: jest.fn(),
    confirmSignIn: jest.fn(),
    forgotPassword: jest.fn(),
    forgotPasswordSubmit: jest.fn(),
  },
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
}));

const EMAIL = "host@example.com";
const PASSWORD = "Secret123!";
const CODE = "123456";
const MFA_USER = { username: "user-123", challengeName: "SOFTWARE_TOKEN_MFA" };
const SESSION_EXPIRED_MESSAGE = "Your sign-in session expired. Please sign in again.";
const UNSUPPORTED_MESSAGE = "This sign-in method is not supported yet. Please contact support.";

const cognitoError = (code) => Object.assign(new Error(code), { code });

const originalLocation = globalThis.location;
let locationStub;
let authChangedListener;

const renderLogin = (initialEntry = "/login") =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Login />
    </MemoryRouter>
  );

const submitPassword = () => {
  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: EMAIL } });
  fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: PASSWORD } });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));
};

const reachMfaStep = async () => {
  Auth.signIn.mockResolvedValue(MFA_USER);
  renderLogin();
  submitPassword();
  await screen.findByRole("heading", { name: /two-factor authentication/i });
};

const enterCode = (code) => {
  const digitInputs = screen.getAllByRole("textbox");
  code.split("").forEach((digit, index) => fireEvent.change(digitInputs[index], { target: { value: digit } }));
};

const expectPasswordFormWithEmailKept = async () => {
  await screen.findByRole("heading", { name: /welcome back/i });
  expect(screen.getByPlaceholderText("Email")).toHaveValue(EMAIL);
  expect(screen.getByPlaceholderText("Password")).toHaveValue("");
};

describe("Login MFA challenge", () => {
  beforeEach(() => {
    Auth.currentAuthenticatedUser.mockRejectedValue(new Error("not signed in"));
    locationStub = { href: "http://localhost/login", reload: jest.fn() };
    Object.defineProperty(globalThis, "location", { configurable: true, value: locationStub });
    authChangedListener = jest.fn();
    globalThis.addEventListener("authChanged", authChangedListener);
  });

  afterEach(() => {
    globalThis.removeEventListener("authChanged", authChangedListener);
    Object.defineProperty(globalThis, "location", { configurable: true, value: originalLocation });
    jest.clearAllMocks();
  });

  it("completes a login without a challenge by dispatching authChanged and reloading", async () => {
    Auth.signIn.mockResolvedValue({ username: "user-123" });
    renderLogin();

    submitPassword();

    await waitFor(() => expect(locationStub.reload).toHaveBeenCalledTimes(1));
    expect(Auth.signIn).toHaveBeenCalledWith(EMAIL, PASSWORD);
    expect(authChangedListener).toHaveBeenCalledTimes(1);
  });

  it("completes a login without a challenge by following the redirect", async () => {
    Auth.signIn.mockResolvedValue({ username: "user-123" });
    renderLogin("/login?redirect=%2Fbookingoverview%3Fid%3D7");

    submitPassword();

    await waitFor(() => expect(locationStub.href).toBe("/bookingoverview?id=7"));
    expect(authChangedListener).toHaveBeenCalledTimes(1);
    expect(locationStub.reload).not.toHaveBeenCalled();
  });

  it("shows the MFA step instead of completing when the authenticator app challenge is returned", async () => {
    await reachMfaStep();

    expect(screen.getByText("Enter the 6-digit code from your authenticator app.")).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
    expect(authChangedListener).not.toHaveBeenCalled();
    expect(locationStub.reload).not.toHaveBeenCalled();
    expect(locationStub.href).toBe("http://localhost/login");
  });

  it("confirms the code against the pending user and then completes the login", async () => {
    Auth.confirmSignIn.mockResolvedValue({});
    await reachMfaStep();

    enterCode(CODE);

    await waitFor(() => expect(locationStub.reload).toHaveBeenCalledTimes(1));
    expect(Auth.confirmSignIn).toHaveBeenCalledWith(MFA_USER, CODE, "SOFTWARE_TOKEN_MFA");
    expect(authChangedListener).toHaveBeenCalledTimes(1);
  });

  it("keeps the MFA step open and explains when the code does not match", async () => {
    Auth.confirmSignIn.mockRejectedValue(cognitoError("CodeMismatchException"));
    await reachMfaStep();

    enterCode(CODE);

    expect(await screen.findByText("Invalid code. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /two-factor authentication/i })).toBeInTheDocument();
    expect(locationStub.reload).not.toHaveBeenCalled();
  });

  it("clears the code and focuses the first digit after the code does not match", async () => {
    Auth.confirmSignIn.mockRejectedValue(cognitoError("CodeMismatchException"));
    await reachMfaStep();

    enterCode(CODE);

    await screen.findByText("Invalid code. Please try again.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Verify" })).toBeDisabled());
    const digitInputs = screen.getAllByRole("textbox");
    digitInputs.forEach((input) => expect(input).toHaveValue(""));
    expect(digitInputs[0]).toHaveFocus();
  });

  it("returns to the password form with the email kept when the challenge session expired", async () => {
    Auth.confirmSignIn.mockRejectedValue(cognitoError("NotAuthorizedException"));
    await reachMfaStep();

    enterCode(CODE);

    await expectPasswordFormWithEmailKept();
    expect(screen.getByText(SESSION_EXPIRED_MESSAGE)).toBeInTheDocument();
    expect(locationStub.reload).not.toHaveBeenCalled();
  });

  it("goes back to the password form without an error when the user leaves the MFA step", async () => {
    Auth.confirmSignIn.mockRejectedValue(cognitoError("CodeMismatchException"));
    await reachMfaStep();
    enterCode(CODE);
    await screen.findByText("Invalid code. Please try again.");

    fireEvent.click(screen.getByRole("button", { name: "Back to login" }));

    await expectPasswordFormWithEmailKept();
    expect(screen.queryByText("Invalid code. Please try again.")).not.toBeInTheDocument();
    expect(screen.queryByText(SESSION_EXPIRED_MESSAGE)).not.toBeInTheDocument();
  });

  it("refuses an unsupported challenge without completing the login", async () => {
    Auth.signIn.mockResolvedValue({ username: "user-123", challengeName: "SMS_MFA" });
    renderLogin();

    submitPassword();

    expect(await screen.findByText(UNSUPPORTED_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeEnabled();
    expect(screen.queryByRole("heading", { name: /two-factor authentication/i })).not.toBeInTheDocument();
    expect(authChangedListener).not.toHaveBeenCalled();
    expect(locationStub.reload).not.toHaveBeenCalled();
  });

  it("sends the code only once while a verification is still in flight", async () => {
    Auth.confirmSignIn.mockReturnValue(new Promise(() => {}));
    await reachMfaStep();

    enterCode(CODE);
    const form = screen.getByRole("form", { name: "Authenticator code" });
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(Auth.confirmSignIn).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /verifying/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Back to login" })).toBeDisabled();
  });
});
