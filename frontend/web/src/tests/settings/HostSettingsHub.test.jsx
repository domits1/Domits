import React from "react";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import HostSettingsHub from "../../features/hostdashboard/hostsettings/pages/HostSettingsHub";
import { LanguageContext } from "../../context/LanguageContext";

const renderHub = () =>
    render(
        <LanguageContext.Provider value={{ language: "en" }}>
            <MemoryRouter>
                <HostSettingsHub />
            </MemoryRouter>
        </LanguageContext.Provider>
    );

const getSection = (headingName) => screen.getByRole("heading", { name: headingName }).closest(".host-settings-section");

describe("HostSettingsHub", () => {
    test("renders communication preferences inside personal settings and keeps account settings unchanged", () => {
        renderHub();

        const personalSection = getSection("Personal Settings");
        const accountSection = getSection("Account Settings");

        expect(within(personalSection).getByRole("link", { name: /personal data/i })).toBeInTheDocument();
        expect(within(personalSection).getByRole("link", { name: /communication preferences/i })).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "Communication Preferences" })).not.toBeInTheDocument();
        expect(within(accountSection).getByRole("link", { name: /company/i })).toBeInTheDocument();
        expect(within(accountSection).getByRole("link", { name: /team/i })).toBeInTheDocument();
        expect(within(accountSection).getByRole("link", { name: /rate plans/i })).toBeInTheDocument();
        expect(within(accountSection).getByRole("link", { name: /compliance/i })).toBeInTheDocument();
    });
});