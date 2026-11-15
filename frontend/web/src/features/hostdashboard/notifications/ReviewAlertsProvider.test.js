import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ReviewAlertsProvider, { requestAlerts } from "./ReviewAlertsProvider";
import NotificationBell from "./NotificationBell";
import ReviewNotifications from "./ReviewNotifications";
import { getIdToken } from "../../../services/getAccessToken";
jest.mock("../../../services/getAccessToken", () => ({ getIdToken: jest.fn() }));
jest.mock("../../review/services/reviewAPI", () => ({ API_REVIEW_BASE: "https://example.test" }));
const row = (id = "a", status = "UNREAD") => ({ id, status, alert_type: "NEW_REVIEW", property_id: "p1", created_at: 1794744000000,
  private_feedback: "SECRET", message: "UNPUBLISHED CONTENT" });
const ok = (body) => Promise.resolve({ ok: true, json: async () => body });
const page = (alerts = [row()], unread_count = 1) => ({ alerts, unread_count });
const mount = (path = "/hostdashboard") => render(<MemoryRouter initialEntries={[path]}><ReviewAlertsProvider><NotificationBell /><ReviewNotifications /></ReviewAlertsProvider></MemoryRouter>);
beforeEach(() => { getIdToken.mockResolvedValue("jwt"); global.fetch = jest.fn(); });
afterEach(() => jest.restoreAllMocks());

