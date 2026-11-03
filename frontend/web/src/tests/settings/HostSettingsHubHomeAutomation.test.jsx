import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import HostSettingsHub from "../../features/hostdashboard/hostsettings/pages/HostSettingsHub";
import { LanguageContext } from "../../context/LanguageContext";

let mockUiEnabled = false;

jest.mock("../../features/hostdashboard/hosthomeautomation/constants/homeAutomationConstants", () => ({
  ...jest.requireActual("../../features/hostdashboard/hosthomeautomation/constants/homeAutomationConstants"),
  get REMOTELOCK_UI_ENABLED() {
    return mockUiEnabled;
  },
}));

const renderHub = (language = "en") =>
  render(
    <LanguageContext.Provider value={{ language }}>
      <MemoryRouter>
        <HostSettingsHub />
      </MemoryRouter>
    </LanguageContext.Provider>
  );

describe("HostSettingsHub home automation card", () => {
  it("is hidden while the page is switched off", () => {
    mockUiEnabled = false;

    renderHub();

    expect(screen.queryByRole("link", { name: /home automation/i })).not.toBeInTheDocument();
  });

  it("links to home-automation, after the existing Account Settings cards, when switched on", () => {
    mockUiEnabled = true;

    renderHub();

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs.slice(-2)).toEqual(["/compliance", "/home-automation"]);
    expect(screen.getByRole("link", { name: /home automation/i })).toHaveAttribute("href", "/home-automation");
  });

  it.each([
    /personal data/i,
    /communication preferences/i,
    /privacy & security/i,
    /company/i,
    /team/i,
    /rate plans/i,
    /compliance/i,
  ])("does not make the existing card query %s match a second link", (name) => {
    mockUiEnabled = true;

    renderHub();

    expect(screen.getAllByRole("link", { name })).toHaveLength(1);
  });

  it.each([
    ["nl", "Domotica"],
    ["de", "Hausautomation"],
    ["es", "Domótica"],
  ])("renders the card in %s", (language, title) => {
    mockUiEnabled = true;

    renderHub(language);

    expect(screen.getByRole("link", { name: new RegExp(title) })).toHaveAttribute("href", "/home-automation");
  });
});
