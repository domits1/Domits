import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
      <Route path="/hostdashboard/reservations" element={<HostProtectedRoute><div>Host reservations</div></HostProtectedRoute>} />
      <Route path="/hostdashboard/admin/review-approval" element={<HostProtectedRoute><div>Review administration</div></HostProtectedRoute>} />
      <Route path="/hostdashboard/admin/property-review" element={<HostProtectedRoute><div>Property administration</div></HostProtectedRoute>} />
    </Routes>
  </MemoryRouter>
);

beforeEach(() => {
  jest.resetAllMocks();
  useUser.mockReturnValue({ user: { username: "host-1" }, role: ROLES.HOST, isPOM: false, isLoading: false });
});

test("does not recheck when the same account gets a new user object", async () => {
  hasReviewApprovalAccess.mockResolvedValue(false);
  const guard = <MemoryRouter><HostProtectedRoute><div>Host dashboard</div></HostProtectedRoute></MemoryRouter>;
  const view = render(guard);
  await screen.findByText("Host dashboard");
  useUser.mockReturnValue({ user: { username: "host-1" }, role: ROLES.HOST, isLoading: false });
  view.rerender(<MemoryRouter><HostProtectedRoute><div>Host dashboard</div></HostProtectedRoute></MemoryRouter>);
  expect(screen.getByText("Host dashboard")).toBeInTheDocument();
  expect(hasReviewApprovalAccess).toHaveBeenCalledTimes(1);
  useUser.mockReturnValue({ user: { username: "host-2" }, role: ROLES.HOST, isLoading: false });
  view.rerender(<MemoryRouter><HostProtectedRoute><div>Host dashboard</div></HostProtectedRoute></MemoryRouter>);
  await waitFor(() => expect(hasReviewApprovalAccess).toHaveBeenCalledTimes(2));
  expect(await screen.findByText("Host dashboard")).toBeInTheDocument();
});

test.each([false, null])("preserves ordinary host access when approval access is %s", async (answer) => {
  hasReviewApprovalAccess.mockResolvedValue(answer);
  renderGuard();
  expect(await screen.findByText("Host dashboard")).toBeInTheDocument();
});

test.each([ROLES.GUEST_EXPERIENCE_MANAGER, ROLES.PROPERTY_OPERATIONS_MANAGER, ROLES.RESERVATION_MANAGER, ROLES.GENERAL_MANAGER])("redirects a backend-confirmed %s approver away from the host dashboard", async (role) => {
  useUser.mockReturnValue({ user: {}, role, isLoading: false });
  hasReviewApprovalAccess.mockResolvedValue(true);
  renderGuard();
  expect(await screen.findByText("Review administration")).toBeInTheDocument();
  expect(screen.queryByText("Host dashboard")).not.toBeInTheDocument();
});

test("redirects admins only after ReviewSystem confirms approval access", async () => {
  useUser.mockReturnValue({ user: {}, role: ROLES.ADMIN, isLoading: false });
  hasReviewApprovalAccess.mockResolvedValue(true);
  renderGuard();
  expect(await screen.findByText("Review administration")).toBeInTheDocument();
  expect(hasReviewApprovalAccess).toHaveBeenCalled();
});

test.each([false, null])("preserves Admin host access when approval access is %s", async (answer) => {
  useUser.mockReturnValue({ user: {}, role: ROLES.ADMIN, isLoading: false });
  hasReviewApprovalAccess.mockResolvedValue(answer);
  renderGuard();
  expect(await screen.findByText("Host dashboard")).toBeInTheDocument();
  expect(screen.queryByText("Review administration")).not.toBeInTheDocument();
});

test("lets Admins retry an unknown approval result before redirecting", async () => {
  useUser.mockReturnValue({ user: {}, role: ROLES.ADMIN, isLoading: false });
  hasReviewApprovalAccess.mockResolvedValueOnce(null).mockResolvedValueOnce(true);
  renderGuard("/hostdashboard/admin/review-approval");
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not verify review administration access.");
  expect(screen.queryByText("Host dashboard")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Review administration")).toBeInTheDocument();
  expect(hasReviewApprovalAccess).toHaveBeenCalledTimes(2);
});

test.each([ROLES.ADMIN, ROLES.HOST])("denies review administration to a non-approver %s", async (role) => {
  useUser.mockReturnValue({ user: {}, role, isLoading: false });
  hasReviewApprovalAccess.mockResolvedValue(false);
  renderGuard("/hostdashboard/admin/review-approval");
  expect(await screen.findByRole("alert")).toHaveTextContent("Your account does not have review approval access.");
  expect(screen.queryByText("Review administration")).not.toBeInTheDocument();
});

test("preserves access to other admin paths without assuming review privileges", async () => {
  useUser.mockReturnValue({ user: {}, role: ROLES.ADMIN, isLoading: false });
  renderGuard("/hostdashboard/admin/property-review");
  expect(await screen.findByText("Property administration")).toBeInTheDocument();
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

test("preserves a nested host page during a review outage", async () => {
  hasReviewApprovalAccess.mockResolvedValue(null);
  renderGuard("/hostdashboard/reservations");
  expect(await screen.findByText("Host reservations")).toBeInTheDocument();
});

test("redirects a host with confirmed approval access away from a nested host page", async () => {
  hasReviewApprovalAccess.mockResolvedValue(true);
  renderGuard("/hostdashboard/reservations");
  expect(await screen.findByText("Review administration")).toBeInTheDocument();
  expect(screen.queryByText("Host reservations")).not.toBeInTheDocument();
});
