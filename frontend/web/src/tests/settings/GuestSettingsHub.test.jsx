import React from "react";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import GuestSettingsHub from "../../features/guestdashboard/GuestSettingsHub";
import { LanguageContext } from "../../context/LanguageContext";

const renderHub = () =>
    render(
        <LanguageContext.Provider value={{ language: "en" }}>
            <MemoryRouter>
                <GuestSettingsHub />
            </MemoryRouter>
        </LanguageContext.Provider>
    );

const getSection = (headingName) => screen.getByRole("heading", { name: headingName }).closest(".host-settings-section");

describe("GuestSettingsHub", () => {
    test("renders communication preferences inside personal settings", () => {
        renderHub();

        const personalSection = getSection("Personal Settings");

        expect(within(personalSection).getByRole("link", { name: /personal data/i })).toHaveAttribute("href", "/guestdashboard/settings/personal-data");
        expect(within(personalSection).getByRole("link", { name: /communication preferences/i })).toHaveAttribute("href", "/guestdashboard/settings/communication-preferences");
        expect(screen.queryByRole("heading", { name: "Communication Preferences" })).not.toBeInTheDocument();
    });
});