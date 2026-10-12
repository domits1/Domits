import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import { Auth } from "aws-amplify";
import HostSettingsPrivacySecurity from "../../features/hostdashboard/hostsettings/pages/HostSettingsPrivacySecurity";
import { LanguageContext } from "../../context/LanguageContext";

jest.mock("aws-amplify");

jest.mock("react-select-country-list", () => () => ({
    getLabels: () => ["Netherlands", "Germany"],
}));

const MOCK_COGNITO_USER = {
    username: "user-abc-123",
    attributes: {
        email: "host@example.com",
        given_name: "Jane",
        family_name: "Host",
        email_verified: true,
        phone_number_verified: false,
    },
};

const renderPage = () =>
    render(
        <LanguageContext.Provider value={{ language: "en" }}>
            <MemoryRouter>
                <HostSettingsPrivacySecurity />
            </MemoryRouter>
        </LanguageContext.Provider>
    );

describe("HostSettingsPrivacySecurity page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "error").mockImplementation(() => {});
        jest.spyOn(console, "warn").mockImplementation(() => {});
        globalThis.fetch = jest.fn();
        Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
        Auth.getPreferredMFA.mockResolvedValue("NOMFA");
        Auth.changePassword.mockResolvedValue({});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("renders the Authentication, Password and PIN sections", async () => {
        renderPage();

        expect(screen.getByRole("heading", { level: 1, name: "Privacy & Security" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { level: 2, name: "Authentication" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { level: 2, name: "PIN" })).toBeInTheDocument();
        expect(screen.getByText("Coming soon.")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Change Password" })).toBeInTheDocument();

        await waitFor(() => expect(screen.getByText("Active")).toBeInTheDocument());
    });

    test("shows the email status once loaded and the coming-soon note for SMS/Authenticator", async () => {
        renderPage();

        await waitFor(() => expect(screen.getByText("Active")).toBeInTheDocument());
        expect(screen.getByText("Verified")).toBeInTheDocument();
        expect(screen.getByText("Coming soon: SMS and authenticator app sign-in.")).toBeInTheDocument();
    });

    test("shows the error state for every row when the whole profile fetch fails", async () => {
        Auth.currentAuthenticatedUser.mockRejectedValue(new Error("Not signed in"));
        renderPage();

        await waitFor(() =>
            expect(screen.getByText("We couldn't load your authentication status. Please refresh the page.")).toBeInTheDocument()
        );
        expect(screen.getAllByText("Unavailable")).toHaveLength(3);
    });

    test("keeps the email status when only the MFA lookup fails", async () => {
        Auth.getPreferredMFA.mockRejectedValue(new Error("MFA lookup failed"));
        renderPage();

        await waitFor(() => expect(screen.getByText("Active")).toBeInTheDocument());
        expect(screen.getByText("Verified")).toBeInTheDocument();
        expect(screen.getAllByText("Unavailable")).toHaveLength(2);
    });

    test(
        "the password form still submits through the shared hook",
        async () => {
            renderPage();

            await waitFor(() => expect(screen.getByText("Active")).toBeInTheDocument());
            await userEvent.click(screen.getByRole("button", { name: "Change Password" }));
            await userEvent.type(screen.getByLabelText("Current password"), "old-password");
            await userEvent.type(screen.getByLabelText("New password"), "new-password1");
            await userEvent.type(screen.getByLabelText("Confirm new password"), "new-password1");
            await userEvent.click(screen.getByRole("button", { name: "Save password" }));

            await waitFor(() => expect(Auth.changePassword).toHaveBeenCalledWith(MOCK_COGNITO_USER, "old-password", "new-password1"));
        },
        15000
    );
});
