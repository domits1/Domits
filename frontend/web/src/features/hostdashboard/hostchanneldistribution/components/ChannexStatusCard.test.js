import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChannexStatusCard from "./ChannexStatusCard";

const baseStatus = {
  status: "CONNECTED",
  displayName: "Channex",
  reason: "Stored Channex credentials are locally valid and provider validation has explicitly succeeded.",
};

const noop = () => {};

describe("ChannexStatusCard", () => {
  test("renders a green Connected badge and hides the reason text", () => {
    render(
      <ChannexStatusCard
        status={{ ...baseStatus, status: "CONNECTED" }}
        onReconnectClick={noop}
        onDisconnectClick={noop}
      />
    );

    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.queryByText(baseStatus.reason)).not.toBeInTheDocument();
  });

  test.each(["RECONNECT_REQUIRED", "VALIDATION_FAILED", "DISCONNECTED"])(
    "renders a red Reconnect needed badge and shows the reason text for %s",
    (status) => {
      const reason = `${status} reason text`;
      render(
        <ChannexStatusCard
          status={{ ...baseStatus, status, reason }}
          onReconnectClick={noop}
          onDisconnectClick={noop}
        />
      );

      expect(screen.getByText("Reconnect needed")).toBeInTheDocument();
      expect(screen.getByText(reason)).toBeInTheDocument();
    }
  );

  test("renders a neutral Validating badge and hides the reason text for PENDING_PROVIDER_VALIDATION", () => {
    render(
      <ChannexStatusCard
        status={{ ...baseStatus, status: "PENDING_PROVIDER_VALIDATION" }}
        onReconnectClick={noop}
        onDisconnectClick={noop}
      />
    );

    expect(screen.getByText("Validating…")).toBeInTheDocument();
    expect(screen.queryByText(baseStatus.reason)).not.toBeInTheDocument();
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
