import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChannexStatusCard from "./ChannexStatusCard";

// The backend's engineer-facing reason is part of the response but must never reach the screen.
const baseStatus = {
  status: "CONNECTED",
  displayName: "Channex",
  reason: "Stored Channex credentials are locally valid and provider validation has explicitly succeeded.",
};

const noop = () => {};

describe("ChannexStatusCard", () => {
  test("renders a green Connected badge with a plain sentence", () => {
    render(
      <ChannexStatusCard
        status={{ ...baseStatus, status: "CONNECTED" }}
        onReconnectClick={noop}
        onDisconnectClick={noop}
      />
    );

    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("Your Channex account is connected.")).toBeInTheDocument();
  });

  test.each([
    ["RECONNECT_REQUIRED", "Your Channex connection needs to be set up again."],
    ["VALIDATION_FAILED", "Channex could not verify your account. Check your API key and reconnect."],
    ["DISCONNECTED", "Your Channex account is disconnected."],
  ])("renders a red Reconnect needed badge with a plain sentence for %s", (status, sentence) => {
    render(<ChannexStatusCard status={{ ...baseStatus, status }} onReconnectClick={noop} onDisconnectClick={noop} />);

    expect(screen.getByText("Reconnect needed")).toBeInTheDocument();
    expect(screen.getByText(sentence)).toBeInTheDocument();
  });

  test("renders a neutral Validating badge with a plain sentence for PENDING_PROVIDER_VALIDATION", () => {
    render(
      <ChannexStatusCard
        status={{ ...baseStatus, status: "PENDING_PROVIDER_VALIDATION" }}
        onReconnectClick={noop}
        onDisconnectClick={noop}
      />
    );

    expect(screen.getByText("Validating…")).toBeInTheDocument();
    expect(screen.getByText("Channex is still verifying your account.")).toBeInTheDocument();
  });

  test("describes NOT_CONNECTED in plain words too", () => {
    render(
      <ChannexStatusCard
        status={{ ...baseStatus, status: "NOT_CONNECTED" }}
        onReconnectClick={noop}
        onDisconnectClick={noop}
      />
    );

    expect(screen.getByText("No Channex account is connected yet.")).toBeInTheDocument();
  });

  test("shows no sentence for a status it has no description for, rather than the backend reason", () => {
    render(
      <ChannexStatusCard
        status={{ ...baseStatus, status: "SOMETHING_NEW" }}
        onReconnectClick={noop}
        onDisconnectClick={noop}
      />
    );

    expect(screen.getByText("Channex")).toBeInTheDocument();
    expect(screen.queryByText(baseStatus.reason)).not.toBeInTheDocument();
  });

  test.each([
    "CONNECTED",
    "RECONNECT_REQUIRED",
    "VALIDATION_FAILED",
    "DISCONNECTED",
    "PENDING_PROVIDER_VALIDATION",
    "NOT_CONNECTED",
  ])("does not render the backend reason for %s", (status) => {
    const { container } = render(
      <ChannexStatusCard status={{ ...baseStatus, status }} onReconnectClick={noop} onDisconnectClick={noop} />
    );

    expect(container).not.toHaveTextContent("credentials");
    expect(container).not.toHaveTextContent("provider validation");
  });

  test("keeps Manage disabled for PENDING_PROVIDER_VALIDATION", () => {
    render(
      <ChannexStatusCard
        status={{ ...baseStatus, status: "PENDING_PROVIDER_VALIDATION" }}
        onReconnectClick={noop}
        onDisconnectClick={noop}
      />
    );

    expect(screen.getByRole("button", { name: "Manage" })).toBeDisabled();
  });

  test("offers Reconnect and Disconnect for CONNECTED, and calls the matching callback", async () => {
    const user = userEvent.setup();
    const onReconnectClick = jest.fn();
    const onDisconnectClick = jest.fn();
    render(
      <ChannexStatusCard
        status={{ ...baseStatus, status: "CONNECTED" }}
        onReconnectClick={onReconnectClick}
        onDisconnectClick={onDisconnectClick}
        manageEnabled
      />
    );

    await user.click(screen.getByRole("button", { name: "Manage" }));
    expect(screen.getByRole("button", { name: "Reconnect" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(onDisconnectClick).toHaveBeenCalledTimes(1);
    expect(onReconnectClick).not.toHaveBeenCalled();
  });

  test("offers Reconnect only for DISCONNECTED", async () => {
    const user = userEvent.setup();
    render(
      <ChannexStatusCard
        status={{ ...baseStatus, status: "DISCONNECTED" }}
        onReconnectClick={noop}
        onDisconnectClick={noop}
        manageEnabled
      />
    );

    await user.click(screen.getByRole("button", { name: "Manage" }));
    expect(screen.getByRole("button", { name: "Reconnect" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Disconnect" })).not.toBeInTheDocument();
  });

  test("keeps Manage disabled for CONNECTED while manageEnabled is not passed (default false-safe)", () => {
    render(
      <ChannexStatusCard
        status={{ ...baseStatus, status: "CONNECTED" }}
        onReconnectClick={noop}
        onDisconnectClick={noop}
      />
    );

    expect(screen.getByRole("button", { name: "Manage" })).toBeDisabled();
  });
});
