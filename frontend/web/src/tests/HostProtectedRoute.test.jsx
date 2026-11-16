import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import HostProtectedRoute from "../features/auth/hostauth/HostProtectedRoute";
import { useUser } from "../features/auth/UserContext";
import { hasReviewApprovalAccess } from "../features/review/services/reviewAPI";
import { ROLES } from "../features/auth/roles";

jest.mock("../features/auth/UserContext", () => ({ useUser: jest.fn() }));
jest.mock("../features/review/services/reviewAPI", () => ({ hasReviewApprovalAccess: jest.fn() }));

const renderGuard = (path = "/hostdashboard") => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/" element={<div>Public home</div>} />
      <Route path="/hostdashboard" element={<HostProtectedRoute><div>Host dashboard</div></HostProtectedRoute>} />
      <Route path="/hostdashboard/admin/review-approval" element={<HostProtectedRoute><div>Review administration</div></HostProtectedRoute>} />
    </Routes>
  </MemoryRouter>
);

beforeEach(() => {
  jest.resetAllMocks();
  useUser.mockReturnValue({ user: { username: "host-1" }, role: ROLES.HOST, isPOM: false, isLoading: false });
});

test.each([false, null])("preserves ordinary host access when approval access is %s", async (answer) => {
  hasReviewApprovalAccess.mockResolvedValue(answer);
  renderGuard();
  expect(await screen.findByText("Host dashboard")).toBeInTheDocument();
});

test("keeps confirmed approvers out of the ordinary host dashboard", async () => {
  hasReviewApprovalAccess.mockResolvedValue(true);
  renderGuard();
  expect(await screen.findByText("Review administration")).toBeInTheDocument();
  expect(screen.queryByText("Host dashboard")).not.toBeInTheDocument();
});

test("redirects admins without probing ReviewSystem", async () => {
  useUser.mockReturnValue({ user: {}, role: ROLES.ADMIN, isLoading: false });
  renderGuard();
  expect(await screen.findByText("Review administration")).toBeInTheDocument();
  expect(hasReviewApprovalAccess).not.toHaveBeenCalled();
});

test.each([false, null])("does not grant travelers host access when approval access is %s", async (answer) => {
  useUser.mockReturnValue({ user: {}, role: ROLES.TRAVELER, isLoading: false });
  hasReviewApprovalAccess.mockResolvedValue(answer);
  renderGuard();
  expect(await screen.findByText("Public home")).toBeInTheDocument();
});

test("allows an approver without a host role into review administration", async () => {
  useUser.mockReturnValue({ user: {}, role: ROLES.TRAVELER, isLoading: false });
  hasReviewApprovalAccess.mockResolvedValue(true);
  renderGuard("/hostdashboard/admin/review-approval");
  expect(await screen.findByText("Review administration")).toBeInTheDocument();
});

test("preserves property operations membership during a review outage", async () => {
  useUser.mockReturnValue({ user: {}, role: ROLES.TRAVELER, isPOM: true, isLoading: false });
  hasReviewApprovalAccess.mockResolvedValue(null);
  renderGuard();
  expect(await screen.findByText("Host dashboard")).toBeInTheDocument();
});
