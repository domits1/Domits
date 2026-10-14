import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Auth } from "aws-amplify";
import Login from "../features/auth/Login";

jest.mock("aws-amplify", () => ({
  Auth: {
    currentAuthenticatedUser: jest.fn(),
    signIn: jest.fn(),
    forgotPassword: jest.fn(),
    forgotPasswordSubmit: jest.fn(),
  },
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
}));

const USERNAME = "user-123";
const CODE = "123456";
const NEW_PASSWORD = "NewPass123!";

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

const goToResetStep = async () => {
  fireEvent.click(screen.getByRole("button", { name: /forgot password/i }));
  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "host@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: /send code/i }));
  await screen.findByRole("heading", { name: /reset password/i });
};

describe("Login password reset step", () => {
  beforeEach(() => {
    Auth.currentAuthenticatedUser.mockRejectedValue(new Error("not signed in"));
    Auth.forgotPassword.mockResolvedValue({});
    Auth.forgotPasswordSubmit.mockResolvedValue({});
    globalThis.fetch = jest.fn().mockResolvedValue({ json: async () => ({ body: USERNAME }) });
    globalThis.alert = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("lets the host type the code and a new password, then submits both", async () => {
    renderLogin();
    await goToResetStep();

    const passwordInput = screen.getByPlaceholderText("New password");
    expect(passwordInput).toHaveAttribute("type", "password");
    fireEvent.change(passwordInput, { target: { value: NEW_PASSWORD } });

    const digitInputs = screen.getAllByRole("textbox");
    expect(digitInputs).toHaveLength(6);
    CODE.split("").forEach((digit, index) => fireEvent.change(digitInputs[index], { target: { value: digit } }));

    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => expect(Auth.forgotPasswordSubmit).toHaveBeenCalledWith(USERNAME, CODE, NEW_PASSWORD));
  });

  it("starts the reset step with an empty password even after a failed login attempt", async () => {
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "old-attempt" } });

    await goToResetStep();

    expect(screen.getByPlaceholderText("New password")).toHaveValue("");
  });

  it("reveals the new password with the eye toggle", async () => {
    renderLogin();
    await goToResetStep();

    fireEvent.click(screen.getByRole("button", { name: /show password/i }));

    expect(screen.getByPlaceholderText("New password")).toHaveAttribute("type", "text");
  });

  it("shows the Cognito error when the submission is rejected", async () => {
    Auth.forgotPasswordSubmit.mockRejectedValue(new Error("Invalid verification code provided"));
    renderLogin();
    await goToResetStep();

    fireEvent.change(screen.getByPlaceholderText("New password"), { target: { value: NEW_PASSWORD } });
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    expect(await screen.findByText(/invalid verification code/i)).toBeInTheDocument();
    expect(globalThis.alert).not.toHaveBeenCalled();
  });
});
