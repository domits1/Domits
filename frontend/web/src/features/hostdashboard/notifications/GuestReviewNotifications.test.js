import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ReviewAlertsProvider from "./ReviewAlertsProvider";
import NotificationBell from "./NotificationBell";
import ReviewNotifications from "./ReviewNotifications";
import { getIdToken } from "../../../services/getAccessToken";
jest.mock("../../../services/getAccessToken", () => ({ getIdToken: jest.fn() }));
jest.mock("../../review/services/reviewAPI", () => ({ API_REVIEW_BASE: "https://example.test", hasReviewApprovalAccess: jest.fn() }));
const types = ["REVIEW_APPROVED", "REVIEW_REJECTED", "REVIEW_PUBLISHED", "HOST_RESPONDED"];
const row = (i, status = "UNREAD") => ({ id: `a${i}`, alert_type: types[i], status, review_id: `r${i}`, property_id: "p1",
  created_at: 1794744000000, private_feedback: "SECRET", moderation_notes: "STAFF ONLY", message: "INTERNAL" });
const ok = data => Promise.resolve({ ok: true, json: async () => data });
let rows;
const mount = () => render(<MemoryRouter initialEntries={["/guestdashboard/review-notifications"]}><ReviewAlertsProvider><NotificationBell /><ReviewNotifications /></ReviewAlertsProvider></MemoryRouter>);
beforeEach(() => {
  rows = types.map((_, i) => row(i)); getIdToken.mockResolvedValue("guest-jwt");
  global.fetch = jest.fn((url, options) => {
    if (options.method === "PATCH") {
      const [, id, action] = url.match(/alerts\/(.*?)\/(read|dismiss)/);
      rows = rows.map(a => a.id === id ? { ...a, status: action === "read" ? "READ" : "DISMISSED" } : a);
      return ok({ alert: rows.find(a => a.id === id) });
    }
    return ok({ alerts: url.includes("status=UNREAD") ? rows.filter(a => a.status === "UNREAD") : rows, unread_count: 99 });
  });
});
afterEach(() => jest.restoreAllMocks());

test("renders guest-only safe summaries, authenticated requests and review-specific navigation", async () => {
  rows.push({ ...row(0), id: "admin", alert_type: "REVIEW_FLAGGED" }, { ...row(0), id: "host", alert_type: "NEW_REVIEW" });
  mount(); const bell = await screen.findByRole("button", { name: "Review notifications, 4 unread" });
  const list = screen.getByRole("list", { name: "Review alerts" });
  ["Review approved", "Review rejected", "Review published", "Host responded"].forEach(label => expect(within(list).getByText(label)).toBeInTheDocument());
  within(list).getAllByRole("link").forEach((link, i) => expect(link).toHaveAttribute("href", `/guestdashboard/reviews?reviewId=r${i}`));
  expect(list.querySelectorAll("time")).toHaveLength(4);
  for (const value of ["SECRET", "STAFF ONLY", "INTERNAL", "Review flagged", "New review"]) expect(document.body.textContent).not.toContain(value);
  expect(fetch.mock.calls.every(([url, options]) => options.headers.Authorization === "guest-jwt" && !url.includes("recipient"))).toBe(true);
  expect(fetch.mock.calls.some(([url]) => url.includes("status=UNREAD"))).toBe(true);
  fireEvent.click(bell);
  expect(screen.getByRole("link", { name: "View all notifications" })).toHaveAttribute("href", "/guestdashboard/review-notifications");
  fireEvent.keyDown(screen.getByRole("region", { name: "Review notifications" }), { key: "Escape" }); expect(bell).toHaveFocus();
});

test("read and dismiss use PATCH and reconcile badge and list", async () => {
  mount(); await screen.findByRole("button", { name: "Review notifications, 4 unread" });
  fireEvent.click(screen.getByRole("button", { name: "Mark notification for Property p1 / Review r0 as read" }));
  await screen.findByRole("button", { name: "Review notifications, 3 unread" });
  fireEvent.click(screen.getByRole("button", { name: "Dismiss notification for Property p1 / Review r1" }));
  await screen.findByRole("button", { name: "Review notifications, 2 unread" });
  expect(screen.queryByText("Review rejected")).not.toBeInTheDocument();
  expect(fetch.mock.calls.filter(([, options]) => options.method === "PATCH").map(([url]) => url)).toEqual([
    "https://example.test/reviews/alerts/a0/read", "https://example.test/reviews/alerts/a1/dismiss"]);
});

