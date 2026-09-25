import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { LanguageContext } from "../../context/LanguageContext";
import HostSettingsCompliance from "../../features/hostdashboard/hostsettings/pages/HostSettingsCompliance";
import { getAccessToken } from "../../services/getAccessToken";
import hostDashboardAll from "./fixtures/hostDashboardAll.json";

// Only the network boundary is mocked, so raw response -> normalized option -> rendered field is exercised end to end.
jest.mock("../../services/getAccessToken", () => ({
    getAccessToken: jest.fn(),
    getCognitoUserId: jest.fn(),
}));

const VILLA_ID = "11111111-1111-4111-8111-111111111111";
const MISSING = Symbol("missing");

const REGISTRATION_LABEL = "Property registration";
const NO_NUMBER_HINT = "No registration number added yet.";
const UNAVAILABLE_ERROR = /We could not load the registration number for this listing/;

const villaOnlyFixture = (registrationNumber) => {
    const villa = JSON.parse(JSON.stringify(hostDashboardAll[0]));
    if (registrationNumber === MISSING) {
        delete villa.property.registrationNumber;
    } else {
        villa.property.registrationNumber = registrationNumber;
    }
    return [villa];
};

const jsonResponse = (body) => ({ ok: true, status: 200, json: jest.fn().mockResolvedValue(body) });

const mockBackend = (listings, patchHandler) => {
    global.fetch = jest.fn((url, options) =>
        Promise.resolve(options?.method === "PATCH" ? patchHandler(options) : jsonResponse(listings))
    );
};

const renderPage = async () => {
    render(
        <LanguageContext.Provider value={{ language: "en" }}>
            <MemoryRouter>
                <HostSettingsCompliance />
            </MemoryRouter>
        </LanguageContext.Provider>
    );
    await waitFor(() => expect(screen.getByLabelText(REGISTRATION_LABEL)).toBeInTheDocument());
};

const registrationInput = () => screen.getByLabelText(REGISTRATION_LABEL);

describe("HostSettingsCompliance page against the raw /hostDashboard/all response", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        getAccessToken.mockReturnValue("access-token");
        jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("lists non-archived listings with trimmed labels and selects the first by title", async () => {
        mockBackend(hostDashboardAll);

        await renderPage();

        const options = screen.getAllByRole("option").map((option) => option.textContent);
        expect(options).toEqual(["Casa do Mar - Lagos", "Test Villa - Algarve"]);
        expect(registrationInput()).toHaveValue("PT-AL-2024-0042");
        expect(screen.queryByText(NO_NUMBER_HINT)).not.toBeInTheDocument();
    });

    it("shows an empty field with the hint for the generated AUTO-<uuid> placeholder", async () => {
        mockBackend(villaOnlyFixture(`AUTO-${VILLA_ID}`));

        await renderPage();

        expect(registrationInput()).toHaveValue("");
        expect(screen.getByText(NO_NUMBER_HINT)).toBeInTheDocument();
        expect(screen.queryByDisplayValue(/auto-/i)).not.toBeInTheDocument();
        expect(registrationInput()).toBeEnabled();
    });

    it("shows an empty field with the hint for an empty string", async () => {
        mockBackend(villaOnlyFixture(""));

        await renderPage();

        expect(registrationInput()).toHaveValue("");
        expect(screen.getByText(NO_NUMBER_HINT)).toBeInTheDocument();
        expect(console.warn).not.toHaveBeenCalled();
    });

    it("displays a real number that only starts with Auto- and lets the host save a new one", async () => {
        mockBackend(villaOnlyFixture("Auto-1234"), (options) =>
            jsonResponse({ propertyId: VILLA_ID, registrationNumber: JSON.parse(options.body).registrationNumber })
        );

        await renderPage();
        expect(registrationInput()).toHaveValue("Auto-1234");
        expect(screen.queryByText(NO_NUMBER_HINT)).not.toBeInTheDocument();

        fireEvent.change(registrationInput(), { target: { value: " Auto-5678 " } });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => expect(screen.getByRole("button", { name: "Saved" })).toBeInTheDocument());
        const patchCall = global.fetch.mock.calls.find(([, options]) => options?.method === "PATCH");
        expect(JSON.parse(patchCall[1].body)).toEqual({ propertyId: VILLA_ID, registrationNumber: "Auto-5678" });
        expect(registrationInput()).toHaveValue("Auto-5678");
    });

    it.each([
        ["null", null],
        ["a missing key", MISSING],
    ])("shows an error instead of the no-number hint when the registration number is %s", async (_label, value) => {
        mockBackend(villaOnlyFixture(value));

        await renderPage();

        expect(screen.getByText(UNAVAILABLE_ERROR)).toBeInTheDocument();
        expect(screen.queryByText(NO_NUMBER_HINT)).not.toBeInTheDocument();
        expect(registrationInput()).toBeDisabled();
        expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(VILLA_ID));
    });
});
