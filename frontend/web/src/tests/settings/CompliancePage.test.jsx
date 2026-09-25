import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { LanguageContext } from "../../context/LanguageContext";
import HostSettingsCompliance from "../../features/hostdashboard/hostsettings/pages/HostSettingsCompliance";
import {
    fetchCompliancePropertyOptions,
    saveRegistrationNumber,
} from "../../features/hostdashboard/hostsettings/services/complianceApi";

jest.mock("../../features/hostdashboard/hostsettings/services/complianceApi", () => ({
    fetchCompliancePropertyOptions: jest.fn(),
    saveRegistrationNumber: jest.fn(),
}));

const alpha = {
    id: "a",
    title: "Alpha villa",
    city: "Amsterdam",
    status: "ACTIVE",
    registrationNumber: "NL-1",
    registrationNumberAvailable: true,
};
const beta = {
    id: "b",
    title: "Beta house",
    city: "Rotterdam",
    status: "INACTIVE",
    registrationNumber: "AUTO-22222222-2222-4222-8222-222222222222",
    registrationNumberAvailable: true,
};

const renderPage = () =>
    render(
        <LanguageContext.Provider value={{ language: "en" }}>
            <MemoryRouter>
                <HostSettingsCompliance />
            </MemoryRouter>
        </LanguageContext.Provider>
    );

const renderLoaded = async () => {
    renderPage();
    await waitFor(() => expect(screen.getByLabelText("Property registration")).toBeInTheDocument());
};

const registrationInput = () => screen.getByLabelText("Property registration");
const saveButton = () => screen.getByRole("button", { name: /^(Save|Saving\.\.\.|Saved)$/ });
const typeRegistration = (value) => fireEvent.change(registrationInput(), { target: { value } });

describe("HostSettingsCompliance page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fetchCompliancePropertyOptions.mockResolvedValue([alpha, beta]);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("lists the listings as title + city and selects the first one by default", async () => {
        await renderLoaded();

        expect(screen.getByRole("option", { name: "Alpha villa - Amsterdam" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Beta house - Rotterdam" })).toBeInTheDocument();
        expect(screen.getByLabelText("Listing")).toHaveValue("a");
        expect(registrationInput()).toHaveValue("NL-1");
    });

    it("shows an AUTO- placeholder as an empty field with a hint and never renders the raw value", async () => {
        fetchCompliancePropertyOptions.mockResolvedValue([beta]);

        await renderLoaded();

        expect(registrationInput()).toHaveValue("");
        expect(screen.getByText("No registration number added yet.")).toBeInTheDocument();
        expect(screen.queryByDisplayValue(/auto-/i)).not.toBeInTheDocument();
        expect(saveButton()).toBeDisabled();
    });

    it("enables Save only once the value differs from the saved one", async () => {
        await renderLoaded();
        expect(saveButton()).toBeDisabled();

        typeRegistration("NL-2");
        expect(saveButton()).toBeEnabled();

        typeRegistration("NL-1");
        expect(saveButton()).toBeDisabled();
    });

    it("saves the trimmed value, shows Saved and uses the returned value as the new baseline", async () => {
        saveRegistrationNumber.mockResolvedValue({ propertyId: "a", registrationNumber: "NL-9999" });
        await renderLoaded();

        typeRegistration("  NL-9999  ");
        fireEvent.click(saveButton());

        await waitFor(() => expect(saveButton()).toHaveTextContent("Saved"));
        expect(saveRegistrationNumber).toHaveBeenCalledWith("a", "NL-9999");
        expect(registrationInput()).toHaveValue("NL-9999");
        expect(saveButton()).toBeDisabled();
    });

    it.each([
        [409, "This registration number is already used by another listing."],
        [403, "You do not have access to change this listing."],
        [400, /Enter a valid registration number/],
        [500, "We could not save your registration number. Please try again."],
    ])("maps HTTP status %i to its own error text and keeps the typed value", async (status, expectedText) => {
        saveRegistrationNumber.mockRejectedValue({ status });
        await renderLoaded();

        typeRegistration("NL-2");
        fireEvent.click(saveButton());

        expect(await screen.findByText(expectedText)).toBeInTheDocument();
        expect(registrationInput()).toHaveValue("NL-2");
        expect(saveButton()).toBeEnabled();
    });

    it("rejects an empty or AUTO- value client-side without calling the API", async () => {
        await renderLoaded();

        typeRegistration("   ");
        fireEvent.click(saveButton());
        expect(await screen.findByText(/Enter a valid registration number/)).toBeInTheDocument();

        typeRegistration("auto-22222222-2222-4222-8222-222222222222");
        fireEvent.click(saveButton());
        expect(await screen.findByText(/Enter a valid registration number/)).toBeInTheDocument();

        expect(saveRegistrationNumber).not.toHaveBeenCalled();
    });

    it("asks for confirmation before switching listings with unsaved changes and stays put when declined", async () => {
        const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);
        await renderLoaded();
        typeRegistration("NL-2");

        fireEvent.change(screen.getByLabelText("Listing"), { target: { value: "b" } });

        expect(confirmSpy).toHaveBeenCalledWith("You have unsaved changes. Switch listing and discard them?");
        expect(screen.getByLabelText("Listing")).toHaveValue("a");
        expect(registrationInput()).toHaveValue("NL-2");
    });

    it("discards unsaved changes and switches listings when the confirmation is accepted", async () => {
        jest.spyOn(window, "confirm").mockReturnValue(true);
        await renderLoaded();
        typeRegistration("NL-2");

        fireEvent.change(screen.getByLabelText("Listing"), { target: { value: "b" } });

        expect(screen.getByLabelText("Listing")).toHaveValue("b");
        expect(registrationInput()).toHaveValue("");
    });

    it("switches listings without a confirmation when nothing was changed", async () => {
        const confirmSpy = jest.spyOn(window, "confirm");
        await renderLoaded();

        fireEvent.change(screen.getByLabelText("Listing"), { target: { value: "b" } });

        expect(confirmSpy).not.toHaveBeenCalled();
        expect(screen.getByLabelText("Listing")).toHaveValue("b");
    });

    it("shows an empty state with a link to create a listing when the host has none", async () => {
        fetchCompliancePropertyOptions.mockResolvedValue([]);

        renderPage();

        const link = await screen.findByRole("link", { name: "Create your first listing" });
        expect(link).toHaveAttribute("href", "/hostonboarding");
        expect(screen.queryByLabelText("Property registration")).not.toBeInTheDocument();
    });

    it("shows an error when the listings cannot be loaded", async () => {
        fetchCompliancePropertyOptions.mockRejectedValue({ status: 500 });

        renderPage();

        expect(await screen.findByText("We could not load your listings. Please try again.")).toBeInTheDocument();
        expect(screen.queryByLabelText("Property registration")).not.toBeInTheDocument();
    });

    it("shows a loading state while the listings are being fetched", () => {
        fetchCompliancePropertyOptions.mockReturnValue(new Promise(() => {}));

        renderPage();

        expect(screen.getByText("Loading your listings...")).toBeInTheDocument();
    });
});