test.each(["read", "dismiss"])("failed %s preserves rows and unread count", async action => {
  mount(); await screen.findByRole("button", { name: "Review notifications, 4 unread" });
  fetch.mockResolvedValueOnce({ ok: false, status: 500 });
  fireEvent.click(screen.getByRole("button", { name: action === "read" ? "Mark notification for Property p1 / Review r0 as read" : "Dismiss notification for Property p1 / Review r0" }));
  await screen.findByRole("alert"); await screen.findByRole("button", { name: "Review notifications, 4 unread" });
  expect(screen.getByText("Review approved")).toBeInTheDocument();
});

test("counting does not block actions and stale count responses cannot overwrite a mutation", async () => {
  let finish;
  fetch.mockImplementationOnce(() => ok({ alerts: rows, unread_count: 4 }))
    .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  mount(); await screen.findByText("Review approved");
  await waitFor(() => expect(finish).toBeDefined());
  const button = screen.getByRole("button", { name: "Mark notification for Property p1 / Review r0 as read" }); expect(button).toBeEnabled();
  fireEvent.click(button); await screen.findByRole("button", { name: "Review notifications, 3 unread" });
  await act(async () => finish({ ok: true, json: async () => ({ alerts: types.map((_, i) => row(i)), unread_count: 4 }) }));
  expect(screen.getByRole("button", { name: "Review notifications, 3 unread" })).toBeInTheDocument();
});

test.each(["missing", "expired"])("%s authentication clears guest alerts without fetching", async state => {
  if (state === "missing") getIdToken.mockResolvedValue(null); else getIdToken.mockRejectedValue(new Error("No current user"));
  mount();
  expect(await screen.findByRole("alert")).toHaveTextContent("Please sign in"); expect(fetch).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: /Review notifications,/ })).not.toBeInTheDocument();
});

test("switching accounts discards old guest results", async () => {
  let finish; fetch.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })); mount();
  await waitFor(() => expect(finish).toBeDefined());
  rows = [row(3)]; getIdToken.mockResolvedValue("new-guest-jwt"); fireEvent(window, new Event("authChanged"));
  await screen.findByRole("button", { name: "Review notifications, 1 unread" });
  await act(async () => finish({ ok: true, json: async () => ({ alerts: [row(0)], unread_count: 1 }) }));
  expect(screen.queryByText("Review approved")).not.toBeInTheDocument(); expect(screen.getByText("Host responded")).toBeInTheDocument();
});

test("guest list remains paginated and empty/count errors offer recovery", async () => {
  fetch.mockImplementationOnce(() => ok({ alerts: Array.from({ length: 50 }, (_, i) => ({ ...row(0), id: `read${i}`, status: "READ" })), unread_count: 0 }))
    .mockResolvedValueOnce({ ok: false, status: 500 }); mount();
  await screen.findAllByText("Review approved"); expect(await screen.findByRole("alert")).toHaveTextContent("Could not count");
  expect(screen.getByRole("button", { name: "Load more notifications" })).toBeEnabled();
});


test("empty guest notifications show a zero badge count and an empty state", async () => {
  rows = []; mount();
  await screen.findByRole("button", { name: "Review notifications, 0 unread" });
  expect(await screen.findByText("No notifications yet.")).toBeInTheDocument();
});


test("mixed pages remain navigable when the first page contains no guest alerts", async () => {
  const hostRows = Array.from({ length: 50 }, (_, i) => ({ ...row(0), id: `host${i}`, alert_type: "NEW_REVIEW" }));
  fetch.mockImplementation(url => ok({ alerts: url.includes("offset=50") ? [row(3)] : hostRows, unread_count: 51 }));
  mount(); await screen.findByRole("button", { name: "Review notifications, 1 unread" });
  expect(screen.getByText("No guest notifications in the loaded results.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Load more notifications" }));
  expect(await screen.findByText("Host responded")).toBeInTheDocument();
});
