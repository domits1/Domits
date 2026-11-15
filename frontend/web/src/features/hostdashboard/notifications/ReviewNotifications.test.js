import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ReviewNotifications from "./ReviewNotifications";

const alerts = ["review", "low", "declining", "overdue", "review", "low"].map((type, id) => ({
  id, type, property: `Property ${id}`, propertyId: `p ${id}`, message: `Feedback ${id}`,
  timestamp: `2026-11-${String(10 + id).padStart(2, "0")}T12:00:00Z`, read: id % 2 === 0,
  rating: type === "overdue" ? undefined : 4.4, previousRating: type === "declining" ? 4.8 : undefined,
}));
const setup = (props = {}) => render(<MemoryRouter><ReviewNotifications alerts={alerts} {...props} /></MemoryRouter>);
const filter = (name) => fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${name} \\(`) }));
const rows = () => within(screen.getByRole("list", { name: "Review alerts" })).getAllByRole("listitem");

test("renders previews newest first without mutating input and loads more", () => {
  setup();
  expect(rows()).toHaveLength(5);
  expect(rows()[0]).toHaveTextContent("Property 5");
  expect(rows()[4]).toHaveTextContent("Property 1");
  expect(alerts[0].id).toBe(0);
  expect(screen.getByText("Showing 5 of 6 notifications")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Load more notifications" }));
  expect(rows()).toHaveLength(6);
  expect(screen.queryByRole("button", { name: "Load more notifications" })).not.toBeInTheDocument();
  expect(screen.getByText("Feedback 0")).toBeInTheDocument();
  expect(screen.getAllByText("Rating: 4.4 / 5")).toHaveLength(5);
  expect(screen.getByText("Previously 4.8 / 5")).toBeInTheDocument();
  expect(screen.getByText("No rating available")).toBeInTheDocument();
  expect(screen.getAllByText("Unread")).toHaveLength(3);
  expect(screen.getAllByText("Read")).toHaveLength(3);
  expect(rows()[0].querySelector("time")).toHaveAttribute("datetime", alerts[5].timestamp);
});

test.each([
  ["Unread notifications", 3, "Property 5"], ["New reviews", 2, "Property 4"],
  ["Low ratings", 2, "Property 5"], ["Declining ratings", 1, "Property 2"],
  ["Overdue responses", 1, "Property 3"],
])("filters by %s", (label, count, first) => {
  setup();
  filter(label);
  expect(rows()).toHaveLength(count);
  expect(rows()[0]).toHaveTextContent(first);
  expect(screen.getByRole("button", { name: new RegExp(`^${label} \\(`) })).toHaveAttribute("aria-pressed", "true");
  filter("All notifications");
  expect(rows()).toHaveLength(5);
});

test("resets pagination after filter changes and supports keyboard activation", async () => {
  const user = userEvent.setup();
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Load more notifications" }));
  screen.getByRole("button", { name: /^Unread notifications/ }).focus();
  await user.keyboard(" ");
  expect(rows()).toHaveLength(3);
  filter("All notifications");
  expect(rows()).toHaveLength(5);
});

test("navigates to the existing property dashboard and review route fallback", async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><Routes>
    <Route path="/" element={<ReviewNotifications alerts={[alerts[0], { ...alerts[1], propertyId: undefined }]} />} />
    <Route path="/hostdashboard/property" element={<p>Property dashboard</p>} />
  </Routes></MemoryRouter>);
  expect(screen.getByRole("link", { name: "View reviews for Property 1" })).toHaveAttribute("href", "/hostdashboard/reviews");
  const link = screen.getByRole("link", { name: "View property for Property 0" });
  expect(link).toHaveAttribute("href", "/hostdashboard/property?ID=p%200");
  await user.click(link);
  expect(screen.getByText("Property dashboard")).toBeInTheDocument();
});

test("renders loading, error, empty and no-match states", () => {
  const { rerender } = setup({ loading: true });
  const page = (props) => <MemoryRouter><ReviewNotifications {...props} /></MemoryRouter>;
  expect(screen.getByRole("status")).toHaveTextContent("Loading notifications");
  expect(screen.getByRole("region")).toHaveAttribute("aria-busy", "true");
  rerender(page({ alerts, error: true }));
  expect(screen.getByRole("alert")).toHaveTextContent("Unable to load notifications");
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
  rerender(page({}));
  expect(screen.getByRole("status")).toHaveTextContent("No notifications yet");
  rerender(page({ alerts: [alerts[0]] }));
  filter("Unread notifications");
  expect(screen.getByRole("status")).toHaveTextContent("No notifications match this filter");
});

test("handles missing rating and timestamp and preserves long property text", () => {
  setup({ alerts: [{ ...alerts[0], property: "Long property ".repeat(30), rating: undefined, timestamp: "invalid" }] });
  expect(screen.getByText("No rating available")).toBeInTheDocument();
  expect(screen.getByText("Date unavailable")).toBeInTheDocument();
  expect(rows()[0]).toHaveTextContent("Long property");
});

test("hands keyboard focus to the first new link for intermediate and final batches", async () => {
  const user = userEvent.setup();
  const manyAlerts = Array.from({ length: 12 }, (_, id) => ({
    ...alerts[0], id, property: `Property ${id}`, timestamp: "2026-11-15T12:00:00Z",
  }));
  setup({ alerts: manyAlerts });
  screen.getByRole("button", { name: "Load more notifications" }).focus();
  await user.keyboard("{Enter}");
  expect(rows()).toHaveLength(10);
  expect(within(rows()[5]).getByRole("link")).toHaveFocus();
  await user.tab();
  expect(within(rows()[6]).getByRole("checkbox")).toHaveFocus();
  await user.tab();
  expect(within(rows()[6]).getByRole("link")).toHaveFocus();
  screen.getByRole("button", { name: "Load more notifications" }).focus();
  await user.keyboard(" ");
  expect(rows()).toHaveLength(12);
  expect(screen.queryByRole("button", { name: "Load more notifications" })).not.toBeInTheDocument();
  expect(within(rows()[10]).getByRole("link")).toHaveFocus();
  await user.tab();
  expect(within(rows()[11]).getByRole("checkbox")).toHaveFocus();
  await user.tab();
  expect(within(rows()[11]).getByRole("link")).toHaveFocus();
});
