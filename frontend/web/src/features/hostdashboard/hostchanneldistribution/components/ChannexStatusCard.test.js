import React from "react";
import { render, screen } from "@testing-library/react";
import ChannexStatusCard from "./ChannexStatusCard";

const baseStatus = {
  status: "CONNECTED",
  displayName: "Channex",
  reason: "Stored Channex credentials are locally valid and provider validation has explicitly succeeded.",
};

describe("ChannexStatusCard", () => {
  test("renders a green Connected badge and hides the reason text", () => {
    render(<ChannexStatusCard status={{ ...baseStatus, status: "CONNECTED" }} />);

    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.queryByText(baseStatus.reason)).not.toBeInTheDocument();
  });

  test.each(["RECONNECT_REQUIRED", "VALIDATION_FAILED", "DISCONNECTED"])(
    "renders a red Reconnect needed badge and shows the reason text for %s",
    (status) => {
      const reason = `${status} reason text`;
      render(<ChannexStatusCard status={{ ...baseStatus, status, reason }} />);

      expect(screen.getByText("Reconnect needed")).toBeInTheDocument();
      expect(screen.getByText(reason)).toBeInTheDocument();
    }
  );

  test("renders a neutral Validating badge and hides the reason text for PENDING_PROVIDER_VALIDATION", () => {
    render(<ChannexStatusCard status={{ ...baseStatus, status: "PENDING_PROVIDER_VALIDATION" }} />);

    expect(screen.getByText("Validating…")).toBeInTheDocument();
    expect(screen.queryByText(baseStatus.reason)).not.toBeInTheDocument();
  });

  test("renders a disabled Manage button with no handler", () => {
    render(<ChannexStatusCard status={baseStatus} />);

    const manageButton = screen.getByRole("button", { name: "Manage" });
    expect(manageButton).toBeDisabled();
  });
});
