import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { LanguageContext } from "../../context/LanguageContext";
import HostCommunicationPreferences from "../../features/hostdashboard/hostsettings/pages/HostCommunicationPreferences";
import GuestCommunicationPreferences from "../../features/guestdashboard/GuestCommunicationPreferences";
import {
    fetchCommunicationPreferences,
    saveCommunicationPreferences,
    fetchHostNotificationEventPreferences,
    saveHostNotificationEventPreferences,
} from "../../components/settings/api/communicationPreferences";

jest.mock("../../components/settings/api/communicationPreferences", () => ({
    fetchCommunicationPreferences: jest.fn(),
    saveCommunicationPreferences: jest.fn(),
    fetchHostNotificationEventPreferences: jest.fn(),
    saveHostNotificationEventPreferences: jest.fn(),
}));

const guestPreferences = {
    reservation: { email: true, sms: false, push: true },
    cancellation: { email: true, sms: true, push: false },
    messages: { email: true, sms: false, push: true },
};
const hostCategories = [{
    key: "propertyManager",
    labelKey: "propertyManager",
    events: [{ key: "manager_new_booking", event: "New booking", requiredChannels: ["email"] }],
}, {
    key: "finance",
    labelKey: "finance",
    events: [{ key: "finance_chargeback", event: "Chargeback" }],
}];
const hostPreferences = {
    manager_new_booking: { inApp: true, email: true, sms: false },
    finance_chargeback: { inApp: true, email: true, sms: false },
};
const hostCatalog = { categories: hostCategories, preferences: hostPreferences };

const renderWithLanguage = (ui) => render(
    <LanguageContext.Provider value={{ language: "en" }}>
        <MemoryRouter>{ui}</MemoryRouter>
    </LanguageContext.Provider>
);

const getGuestToggle = (eventName, channelName) =>
    screen.getByRole("switch", { name: eventName + " " + channelName + " notifications" });

const getHostToggle = (eventName, channelName) =>
    screen.getByRole("checkbox", { name: eventName + " - " + channelName });

const waitForLoadedGuestPreferences = async () => {
    await waitFor(() => expect(fetchCommunicationPreferences).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
};

const waitForLoadedHostPreferences = async () => {
    await waitFor(() => expect(fetchHostNotificationEventPreferences).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText("Loading notification preferences...")).not.toBeInTheDocument());
};

