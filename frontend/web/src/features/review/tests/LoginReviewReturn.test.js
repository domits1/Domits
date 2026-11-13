import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Auth } from "aws-amplify";
import Login from "../../auth/Login";
import { safeReviewDestination } from "../../auth/safeReviewDestination";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"), useNavigate: () => mockNavigate,
}));
jest.mock("aws-amplify", () => ({ Auth: {
  currentAuthenticatedUser: jest.fn(), signIn: jest.fn(), confirmSignIn: jest.fn(),
} }));
beforeEach(() => {
  jest.clearAllMocks();
  Auth.currentAuthenticatedUser.mockRejectedValue(new Error("not signed in"));
});
const renderLogin = () => render(<MemoryRouter initialEntries={[{
  pathname: "/login", state: { returnTo: "/review?bookingId=b1" },
}]}><Login /></MemoryRouter>);

it("returns to the booking review after password sign-in", async () => {
  Auth.signIn.mockResolvedValue({ username: "guest" });
  renderLogin();
  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "guest@example.com" } });
  fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Secret123!" } });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/review?bookingId=b1", { replace: true }));
});
it("returns an existing authenticated session to its booking review", async () => {
  Auth.currentAuthenticatedUser.mockResolvedValue({ attributes: { "custom:group": "Guest" } });
  renderLogin();
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/review?bookingId=b1", { replace: true }));
});
it.each(["https://example.com/review?bookingId=b1", "//example.com/review?bookingId=b1",
  "/guestdashboard", "/review", "/review?bookingId=", "javascript:alert(1)"])("rejects unsafe or incomplete return destination %s", value => {
  expect(safeReviewDestination(value)).toBeNull();
});
it.each(["bookingId", "reservationId", "reviewId"])("preserves review links using %s", key => {
  expect(safeReviewDestination(`/review?${key}=b1`)).toBe(`/review?${key}=b1`);
});

it("preserves the booking destination through MFA", async () => {
  const user = { username: "guest", challengeName: "SOFTWARE_TOKEN_MFA" };
  Auth.signIn.mockResolvedValue(user);
  Auth.confirmSignIn.mockResolvedValue({});
  renderLogin();
  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "guest@example.com" } });
  fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Secret123!" } });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));
  await screen.findByRole("heading", { name: /two-factor authentication/i });
  expect(mockNavigate).not.toHaveBeenCalled();
  const inputs = screen.getAllByRole("textbox");
  "123456".split("").forEach((value, index) => fireEvent.change(inputs[index], { target: { value } }));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/review?bookingId=b1", { replace: true }));
});
