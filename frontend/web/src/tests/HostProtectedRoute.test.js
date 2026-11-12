import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import HostProtectedRoute from "../features/auth/hostauth/HostProtectedRoute";
import { useUser } from "../features/auth/UserContext";
import { hasReviewApprovalAccess } from "../features/review/services/reviewAPI";

jest.mock("../features/auth/UserContext", () => ({ useUser: jest.fn() }));
jest.mock("../features/hostdashboard/hostintegrations/channexApi", () => ({ getChannexAdminAccess: jest.fn() }));
jest.mock("../features/review/services/reviewAPI", () => ({ hasReviewApprovalAccess: jest.fn() }));

const renderHostDashboard = (path = "/hostdashboard") => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/" element={<div>Home page</div>} />
      <Route path="/hostdashboard/*" element={<HostProtectedRoute><div>Host dashboard</div></HostProtectedRoute>} />
      <Route path="/hostdashboard/admin/review-approval" element={
        <HostProtectedRoute><div>Review approval dashboard</div></HostProtectedRoute>
      } />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  jest.clearAllMocks();
  useUser.mockReturnValue({ user: { username: "staff" }, role: "Traveler", isLoading: false });
});

test("redirects an authorized review approver to the admin dashboard", async () => {
  hasReviewApprovalAccess.mockResolvedValue(true);
  renderHostDashboard();

  expect(await screen.findByText("Review approval dashboard")).toBeInTheDocument();
});

test("redirects a traveler without review approval access", async () => {
  hasReviewApprovalAccess.mockResolvedValue(false);
  renderHostDashboard();

  expect(await screen.findByText("Home page")).toBeInTheDocument();
});

test("blocks an admin role from opening host pages directly", async () => {
  useUser.mockReturnValue({ user: { username: "admin" }, role: "Admin", isLoading: false });
  renderHostDashboard("/hostdashboard/reservations");

  expect(await screen.findByText("Review approval dashboard")).toBeInTheDocument();
  expect(screen.queryByText("Host dashboard")).not.toBeInTheDocument();
});

test("blocks a host who also has review approval access", async () => {
  useUser.mockReturnValue({ user: { username: "staff" }, role: "Host", isLoading: false });
  hasReviewApprovalAccess.mockResolvedValue(true);
  renderHostDashboard("/hostdashboard/reservations");

  expect(await screen.findByText("Review approval dashboard")).toBeInTheDocument();
  expect(screen.queryByText("Host dashboard")).not.toBeInTheDocument();
});

test("keeps host pages closed when review approval access cannot be verified", async () => {
  useUser.mockReturnValue({ user: { username: "host" }, role: "Host", isLoading: false });
  hasReviewApprovalAccess.mockResolvedValue(null);
  renderHostDashboard("/hostdashboard/reservations");

  expect(await screen.findByRole("alert")).toHaveTextContent("Could not verify dashboard access");
  expect(screen.queryByText("Host dashboard")).not.toBeInTheDocument();
});

test("allows hosts without review approval access", async () => {
  hasReviewApprovalAccess.mockResolvedValue(false);
  useUser.mockReturnValue({ user: { username: "host" }, role: "Host", isLoading: false });
  renderHostDashboard();

  expect(await screen.findByText("Host dashboard")).toBeInTheDocument();
});
