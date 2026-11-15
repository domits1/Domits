import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotificationBell from "./NotificationBell";

const alerts = ["review", "low", "declining", "overdue"].map((type, id) => ({
  id, type, property: `Property ${id}`, message: `Guest feedback ${id}`,
  timestamp: "2026-11-14T12:00:00Z", read: id > 1,
}));
const trigger = () => screen.getByRole("button", { name: /Review notifications/ });
const open = () => fireEvent.click(trigger());

test("renders an accessible unread count and all preview fields and alert types", () => {
  render(<NotificationBell alerts={alerts} />);
  expect(trigger()).toHaveAccessibleName("Review notifications, 2 unread");
  expect(trigger()).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("region")).not.toBeInTheDocument();
  open();
  const region = screen.getByRole("region", { name: "Review notifications" });
  expect(trigger()).toHaveAttribute("aria-controls", region.id);
  expect(region).toHaveFocus();
  ["New review", "Low rating", "Declining ratings", "Overdue response"].forEach((label) => {
    expect(screen.getByText(label)).toBeInTheDocument();
  });
  alerts.forEach((alert) => {
    expect(screen.getByText(alert.property)).toBeInTheDocument();
    expect(screen.getByText(alert.message)).toBeInTheDocument();
  });
  expect(region.querySelectorAll('time[datetime="2026-11-14T12:00:00Z"]')).toHaveLength(4);
  expect(screen.getAllByText("Unread")).toHaveLength(2);
  expect(screen.getAllByText("Read")).toHaveLength(2);
});

test("toggles, closes outside, and restores focus on Escape", () => {
  const onOpen = jest.fn();
  render(<NotificationBell alerts={alerts} onOpen={onOpen} />);
  open();
  expect(onOpen).toHaveBeenCalledTimes(1);
  fireEvent.pointerDown(screen.getByText("New review"));
  expect(trigger()).toHaveAttribute("aria-expanded", "true");
  fireEvent.keyDown(screen.getByRole("region"), { key: "Escape" });
  expect(trigger()).toHaveFocus();
  expect(trigger()).toHaveAttribute("aria-expanded", "false");
  open();
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole("region")).not.toBeInTheDocument();
  open();
  open();
  expect(screen.queryByRole("region")).not.toBeInTheDocument();
});

test("supports keyboard activation and closes when tabbing away", async () => {
  const user = userEvent.setup();
  render(<><NotificationBell /><button>Next control</button></>);
  await user.tab();
  expect(trigger()).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(screen.getByRole("region")).toHaveFocus();
  await user.tab();
  expect(screen.getByRole("button", { name: "Next control" })).toHaveFocus();
  expect(screen.queryByRole("region")).not.toBeInTheDocument();
  trigger().focus();
  await user.keyboard(" ");
  expect(screen.getByRole("region")).toHaveFocus();
});

test("renders empty, loading and error states with appropriate announcements", () => {
  const { rerender } = render(<NotificationBell />);
  expect(trigger()).toHaveAccessibleName("Review notifications, 0 unread");
  open();
  expect(screen.getByRole("status")).toHaveTextContent("No notifications yet.");
  rerender(<NotificationBell loading alerts={alerts} />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading notifications");
  expect(screen.getByRole("region")).toHaveAttribute("aria-busy", "true");
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
  rerender(<NotificationBell error alerts={alerts} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Unable to load notifications");
});

test("updates counts from props and caps the visual badge", () => {
  const { rerender } = render(<NotificationBell alerts={alerts} />);
  rerender(<NotificationBell alerts={alerts.map((alert) => ({ ...alert, read: true }))} />);
  expect(trigger()).toHaveAccessibleName("Review notifications, 0 unread");
  expect(screen.queryByText("0")).not.toBeInTheDocument();
  rerender(<NotificationBell alerts={Array.from({ length: 101 }, (_, id) => ({ ...alerts[0], id }))} />);
  expect(screen.getByText("99+")).toBeInTheDocument();
  expect(trigger()).toHaveAccessibleName("Review notifications, 101 unread");
});
