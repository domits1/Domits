import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RemoteLockStatusCard from "./RemoteLockStatusCard";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";

const COPY = en.settings.homeAutomation;
const SYNCED_AT = Date.UTC(2026, 9, 8, 9, 30);

const renderCard = (props = {}) =>
  render(
    <RemoteLockStatusCard
      status="CONNECTED"
      lastSyncAt={null}
      copy={COPY}
      language="en"
      onAction={jest.fn()}
      {...props}
    />
  );

describe("RemoteLockStatusCard", () => {
  it.each([
    ["NOT_CONNECTED", "Not connected", "neutral"],
    ["CONNECTING", "Connecting", "pending"],
    ["CONNECTED", "Connected", "success"],
    ["AUTHENTICATION_ERROR", "Sign-in failed", "error"],
    ["CONNECTION_ERROR", "Connection problem", "error"],
    ["DISCONNECTED", "Disconnected", "neutral"],
    ["EXPIRED_CREDENTIALS", "Sign-in expired", "error"],
    ["SOMETHING_NEW", "Status unknown", "neutral"],
    [undefined, "Status unknown", "neutral"],
  ])("shows %s as %s with a %s badge", (status, label, tone) => {
    renderCard({ status });

    expect(screen.getByText(label)).toHaveClass("host-homeauto__badge", `host-homeauto__badge--${tone}`);
  });

  it.each([
    ["NOT_CONNECTED", ["Connect"]],
    ["CONNECTING", []],
    ["CONNECTED", ["Disconnect"]],
    ["AUTHENTICATION_ERROR", ["Reconnect", "Disconnect"]],
    ["CONNECTION_ERROR", ["Reconnect", "Disconnect"]],
    ["DISCONNECTED", ["Connect"]],
    ["EXPIRED_CREDENTIALS", ["Reconnect", "Disconnect"]],
    ["SOMETHING_NEW", []],
    [undefined, []],
  ])("for %s shows the buttons %j", (status, buttons) => {
    renderCard({ status });

    expect(screen.queryAllByRole("button").map((button) => button.textContent)).toEqual(buttons);
  });

  it.each([
    ["NOT_CONNECTED", "Connect", "connect"],
    ["EXPIRED_CREDENTIALS", "Reconnect", "reconnect"],
    ["CONNECTED", "Disconnect", "disconnect"],
  ])("for %s the %s button tells the page about the %s action", async (status, name, action) => {
    const user = userEvent.setup();
    const onAction = jest.fn();
    renderCard({ status, onAction });

    await user.click(screen.getByRole("button", { name }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith(action);
  });

  it("names the provider", () => {
    renderCard();

    expect(screen.getByRole("heading", { name: "RemoteLock" })).toBeInTheDocument();
  });

  it("shows when it last synced", () => {
    renderCard({ lastSyncAt: SYNCED_AT });

    expect(screen.getByText(/Last sync:/)).toHaveTextContent("2026");
    expect(screen.queryByText(/No sync yet/)).not.toBeInTheDocument();
  });

  it("says there is no sync yet when there is no time", () => {
    renderCard({ lastSyncAt: null });

    expect(screen.getByText("Last sync: No sync yet")).toBeInTheDocument();
  });

  it("uses the copy and language it is given", () => {
    renderCard({ status: "NOT_CONNECTED", copy: nl.settings.homeAutomation, language: "nl" });

    expect(screen.getByText("Niet gekoppeld")).toBeInTheDocument();
    expect(screen.getByText("Laatste synchronisatie: Nog niet gesynchroniseerd")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Koppelen" })).toBeInTheDocument();
  });
});
