import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ReviewAlertsProvider from "./ReviewAlertsProvider";
import NotificationBell from "./NotificationBell";
import ReviewNotifications from "./ReviewNotifications";
import { getIdToken } from "../../../services/getAccessToken";
import { hasReviewApprovalAccess } from "../../review/services/reviewAPI";
jest.mock("../../../services/getAccessToken", () => ({ getIdToken: jest.fn() }));
jest.mock("../../review/services/reviewAPI", () => ({ API_REVIEW_BASE: "https://example.test", hasReviewApprovalAccess: jest.fn() }));
const path = "/hostdashboard/admin/review-approval";
const types = ["REVIEW_PENDING_APPROVAL", "REVIEW_FLAGGED", "REVIEW_PENDING_PUBLICATION"];
const row = (i = 0, status = "UNREAD") => ({ id: `a${i}`, status, alert_type: types[i], property_id: "p1", review_id: `r${i}`,
  created_at: 1794744000000, private_feedback: "SECRET", title: "PRIVATE TITLE", message: "UNPUBLISHED", display: { destination: "https://evil.test" } });
const ok = body => Promise.resolve({ ok: true, json: async () => body });
const page = (alerts = types.map((_, i) => row(i)), unread_count = 9) => ({ alerts, unread_count });
const mount = () => render(<MemoryRouter initialEntries={[path]}><ReviewAlertsProvider><NotificationBell /><ReviewNotifications /></ReviewAlertsProvider></MemoryRouter>);
beforeEach(() => { getIdToken.mockResolvedValue("jwt"); hasReviewApprovalAccess.mockResolvedValue(true); global.fetch = jest.fn(() => ok(page())); });
afterEach(() => jest.restoreAllMocks());

test("shares authenticated administrator load, scoped count, references, timestamps and safe navigation", async () => {
  mount(); const bell = await screen.findByRole("button", { name: "Review notifications, 3 unread" });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith("https://example.test/reviews/alerts?limit=50&offset=0", { method: "GET", headers: { Authorization: "jwt" } });
  const list = screen.getByRole("list", { name: "Review alerts" });
  for (const label of ["Review pending approval", "Review flagged", "Review pending publication"]) expect(within(list).getByText(label)).toBeInTheDocument();
  const links = within(list).getAllByRole("link");
  ["pending-approval", "moderation", "approved"].forEach((tab, i) => expect(links[i]).toHaveAttribute("href", `${path}?tab=${tab}&reviewId=r${i}`));
  expect(list.querySelectorAll("time")).toHaveLength(3);
  for (const secret of ["SECRET", "PRIVATE TITLE", "UNPUBLISHED", "evil.test"]) expect(document.body.textContent).not.toContain(secret);
  fireEvent.click(bell); const dropdown = screen.getByRole("region", { name: "Review notifications" });
  expect(within(dropdown).getByRole("link", { name: "View all notifications" })).toHaveAttribute("href", `${path}?notifications=1`);
  fireEvent.keyDown(dropdown, { key: "Escape" }); expect(bell).toHaveFocus();
});

test("dropdown and list read/dismiss actions synchronize counts only after confirmed success", async () => {
  fetch.mockImplementationOnce(() => ok(page())).mockImplementationOnce(() => ok({ alert: row(0, "READ") }))
    .mockImplementationOnce(() => ok({ alert: row(1, "DISMISSED") }));
  mount(); fireEvent.click(await screen.findByRole("button", { name: "Review notifications, 3 unread" }));
  const dropdown = screen.getByRole("region", { name: "Review notifications" });
  fireEvent.click(within(dropdown).getAllByRole("button", { name: "Mark as read" })[0]);
  await screen.findByRole("button", { name: "Review notifications, 2 unread" });
  fireEvent.click(within(dropdown).getAllByRole("button", { name: "Dismiss" })[1]);
  await screen.findByRole("button", { name: "Review notifications, 1 unread" });
  expect(dropdown).toHaveFocus(); expect(within(dropdown).queryByText("Review flagged")).not.toBeInTheDocument();
  expect(fetch.mock.calls[1][0]).toMatch(/\/a0\/read$/); expect(fetch.mock.calls[1][1].method).toBe("PATCH");
  expect(fetch.mock.calls[2][0]).toMatch(/\/a1\/dismiss$/);
});

