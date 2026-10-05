import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConnectChannexModal from "./ConnectChannexModal";
import { DISMISS_ACTIONS, expectDismissalBlockedWhileInFlight } from "./modalTestHelpers";
import { connectChannex } from "../services/channexDistributionService";

jest.mock("../services/channexDistributionService", () => ({
  connectChannex: jest.fn(),
}));

describe("ConnectChannexModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("connect success calls onConnected with the response and clears the api key field", async () => {
    const user = userEvent.setup();
    connectChannex.mockResolvedValue({ connected: true });
    const onConnected = jest.fn();

    render(<ConnectChannexModal variant="add" userId="user-1" onClose={jest.fn()} onConnected={onConnected} />);

    await user.type(screen.getByLabelText("Channex API key"), "secret-key-123");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    expect(connectChannex).toHaveBeenCalledWith({ userId: "user-1", apiKey: "secret-key-123" });
    expect(onConnected).toHaveBeenCalledWith({ connected: true });
    expect(screen.getByLabelText("Channex API key")).toHaveValue("");
  });

  test("connect rejected by the provider shows an inline error and keeps the api key", async () => {
    const user = userEvent.setup();
    connectChannex.mockResolvedValue({ connected: false });
    const onConnected = jest.fn();

    render(<ConnectChannexModal variant="add" userId="user-1" onClose={jest.fn()} onConnected={onConnected} />);

    await user.type(screen.getByLabelText("Channex API key"), "wrong-key");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    expect(screen.getByText("Channex rejected this API key. Check the key and try again.")).toBeInTheDocument();
    expect(onConnected).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Channex API key")).toHaveValue("wrong-key");
  });

  test("a thrown request error shows a friendly message, logs the detail, and does not close the modal", async () => {
    const user = userEvent.setup();
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    connectChannex.mockRejectedValue(new Error("Failed to store Channex credentials in Secrets Manager."));
    const onConnected = jest.fn();
    const onClose = jest.fn();

    render(<ConnectChannexModal variant="add" userId="user-1" onClose={onClose} onConnected={onConnected} />);

    await user.type(screen.getByLabelText("Channex API key"), "some-key");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    expect(screen.getByText("Failed to connect to Channex.")).toBeInTheDocument();
    expect(screen.queryByText(/Secrets Manager/)).not.toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith(
      expect.any(String),
      "Failed to store Channex credentials in Secrets Manager."
    );
    expect(onConnected).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Channex API key")).toHaveValue("some-key");
    consoleError.mockRestore();
  });

  test("shows the reconnect note only for the reconnect variant", () => {
    render(<ConnectChannexModal variant="reconnect" userId="user-1" onClose={jest.fn()} onConnected={jest.fn()} />);

    expect(
      screen.getByText("Reconnecting replaces your stored Channex API key. Your existing property mappings are kept.")
    ).toBeInTheDocument();
  });

  // Every way of dismissing the modal must behave the same: clear the typed key, close, never submit.
  test.each(DISMISS_ACTIONS.filter(([label]) => label !== "Close"))(
    "%s clears the api key and closes without calling connectChannex",
    async (_label, dismiss) => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<ConnectChannexModal variant="add" userId="user-1" onClose={onClose} onConnected={jest.fn()} />);

      await user.type(screen.getByLabelText("Channex API key"), "typed-key");
      await dismiss(user);

      expect(connectChannex).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText("Channex API key")).toHaveValue("");
    }
  );

  test.each(DISMISS_ACTIONS)(
    "%s does not close the modal while the request is in flight, and works again once it settles",
    (_label, dismiss) =>
      expectDismissalBlockedWhileInFlight({
        dismiss,
        mockedRequest: connectChannex,
        submitButtonName: "Connect",
        settledValue: { connected: false },
        renderModal: (onClose) =>
          render(<ConnectChannexModal variant="add" userId="user-1" onClose={onClose} onConnected={jest.fn()} />),
        beforeSubmit: (user) => user.type(screen.getByLabelText("Channex API key"), "some-key"),
      })
  );
});
