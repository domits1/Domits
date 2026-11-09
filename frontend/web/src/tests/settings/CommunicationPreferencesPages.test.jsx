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
import { DEFAULT_HOST_NOTIFICATION_PREFERENCES } from "../../components/settings/hostNotificationMatrixConfig";

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

const renderWithLanguage = (ui) => render(
    <LanguageContext.Provider value={{ language: "en" }}>
        <MemoryRouter>{ui}</MemoryRouter>
    </LanguageContext.Provider>
);

const getGuestToggle = (eventName, channelName) =>
    screen.getByRole("switch", { name: `${eventName} ${channelName} notifications` });

const getHostToggle = (eventName, channelName) =>
    screen.getByRole("checkbox", { name: `${eventName} - ${channelName}` });

const waitForLoadedGuestPreferences = async () => {
    await waitFor(() => expect(fetchCommunicationPreferences).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
};

const waitForLoadedHostPreferences = async () => {
    await waitFor(() => expect(fetchHostNotificationEventPreferences).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
};

describe("Communication Preferences pages", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fetchCommunicationPreferences.mockResolvedValue(guestPreferences);
        saveCommunicationPreferences.mockResolvedValue(guestPreferences);
        fetchHostNotificationEventPreferences.mockResolvedValue(DEFAULT_HOST_NOTIFICATION_PREFERENCES);
        saveHostNotificationEventPreferences.mockImplementation(async (preferences) => preferences);
    });

    test("Host page loads per-notification channel choices without the old technical columns", async () => {
        renderWithLanguage(<HostCommunicationPreferences />);
        await waitForLoadedHostPreferences();

        expect(fetchHostNotificationEventPreferences).toHaveBeenCalledTimes(1);
        expect(fetchCommunicationPreferences).not.toHaveBeenCalled();
        expect(getHostToggle("New booking", "In-app")).toBeChecked();
        expect(getHostToggle("New booking", "Email")).toBeChecked();
        expect(getHostToggle("New booking", "SMS")).not.toBeChecked();
        expect(screen.queryByText("Recipients")).not.toBeInTheDocument();
        expect(screen.queryByText("Priority")).not.toBeInTheDocument();
    });

    test("Host can disable email for one notification and save the other channels unchanged", async () => {
        renderWithLanguage(<HostCommunicationPreferences />);
        await waitForLoadedHostPreferences();

        fireEvent.click(getHostToggle("New booking", "Email"));
        fireEvent.click(screen.getByRole("button", { name: /save preferences/i }));

        await waitFor(() => expect(saveHostNotificationEventPreferences).toHaveBeenCalledWith({
            ...DEFAULT_HOST_NOTIFICATION_PREFERENCES,
            manager_new_booking: {
                ...DEFAULT_HOST_NOTIFICATION_PREFERENCES.manager_new_booking,
                email: false,
            },
        }));
        expect(await screen.findByText("Notification preferences saved.")).toBeInTheDocument();
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