test.each(["read", "dismiss"])("failed %s leaves unread state and count intact; retry recovers", async action => {
  fetch.mockImplementationOnce(() => ok(page())).mockResolvedValueOnce({ ok: false, status: 500 }).mockImplementationOnce(() => ok(page()));
  mount(); await screen.findByRole("button", { name: "Review notifications, 3 unread" });
  fireEvent.click(screen.getByRole("button", { name: action === "read" ? "Mark notification for Property p1 / Review r0 as read" : "Dismiss notification for Property p1 / Review r0" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Please try again");
  expect(screen.getByRole("button", { name: "Review notifications, 3 unread" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
});

test.each([false, null])("denies administrator alerts when access check returns %s", async allowed => {
  hasReviewApprovalAccess.mockResolvedValue(allowed); mount();
  expect(await screen.findByRole("alert")).toHaveTextContent(allowed === false ? "access is required" : "Could not verify");
  expect(fetch).not.toHaveBeenCalled(); expect(screen.queryByRole("button", { name: /Review notifications,/ })).not.toBeInTheDocument();
});

test("authorization loss clears existing alerts and hides bell", async () => {
  fetch.mockImplementationOnce(() => ok(page())).mockResolvedValueOnce({ ok: false, status: 403 });
  mount(); await screen.findByRole("button", { name: "Review notifications, 3 unread" });
  fireEvent.click(screen.getByRole("button", { name: "Dismiss notification for Property p1 / Review r0" }));
  await screen.findByRole("alert"); expect(screen.queryByText("Review pending approval")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Review notifications,/ })).not.toBeInTheDocument();
});

test("loads all pages to exclude host, guest and dismissed alerts from administrator count", async () => {
  const others = Array.from({ length: 48 }, (_, i) => ({ ...row(), id: `host${i}`, alert_type: "NEW_REVIEW" }));
  fetch.mockImplementationOnce(() => ok(page([...others, row(0), { ...row(1), alert_type: "HOST_RESPONDED" }])))
    .mockImplementationOnce(() => ok(page([row(0), row(2, "READ"), row(1, "DISMISSED")])));
  mount(); await screen.findByRole("button", { name: "Review notifications, 1 unread" });
  expect(fetch.mock.calls[1][0]).toMatch(/offset=50$/); expect(screen.queryByText("New review")).not.toBeInTheDocument();
  expect(screen.queryByText("Review flagged")).not.toBeInTheDocument();
});

test("loading and empty states are accessible", async () => {
  let complete; fetch.mockImplementation(() => new Promise(resolve => { complete = resolve; })); mount();
  await waitFor(() => expect(complete).toBeDefined());
  expect(screen.getByText("Loading notifications…")).toBeInTheDocument();
  await act(async () => complete({ ok: true, json: async () => page([], 0) }));
  expect(screen.getByText("No notifications yet.")).toBeInTheDocument();
});


test("account changes discard pending administrator results before rechecking access", async () => {
  let finish;
  fetch.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })); mount();
  await waitFor(() => expect(finish).toBeDefined());
  hasReviewApprovalAccess.mockResolvedValue(false);
  fireEvent(window, new Event("authChanged"));
  await screen.findByRole("alert");
  await act(async () => finish({ ok: true, json: async () => page() }));
  expect(screen.queryByText("Review pending approval")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Review notifications,/ })).not.toBeInTheDocument();
});


test("a concurrent dismissal returned by mark-read removes the row and updates the count", async () => {
  fetch.mockImplementationOnce(() => ok(page())).mockImplementationOnce(() => ok({ alert: row(0, "DISMISSED") }));
  mount(); await screen.findByRole("button", { name: "Review notifications, 3 unread" });
  fireEvent.click(screen.getByRole("button", { name: "Mark notification for Property p1 / Review r0 as read" }));
  await screen.findByRole("button", { name: "Review notifications, 2 unread" });
  expect(screen.queryByText("Review pending approval")).not.toBeInTheDocument();
});
