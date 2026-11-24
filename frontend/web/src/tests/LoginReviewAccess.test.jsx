import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Auth } from "aws-amplify";
import Login from "../features/auth/Login";
import { hasReviewApprovalAccess } from "../features/review/services/reviewAPI";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ ...jest.requireActual("react-router-dom"), useNavigate: () => mockNavigate }));
jest.mock("aws-amplify", () => ({ Auth: { currentAuthenticatedUser: jest.fn(), signIn: jest.fn(), confirmSignIn: jest.fn() } }));
jest.mock("../features/review/services/reviewAPI", () => ({ hasReviewApprovalAccess: jest.fn() }));

const originalLocation = globalThis.location;
const renderLogin = (entry = "/login?redirect=%2Fhostdashboard") => render(<MemoryRouter initialEntries={[entry]}><Login /></MemoryRouter>);

beforeEach(() => {
  jest.resetAllMocks();
  Object.defineProperty(globalThis, "location", { configurable: true, value: { href: "/login", reload: jest.fn() } });
});
afterEach(() => Object.defineProperty(globalThis, "location", { configurable: true, value: originalLocation }));

test.each(["/guestdashboard/messages", "/hostdashboard/admin/review-approval"])("preserves a guest's requested destination %s without probing", async (destination) => {
  Auth.currentAuthenticatedUser.mockResolvedValue({ attributes: { "custom:group": "Traveler" } });
  renderLogin(`/login?redirect=${encodeURIComponent(destination)}`);
  await waitFor(() => expect(globalThis.location.href).toBe(destination));
  expect(hasReviewApprovalAccess).not.toHaveBeenCalled();
});

test("sends an authenticated approver to the admin dashboard", async () => {
  Auth.currentAuthenticatedUser.mockResolvedValue({ attributes: { "custom:group": "Host" } });
  hasReviewApprovalAccess.mockResolvedValue(true);
  renderLogin();
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/hostdashboard/admin/review-approval"));
});

test.each([false, null])("preserves an authenticated host's redirect when approval access is %s", async (answer) => {
  Auth.currentAuthenticatedUser.mockResolvedValue({ attributes: { "custom:group": "Host" } });
  hasReviewApprovalAccess.mockResolvedValue(answer);
  renderLogin();
  await waitFor(() => expect(globalThis.location.href).toBe("/hostdashboard"));
  expect(mockNavigate).not.toHaveBeenCalled();
});

test.each([true, false, null])("applies the approval policy after password sign-in (%s)", async (answer) => {
  Auth.currentAuthenticatedUser.mockRejectedValue(new Error("Signed out"));
  Auth.signIn.mockResolvedValue({ username: "user-1" });
  hasReviewApprovalAccess.mockResolvedValue(answer);
  renderLogin();
  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "host@example.com" } });
  fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password" } });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));
  await waitFor(() => expect(globalThis.location.href).toBe(answer === true ? "/hostdashboard/admin/review-approval" : "/hostdashboard"));
  expect(hasReviewApprovalAccess).toHaveBeenCalled();
});

test("lands on the admin dashboard after completing MFA", async () => {
  Auth.currentAuthenticatedUser.mockRejectedValue(new Error("Signed out"));
  Auth.signIn.mockResolvedValue({ username: "user-1", challengeName: "SOFTWARE_TOKEN_MFA" });
  Auth.confirmSignIn.mockResolvedValue({ username: "user-1" });
  hasReviewApprovalAccess.mockResolvedValue(true);
  renderLogin();
  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "host@example.com" } });
  fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password" } });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));
  await screen.findByRole("heading", { name: /two-factor authentication/i });
  screen.getAllByRole("textbox").forEach((input) => fireEvent.change(input, { target: { value: "1" } }));
  fireEvent.click(screen.getByRole("button", { name: /verify/i }));
  await waitFor(() => expect(globalThis.location.href).toBe("/hostdashboard/admin/review-approval"));
  expect(hasReviewApprovalAccess).toHaveBeenCalled();
});

test.each(["Host", "Traveler"])("routes a %s admin without a redirect", async (group) => {
  Auth.currentAuthenticatedUser.mockResolvedValue({ attributes: { "custom:group": group } });
  hasReviewApprovalAccess.mockResolvedValue(true);
  renderLogin("/login");
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/hostdashboard/admin/review-approval"));
});
