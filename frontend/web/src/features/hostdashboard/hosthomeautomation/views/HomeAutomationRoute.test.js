import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import HomeAutomationRoute from "./HomeAutomationRoute";
import { LanguageContext } from "../../../../context/LanguageContext";
import { getRemoteLockStatus } from "../services/remoteLockService";

let mockUiEnabled = false;

jest.mock("../constants/homeAutomationConstants", () => ({
  ...jest.requireActual("../constants/homeAutomationConstants"),
  get REMOTELOCK_UI_ENABLED() {
    return mockUiEnabled;
  },
}));
jest.mock("../services/remoteLockService");

const renderRoute = () =>
  render(
    <LanguageContext.Provider value={{ language: "en" }}>
      <MemoryRouter initialEntries={["/hostdashboard/settings/home-automation"]}>
        <Routes>
          <Route path="/hostdashboard/settings" element={<p>Settings hub</p>} />
          <Route path="/hostdashboard/settings/home-automation" element={<HomeAutomationRoute />} />
        </Routes>
      </MemoryRouter>
    </LanguageContext.Provider>
  );

describe("HomeAutomationRoute", () => {
  beforeEach(() => {
    getRemoteLockStatus.mockResolvedValue({ status: "NOT_CONNECTED", lastSyncAt: null });
  });

  it("sends the host back to Settings while the page is switched off", () => {
    mockUiEnabled = false;

    renderRoute();

    expect(screen.getByText("Settings hub")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Home automation" })).not.toBeInTheDocument();
    expect(getRemoteLockStatus).not.toHaveBeenCalled();
  });

  it.each([
    ["off", false, "Settings hub"],
    ["on", true, "Connecting RemoteLock"],
  ])("handles the callback with the page switched %s", (_label, enabled, text) => {
    mockUiEnabled = enabled;

    render(
      <LanguageContext.Provider value={{ language: "en" }}>
        <MemoryRouter initialEntries={["/hostdashboard/settings/home-automation/callback"]}>
          <Routes>
            <Route path="/hostdashboard/settings" element={<p>Settings hub</p>} />
            <Route path="/hostdashboard/settings/home-automation/callback" element={<HomeAutomationRoute callback />} />
          </Routes>
        </MemoryRouter>
      </LanguageContext.Provider>
    );

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("shows the page when it is switched on", async () => {
    mockUiEnabled = true;

    renderRoute();

    expect(await screen.findByRole("heading", { level: 1, name: "Home automation" })).toBeInTheDocument();
    expect(screen.queryByText("Settings hub")).not.toBeInTheDocument();
  });
});
