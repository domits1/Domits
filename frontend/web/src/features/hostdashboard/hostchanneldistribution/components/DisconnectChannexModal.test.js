import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DisconnectChannexModal from "./DisconnectChannexModal";
import { disconnectChannex } from "../services/channexDistributionService";

jest.mock("../services/channexDistributionService", () => ({
  disconnectChannex: jest.fn(),
}));

describe("DisconnectChannexModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("confirming disconnect calls the service and onDisconnected with the response", async () => {
    const user = userEvent.setup();
    const response = { disconnected: true, status: "DISCONNECTED" };
    disconnectChannex.mockResolvedValue(response);
    const onDisconnected = jest.fn();

    render(<DisconnectChannexModal userId="user-1" onClose={jest.fn()} onDisconnected={onDisconnected} />);

    await user.click(screen.getByRole("button", { name: "Disconnect" }));

    expect(disconnectChannex).toHaveBeenCalledWith({ userId: "user-1" });
    expect(onDisconnected).toHaveBeenCalledWith(response);
  });

  test("Cancel closes without calling disconnectChannex", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(<DisconnectChannexModal userId="user-1" onClose={onClose} onDisconnected={jest.fn()} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(disconnectChannex).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("a thrown error shows the error message and does not close the modal", async () => {
    const user = userEvent.setup();
    disconnectChannex.mockRejectedValue(new Error("Failed to persist Channex disconnect state in Domits."));
    const onDisconnected = jest.fn();
    const onClose = jest.fn();

    render(<DisconnectChannexModal userId="user-1" onClose={onClose} onDisconnected={onDisconnected} />);

    await user.click(screen.getByRole("button", { name: "Disconnect" }));

    expect(screen.getByText("Failed to persist Channex disconnect state in Domits.")).toBeInTheDocument();
    expect(onDisconnected).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