describe("Communication Preferences pages", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fetchCommunicationPreferences.mockResolvedValue(guestPreferences);
        saveCommunicationPreferences.mockResolvedValue(guestPreferences);
        fetchHostNotificationEventPreferences.mockResolvedValue(hostCatalog);
        saveHostNotificationEventPreferences.mockImplementation(async (preferences) => preferences);
    });

    test("Host page loads per-notification channel choices and marks required emails", async () => {
        renderWithLanguage(<HostCommunicationPreferences />);
        await waitForLoadedHostPreferences();

        expect(fetchHostNotificationEventPreferences).toHaveBeenCalledTimes(1);
        expect(fetchCommunicationPreferences).not.toHaveBeenCalled();
        expect(getHostToggle("New booking", "In-app")).toBeChecked();
        expect(getHostToggle("New booking", "Email")).toBeChecked();
        expect(getHostToggle("New booking", "Email")).toBeDisabled();
        expect(getHostToggle("New booking", "SMS")).not.toBeChecked();
        fireEvent.click(screen.getByRole("tab", { name: /Finance/i }));
        expect(getHostToggle("Chargeback", "Email")).not.toBeDisabled();
        expect(screen.queryByText("Recipients")).not.toBeInTheDocument();
        expect(screen.queryByText("Priority")).not.toBeInTheDocument();
    });

    test("Host can disable an optional email notification and save the other channels unchanged", async () => {
        renderWithLanguage(<HostCommunicationPreferences />);
        await waitForLoadedHostPreferences();

        fireEvent.click(screen.getByRole("tab", { name: /Finance/i }));
        fireEvent.click(getHostToggle("Chargeback", "Email"));
        fireEvent.click(screen.getByRole("button", { name: /save preferences/i }));

        await waitFor(() => expect(saveHostNotificationEventPreferences).toHaveBeenCalledWith({
            manager_new_booking: { inApp: true, email: true, sms: false },
            finance_chargeback: { inApp: true, email: false, sms: false },
        }));
        expect(await screen.findByText("Notification preferences saved.")).toBeInTheDocument();
    });

    test("Host keeps submitted preferences when PUT returns the wrapped GET response", async () => {
        const changedPreferences = {
            ...hostPreferences,
            finance_chargeback: { inApp: true, email: false, sms: false },
        };
        saveHostNotificationEventPreferences.mockResolvedValueOnce({
            categories: hostCategories,
            preferences: changedPreferences,
        });

        renderWithLanguage(<HostCommunicationPreferences />);
        await waitForLoadedHostPreferences();
        fireEvent.click(screen.getByRole("tab", { name: /Finance/i }));
        fireEvent.click(getHostToggle("Chargeback", "Email"));
        fireEvent.click(screen.getByRole("button", { name: /Save preferences/i }));

        expect(await screen.findByText("Notification preferences saved.")).toBeInTheDocument();
        expect(getHostToggle("Chargeback", "Email")).not.toBeChecked();
    });

    test("Host keeps submitted preferences when PUT succeeds without a response body", async () => {
        saveHostNotificationEventPreferences.mockResolvedValueOnce(null);

        renderWithLanguage(<HostCommunicationPreferences />);
        await waitForLoadedHostPreferences();
        fireEvent.click(screen.getByRole("tab", { name: /Finance/i }));
        fireEvent.click(getHostToggle("Chargeback", "Email"));
        fireEvent.click(screen.getByRole("button", { name: /Save preferences/i }));

        expect(await screen.findByText("Notification preferences saved.")).toBeInTheDocument();
        expect(getHostToggle("Chargeback", "Email")).not.toBeChecked();
    });

    test("failed Host PUT preserves unsaved changes and allows another save attempt", async () => {
        saveHostNotificationEventPreferences.mockRejectedValueOnce(new Error("network failed"));

        renderWithLanguage(<HostCommunicationPreferences />);
        await waitForLoadedHostPreferences();
        fireEvent.click(screen.getByRole("tab", { name: /Finance/i }));
        fireEvent.click(getHostToggle("Chargeback", "Email"));
        fireEvent.click(screen.getByRole("button", { name: /Save preferences/i }));

        expect(await screen.findByText("We could not save your notification choices. Your changes are still here. Please try again.")).toBeInTheDocument();
        expect(getHostToggle("Chargeback", "Email")).not.toBeChecked();
        expect(screen.getByRole("button", { name: /Save preferences/i })).toBeEnabled();
    });

    test("Guest page keeps its existing channel preference behavior", async () => {
        renderWithLanguage(<GuestCommunicationPreferences />);
        await waitForLoadedGuestPreferences();

        expect(fetchCommunicationPreferences).toHaveBeenCalledWith("guest");
        expect(getGuestToggle("Reservation", "Email")).toBeDisabled();
        expect(getGuestToggle("Reservation", "Email")).toHaveAttribute("aria-checked", "true");
        expect(getGuestToggle("Cancellation", "Email")).toBeDisabled();
        expect(getGuestToggle("Cancellation", "Email")).toHaveAttribute("aria-checked", "true");
        expect(getGuestToggle("Messages", "Email")).not.toBeDisabled();
    });

    test("failed Guest PUT preserves unsaved state", async () => {
        saveCommunicationPreferences.mockRejectedValueOnce(new Error("network failed"));
        renderWithLanguage(<GuestCommunicationPreferences />);
        await waitForLoadedGuestPreferences();

        const messagesEmail = getGuestToggle("Messages", "Email");
        fireEvent.click(messagesEmail);
        expect(messagesEmail).toHaveAttribute("aria-checked", "false");

        fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

        await waitFor(() => expect(saveCommunicationPreferences).toHaveBeenCalledWith("guest", expect.any(Object)));
        await waitFor(() => expect(screen.getByText("We could not save your communication preferences. Your changes are still here.")).toBeInTheDocument());
        expect(getGuestToggle("Messages", "Email")).toHaveAttribute("aria-checked", "false");
        expect(screen.getByRole("button", { name: /save changes/i })).toBeEnabled();
    });

    test("Host and Guest pages load their own preference APIs independently", async () => {
        const { unmount } = renderWithLanguage(<HostCommunicationPreferences />);
        await waitForLoadedHostPreferences();
        expect(fetchHostNotificationEventPreferences).toHaveBeenCalledTimes(1);
        unmount();

        renderWithLanguage(<GuestCommunicationPreferences />);
        await waitForLoadedGuestPreferences();
        expect(fetchCommunicationPreferences).toHaveBeenCalledWith("guest");
        expect(fetchHostNotificationEventPreferences).toHaveBeenCalledTimes(1);
    });
});
