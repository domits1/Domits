import React from "react";
import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import HomeAutomationView from "./HomeAutomationView";
import { LanguageContext } from "../../../../context/LanguageContext";
import {
  connectRemoteLock,
  disconnectRemoteLock,
  getRemoteLockStatus,
} from "../services/remoteLockService";

jest.mock("../services/remoteLockService");

const CONNECTED = { status: "CONNECTED", lastSyncAt: Date.UTC(2026, 9, 8, 9, 30) };
const NOT_CONNECTED = { status: "NOT_CONNECTED", lastSyncAt: null };

const renderView = (language = "en") =>
  render(
    <LanguageContext.Provider value={{ language }}>
      <MemoryRouter>
        <HomeAutomationView />
      </MemoryRouter>
    </LanguageContext.Provider>
  );

describe("HomeAutomationView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it("shows a loading message first", async () => {
    getRemoteLockStatus.mockReturnValue(new Promise(() => {}));

    renderView();

    expect(screen.getByRole("status")).toHaveTextContent("Loading your RemoteLock connection...");
    expect(screen.queryByText("RemoteLock")).not.toBeInTheDocument();
  });

  it("shows the page title, a link back to Settings and the connection status", async () => {
    getRemoteLockStatus.mockResolvedValue(NOT_CONNECTED);

    renderView();

    expect(await screen.findByText("Not connected")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Home automation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/hostdashboard/settings");
    expect(screen.getByText("Last sync: No sync yet")).toBeInTheDocument();
  });

  it("shows when a connected account last synced", async () => {
    getRemoteLockStatus.mockResolvedValue(CONNECTED);

    renderView();

    expect(await screen.findByText("Connected")).toBeInTheDocument();
    expect(screen.getByText(/Last sync:/)).toHaveTextContent("2026");
  });

  it("shows a fixed error message, logs the detail, and retries", async () => {
    const user = userEvent.setup();
    getRemoteLockStatus.mockRejectedValueOnce(new Error("secret internal detail"));
    getRemoteLockStatus.mockResolvedValueOnce({ status: "CONNECTED", lastSyncAt: null });

    renderView();

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load your RemoteLock connection.");
    expect(screen.queryByText(/secret internal detail/)).not.toBeInTheDocument();
    expect(console.error).toHaveBeenCalledWith("Failed to load the RemoteLock status:", "secret internal detail");

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Connected")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("is shown in the selected language", async () => {
    getRemoteLockStatus.mockResolvedValue(NOT_CONNECTED);

    renderView("nl");

    expect(await screen.findByText("Niet gekoppeld")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Domotica" })).toBeInTheDocument();
  });

  describe("actions", () => {
    it("connect: confirming shows Connected and closes the modal", async () => {
      const user = userEvent.setup();
      getRemoteLockStatus.mockResolvedValue(NOT_CONNECTED);
      connectRemoteLock.mockResolvedValue(CONNECTED);
      renderView();

      await user.click(await screen.findByRole("button", { name: "Connect" }));
      const dialog = screen.getByRole("dialog", { name: "Connect RemoteLock" });
      await user.click(within(dialog).getByRole("button", { name: "Connect" }));

      expect(await screen.findByText("Connected")).toBeInTheDocument();
      expect(screen.getByText(/Last sync:/)).toHaveTextContent("2026");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Connect" })).not.toBeInTheDocument();
    });

    it("disconnect: confirming shows Disconnected and offers Connect again", async () => {
      const user = userEvent.setup();
      getRemoteLockStatus.mockResolvedValue(CONNECTED);
      disconnectRemoteLock.mockResolvedValue({ status: "DISCONNECTED", lastSyncAt: null });
      renderView();

      await user.click(await screen.findByRole("button", { name: "Disconnect" }));
      await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Disconnect" }));

      expect(await screen.findByText("Disconnected")).toBeInTheDocument();
      expect(screen.getByText("Last sync: No sync yet")).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument();
    });

    it("reconnect: is offered from an error status and ends up connected", async () => {
      const user = userEvent.setup();
      getRemoteLockStatus.mockResolvedValue({ status: "EXPIRED_CREDENTIALS", lastSyncAt: null });
      connectRemoteLock.mockResolvedValue(CONNECTED);
      renderView();

      await user.click(await screen.findByRole("button", { name: "Reconnect" }));
      await user.click(
        within(screen.getByRole("dialog", { name: "Reconnect RemoteLock" })).getByRole("button", { name: "Reconnect" })
      );

      expect(await screen.findByText("Connected")).toBeInTheDocument();
    });

    it("cancelling leaves the status as it was and runs no request", async () => {
      const user = userEvent.setup();
      getRemoteLockStatus.mockResolvedValue(CONNECTED);
      renderView();

      await user.click(await screen.findByRole("button", { name: "Disconnect" }));
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(disconnectRemoteLock).not.toHaveBeenCalled();
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });

    it("a failed connect keeps the modal open and the status unchanged", async () => {
      const user = userEvent.setup();
      getRemoteLockStatus.mockResolvedValue(NOT_CONNECTED);
      connectRemoteLock.mockRejectedValue(new Error("boom"));
      renderView();

      await user.click(await screen.findByRole("button", { name: "Connect" }));
      await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Connect" }));

      expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Not connected")).toBeInTheDocument();
    });
  });
});
