import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import HomeAutomationView from "./HomeAutomationView";
import { LanguageContext } from "../../../../context/LanguageContext";
import { getRemoteLockStatus } from "../services/remoteLockService";

jest.mock("../services/remoteLockService");

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
    getRemoteLockStatus.mockResolvedValue({ status: "NOT_CONNECTED", lastSyncAt: null });

    renderView();

    expect(await screen.findByText("Not connected")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Home automation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/hostdashboard/settings");
    expect(screen.getByText("Last sync: No sync yet")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows when a connected account last synced", async () => {
    getRemoteLockStatus.mockResolvedValue({ status: "CONNECTED", lastSyncAt: Date.UTC(2026, 9, 8, 9, 30) });

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
    getRemoteLockStatus.mockResolvedValue({ status: "NOT_CONNECTED", lastSyncAt: null });

    renderView("nl");

    expect(await screen.findByText("Niet gekoppeld")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Domotica" })).toBeInTheDocument();
  });
});