test("shares one authenticated load, uses safe summaries and property navigation", async () => {
  fetch.mockImplementation(() => ok(page())); mount();
  expect(await screen.findByText("A new review is available.")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/reviews/alerts?limit=50&offset=0"), expect.objectContaining({ headers: { Authorization: "jwt" } }));
  expect(screen.queryByText(/SECRET|UNPUBLISHED/)).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "View property for Property p1" })).toHaveAttribute("href", "/hostdashboard/property?ID=p1");
  expect(screen.getByRole("button", { name: "Review notifications, 1 unread" })).toBeInTheDocument();
});
test("read and dismiss are confirmed before changing shared state", async () => {
  let resolveAction;
  fetch.mockImplementationOnce(() => ok(page())).mockImplementationOnce(() => new Promise((resolve) => { resolveAction = resolve; }));
  mount(); await screen.findByText("A new review is available.");
  fireEvent.click(screen.getByRole("button", { name: /Mark notification/ }));
  expect(screen.getByRole("button", { name: "Review notifications, 1 unread" })).toBeInTheDocument();
  await waitFor(() => expect(resolveAction).toBeDefined());
  resolveAction({ ok: true, json: async () => ({ alert: row("a", "READ") }) });
  await screen.findByRole("button", { name: "Review notifications, 0 unread" });
  expect(fetch.mock.calls[1][0]).toMatch(/\/a\/read$/);
  fetch.mockImplementationOnce(() => ok({ alert: row("a", "DISMISSED") }));
  fireEvent.click(screen.getByRole("button", { name: /Dismiss notification/ }));
  expect(await screen.findByText("No notifications yet.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Refresh notifications" })).not.toBeInTheDocument();
  expect(fetch.mock.calls[2][0]).toMatch(/\/a\/dismiss$/);
});
test("failed actions preserve rows and count with retry feedback", async () => {
  fetch.mockImplementationOnce(() => ok(page())).mockResolvedValueOnce({ ok: false, status: 500 });
  mount(); await screen.findByText("A new review is available.");
  fireEvent.click(screen.getByRole("button", { name: /Dismiss notification/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Please try again");
  expect(screen.getByRole("button", { name: "Review notifications, 1 unread" })).toBeInTheDocument();
  expect(screen.getByText("A new review is available.")).toBeInTheDocument();
  fetch.mockImplementationOnce(() => ok(page())); fireEvent.click(screen.getByText("Retry"));
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
});
test("authentication failure avoids fetch and non-host routes do not load", async () => {
  getIdToken.mockRejectedValueOnce(new Error("Please sign in")); mount();
  expect(await screen.findByRole("alert")).toHaveTextContent("Please sign in");
  expect(fetch).not.toHaveBeenCalled();
});
test("does not request notifications outside the host dashboard", () => { mount("/"); expect(fetch).not.toHaveBeenCalled(); });
test("StrictMode does not duplicate the initial request", async () => {
  fetch.mockImplementation(() => ok(page()));
  render(<React.StrictMode><MemoryRouter initialEntries={["/hostdashboard"]}><ReviewAlertsProvider><ReviewNotifications /></ReviewAlertsProvider></MemoryRouter></React.StrictMode>);
  await screen.findByText("A new review is available.");
  expect(fetch).toHaveBeenCalledTimes(1);
});
test("bulk actions apply to loaded alerts and search can show no matches", async () => {
  fetch.mockImplementationOnce(() => ok(page())).mockImplementationOnce(() => ok({ alert: row("a", "READ") }))
    .mockImplementationOnce(() => ok({ alert: row("a", "DISMISSED") }));
  mount(); await screen.findByText("A new review is available.");
  fireEvent.change(screen.getByLabelText("Search notifications"), { target: { value: "missing" } });
  expect(screen.getByText("No notifications match this filter.")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Search notifications"), { target: { value: "" } });
  fireEvent.click(screen.getByText("Mark matching alerts as read"));
  await screen.findByRole("button", { name: "Review notifications, 0 unread" });
  fireEvent.click(screen.getByText("Dismiss matching read alerts"));
  expect(await screen.findByText("No notifications yet.")).toBeInTheDocument();
});
test("surfaces authorization failures", async () => {
  fetch.mockResolvedValue({ ok: false, status: 403 });
  await expect(requestAlerts("")).rejects.toThrow("authorized host account");
});
test("authorization failures show the empty state without an alert", async () => {
  fetch.mockResolvedValue({ ok: false, status: 403 }); mount();
  await screen.findByText("No notifications yet.");
  await waitFor(() => expect(getIdToken).toHaveBeenCalled());
  expect(screen.queryByText("Please sign in with an authorized host account.")).not.toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
test("selected bulk action only updates the selected notification", async () => {
  fetch.mockImplementationOnce(() => ok(page([row("a"), row("b")], 2)))
    .mockImplementationOnce(() => ok({ alert: row("b", "READ") }));
  mount(); await screen.findByText("Showing 2 of 2 notifications");
  fireEvent.click(screen.getByLabelText("Select notification b for Property p1"));
  fireEvent.click(screen.getByText("Mark selected alerts as read"));
  await screen.findByRole("button", { name: "Review notifications, 1 unread" });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[1][0]).toMatch(/\/b\/read$/);
});
test("auth changes clear old alerts and visibility refreshes without overlapping requests", async () => {
  fetch.mockImplementation(() => ok(page())); mount();
  await screen.findByText("A new review is available.");
  let finish;
  fetch.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  fireEvent(window, new Event("authChanged"));
  await waitFor(() => expect(finish).toBeDefined());
  expect(screen.queryByText("A new review is available.")).not.toBeInTheDocument();
  fireEvent(document, new Event("visibilitychange"));
  expect(fetch).toHaveBeenCalledTimes(2);
  finish({ ok: true, json: async () => page([], 0) });
  await screen.findByText("No notifications yet.");
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  fireEvent(document, new Event("visibilitychange"));
  expect(await screen.findByText("A new review is available.")).toBeInTheDocument();
});
test("loads the next server offset without duplicate rows", async () => {
  fetch.mockImplementationOnce(() => ok(page(Array.from({ length: 50 }, (_, i) => row(String(i))), 50)))
    .mockImplementationOnce(() => ok(page([row("49"), row("50")], 51)));
  mount(); await screen.findByText("Showing 5 of 50 notifications");
  for (let i = 0; i < 10; i++) fireEvent.click(screen.getByText("Load more notifications"));
  expect(await screen.findByText("Showing 51 of 51 notifications")).toBeInTheDocument();
  expect(fetch.mock.calls[1][0]).toMatch(/offset=50$/);
});
test("without a selection, bulk actions only touch alerts matching the active filter", async () => {
  fetch.mockImplementationOnce(() => ok(page([row("a"), { ...row("b"), alert_type: "LOW_RATING" }], 2)))
    .mockImplementationOnce(() => ok({ alert: { ...row("b", "READ"), alert_type: "LOW_RATING" } }));
  mount(); await screen.findByText("Showing 2 of 2 notifications");
  fireEvent.click(screen.getByRole("button", { name: "Low ratings (1)" }));
  fireEvent.click(screen.getByText("Mark matching alerts as read"));
  await screen.findByRole("button", { name: "Review notifications, 1 unread" });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[1][0]).toMatch(/\/b\/read$/);
});
