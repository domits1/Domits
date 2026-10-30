import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { HostPropertyListingSummary } from "./HostPropertyShell";

const openStatusMenu = (status, onStatusChange = jest.fn()) => {
  render(
    <HostPropertyListingSummary
      propertyId="p1"
      hostProperties={[{ id: "p1", title: "Listing p1", status }]}
      title="Listing p1"
      status={status}
      onPropertyChange={jest.fn()}
      onStatusChange={onStatusChange}
      saving={false}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: "Listing status" }));
  return onStatusChange;
};

const menuOptionNames = () => within(screen.getByRole("list", { name: "Select listing status" })).getAllByRole("button");

describe("HostPropertyListingSummary status dropdown", () => {
  it("offers Submit for review instead of Live while the listing is a draft", () => {
    const onStatusChange = openStatusMenu("INACTIVE");

    expect(menuOptionNames().map((option) => option.textContent)).toEqual(["Submit for review", "Draft", "Archived"]);

    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));
    expect(onStatusChange).toHaveBeenCalledWith("ACTIVE");
  });

  it("shows Live as the current value once the listing is active", () => {
    openStatusMenu("ACTIVE");

    expect(screen.getByRole("button", { name: "Listing status" })).toHaveTextContent("Live");
    expect(menuOptionNames().map((option) => option.textContent)).toEqual(["Live", "Draft", "Archived"]);
  });

  it("shows a pending listing as read-only and cannot be submitted again, but can go back to draft", () => {
    const onStatusChange = openStatusMenu("PENDING_REVIEW");

    expect(screen.getByRole("button", { name: "Listing status" })).toHaveTextContent("Pending review");
    expect(screen.queryByRole("button", { name: "Pending review" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit for review" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Draft" }));
    expect(onStatusChange).toHaveBeenCalledWith("INACTIVE");
  });

  it("shows a rejected listing as read-only and lets the host resubmit it", () => {
    const onStatusChange = openStatusMenu("REJECTED");

    expect(screen.getByRole("button", { name: "Listing status" })).toHaveTextContent("Rejected");
    expect(screen.queryByRole("button", { name: "Rejected" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));
    expect(onStatusChange).toHaveBeenCalledWith("ACTIVE");
  });
});
