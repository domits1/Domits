import React from "react";
import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RemoteLockDevicesList from "./RemoteLockDevicesList";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";

const COPY = en.settings.homeAutomation.devices;
const SEEN_AT = Date.UTC(2026, 9, 8, 9, 25);

const device = (overrides = {}) => ({
  id: "lock-1",
  name: "Front door",
  type: "lock",
  status: "ONLINE",
  battery: 82,
  lastSeenAt: SEEN_AT,
  ...overrides,
});

const renderList = (props = {}) =>
  render(
    <RemoteLockDevicesList
      connected
      devices={[]}
      loading={false}
      error={null}
      onRetry={jest.fn()}
      copy={COPY}
      language="en"
      {...props}
    />
  );

const rowOf = (name) => screen.getByRole("row", { name: new RegExp(name) });

describe("RemoteLockDevicesList", () => {
  it("asks the host to connect when the account is not connected, even if devices are passed", () => {
    renderList({ connected: false, devices: [device()] });

    expect(screen.getByText("Connect to see your devices")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the columns and one row per device", () => {
    renderList({ devices: [device(), device({ id: "lock-2", name: "Back entrance" })] });

    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual(["Name", "Type", "Status", "Battery", "Last seen"]);
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("shows a device's name, type, status, battery and last seen", () => {
    renderList({ devices: [device({ type: "zwave_lock", status: "OFFLINE", battery: 15 })] });

    const cells = within(rowOf("Front door")).getAllByRole("cell");
    expect(cells[0]).toHaveTextContent("Front door");
    expect(cells[1]).toHaveTextContent("Z-Wave lock");
    expect(cells[2]).toHaveTextContent("Offline");
    expect(cells[3]).toHaveTextContent("15%");
    expect(cells[4]).toHaveTextContent("2026");
  });

  it("shows a dash for a missing battery or last seen time", () => {
    renderList({ devices: [device({ battery: null, lastSeenAt: null })] });

    const cells = within(rowOf("Front door")).getAllByRole("cell");
    expect(cells[3]).toHaveTextContent("—");
    expect(cells[4]).toHaveTextContent("—");
  });

  it("shows a dash for a device that has no battery field at all", () => {
    const withoutBattery = device();
    delete withoutBattery.battery;
    renderList({ devices: [withoutBattery] });

    expect(within(rowOf("Front door")).getAllByRole("cell")[3]).toHaveTextContent("—");
    expect(screen.queryByText(/undefined|NaN/)).not.toBeInTheDocument();
  });

  it("shows a battery of 0% as 0%, not as missing", () => {
    renderList({ devices: [device({ battery: 0 })] });

    expect(within(rowOf("Front door")).getAllByRole("cell")[3]).toHaveTextContent("0%");
  });

  it.each([
    ["lock", "Lock"],
    ["zwave_lock", "Z-Wave lock"],
    ["connector_lock", "Connector lock"],
    ["schlage_home_lock", "Schlage Home lock"],
    ["resort_lock", "Resort lock"],
    ["something_new", "Other device"],
    [undefined, "Other device"],
    ["constructor", "Other device"],
  ])("labels the type %s as %s", (type, label) => {
    renderList({ devices: [device({ type })] });

    expect(within(rowOf("Front door")).getAllByRole("cell")[1]).toHaveTextContent(label);
  });

  it.each([
    ["ONLINE", "Online"],
    ["OFFLINE", "Offline"],
    ["UNKNOWN", "Unknown"],
    ["SOMETHING_NEW", "Unknown"],
    ["toString", "Unknown"],
  ])("labels the status %s as %s", (status, label) => {
    renderList({ devices: [device({ status })] });

    expect(within(rowOf("Front door")).getAllByRole("cell")[2]).toHaveTextContent(label);
  });

  it("marks a resort lock as not supported yet, and no other type", () => {
    renderList({
      devices: [device({ id: "a", name: "Pool gate", type: "resort_lock" }), device({ id: "b", name: "Front door" })],
    });

    expect(within(rowOf("Pool gate")).getByText("Not supported yet")).toBeInTheDocument();
    expect(within(rowOf("Front door")).queryByText("Not supported yet")).not.toBeInTheDocument();
  });

  it("says so when the account has no devices", () => {
    renderList({ devices: [] });

    expect(screen.getByText("No devices found in your RemoteLock account.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows a loading message instead of the empty state while loading", () => {
    renderList({ loading: true });

    expect(screen.getByRole("status")).toHaveTextContent("Loading your devices...");
    expect(screen.queryByText(/No devices found/)).not.toBeInTheDocument();
  });

  it("shows an error with a retry button", async () => {
    const user = userEvent.setup();
    const onRetry = jest.fn();
    renderList({ error: "boom", onRetry });

    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load your devices.");
    expect(screen.queryByText("boom")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("uses the copy and language it is given", () => {
    renderList({
      copy: nl.settings.homeAutomation.devices,
      language: "nl",
      devices: [device({ type: "resort_lock" })],
    });

    expect(screen.getByRole("heading", { name: "Apparaten" })).toBeInTheDocument();
    expect(screen.getByText("Nog niet ondersteund")).toBeInTheDocument();
  });
});
