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
} from "../../components/settings/api/communicationPreferences";

jest.mock("../../components/settings/api/communicationPreferences", () => ({
    fetchCommunicationPreferences: jest.fn(),
    saveCommunicationPreferences: jest.fn(),
}));

const hostPreferences = {
    reservation: { email: true, sms: true, push: false },
    cancellation: { email: true, sms: false, push: true },
    messages: { email: false, sms: true, push: false },
};

const guestPreferences = {
    reservation: { email: true, sms: false, push: true },
    cancellation: { email: true, sms: true, push: false },
    messages: { email: true, sms: false, push: true },
};

const defaults = {
    reservation: { email: true, sms: false, push: true },
    cancellation: { email: true, sms: true, push: true },
    messages: { email: true, sms: false, push: true },
};

const renderWithLanguage = (ui) => render(
    <LanguageContext.Provider value={{ language: "en" }}>
        <MemoryRouter>{ui}</MemoryRouter>
    </LanguageContext.Provider>
);

const getToggle = (eventName, channelName) =>
    screen.getByRole("switch", { name: `${eventName} ${channelName} notifications` });

const waitForLoadedPreferences = async () => {
    await waitFor(() => expect(fetchCommunicationPreferences).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
};

describe("Communication Preferences pages", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fetchCommunicationPreferences.mockResolvedValue(defaults);
        saveCommunicationPreferences.mockResolvedValue(defaults);
    });

    test("Host page GET uses persona=host and populates saved preferences", async () => {
        fetchCommunicationPreferences.mockResolvedValueOnce(hostPreferences);

        renderWithLanguage(<HostCommunicationPreferences />);

        expect(screen.getByRole("status")).toHaveTextContent("Loading communication preferences");
        await waitForLoadedPreferences();

        expect(fetchCommunicationPreferences).toHaveBeenCalledWith("host");
        expect(getToggle("Reservation", "SMS")).toHaveAttribute("aria-checked", "true");
        expect(getToggle("Reservation", "Push")).toHaveAttribute("aria-checked", "false");
        expect(getToggle("Cancellation", "SMS")).toHaveAttribute("aria-checked", "false");
        expect(getToggle("Messages", "Email")).toHaveAttribute("aria-checked", "false");
        expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
    });

    test("Guest page GET uses persona=guest and default rendering", async () => {
        renderWithLanguage(<GuestCommunicationPreferences />);

        await waitForLoadedPreferences();

        expect(fetchCommunicationPreferences).toHaveBeenCalledWith("guest");
        expect(getToggle("Reservation", "Email")).toBeDisabled();
        expect(getToggle("Reservation", "Email")).toHaveAttribute("aria-checked", "true");
        expect(getToggle("Cancellation", "Email")).toBeDisabled();
        expect(getToggle("Cancellation", "Email")).toHaveAttribute("aria-checked", "true");
        expect(getToggle("Messages", "Email")).not.toBeDisabled();
    });

    test("editing enables Save and successful Host PUT sends persona plus exact complete matrix", async () => {
        renderWithLanguage(<HostCommunicationPreferences />);
        await waitForLoadedPreferences();

        const reservationSms = getToggle("Reservation", "SMS");
        const saveButton = screen.getByRole("button", { name: /save changes/i });
        expect(saveButton).toBeDisabled();

        fireEvent.click(reservationSms);
        expect(saveButton).toBeEnabled();

        saveCommunicationPreferences.mockResolvedValueOnce({
            ...defaults,
            reservation: { ...defaults.reservation, sms: true },
        });

        fireEvent.click(saveButton);

        await waitFor(() => expect(saveCommunicationPreferences).toHaveBeenCalledWith("host", {
            reservation: { email: true, sms: true, push: true },
            cancellation: { email: true, sms: true, push: true },
            messages: { email: true, sms: false, push: true },
        }));
        await waitFor(() => expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled());
        expect(screen.getByText("Communication preferences saved.")).toBeInTheDocument();
    });

    test("required email fields remain true and disabled after backend data loads", async () => {
        fetchCommunicationPreferences.mockResolvedValueOnce({
            reservation: { email: false, sms: false, push: true },
            cancellation: { email: false, sms: true, push: true },
            messages: { email: true, sms: false, push: true },
        });

        renderWithLanguage(<HostCommunicationPreferences />);
        await waitForLoadedPreferences();

        expect(getToggle("Reservation", "Email")).toBeDisabled();
        expect(getToggle("Reservation", "Email")).toHaveAttribute("aria-checked", "true");
        expect(getToggle("Cancellation", "Email")).toBeDisabled();
        expect(getToggle("Cancellation", "Email")).toHaveAttribute("aria-checked", "true");
        expect(screen.getAllByText("Required")).toHaveLength(2);
    });

    test("failed Guest PUT preserves unsaved state", async () => {
        saveCommunicationPreferences.mockRejectedValueOnce(new Error("network failed"));
        renderWithLanguage(<GuestCommunicationPreferences />);
        await waitForLoadedPreferences();

        const messagesEmail = getToggle("Messages", "Email");
        fireEvent.click(messagesEmail);
        expect(messagesEmail).toHaveAttribute("aria-checked", "false");

        fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

        await waitFor(() => expect(saveCommunicationPreferences).toHaveBeenCalledWith("guest", expect.any(Object)));
        await waitFor(() => expect(screen.getByText("We could not save your communication preferences. Your changes are still here.")).toBeInTheDocument());
        expect(getToggle("Messages", "Email")).toHaveAttribute("aria-checked", "false");
        expect(screen.getByRole("button", { name: /save changes/i })).toBeEnabled();
    });

    test("Host and Guest page states are independent", async () => {
        fetchCommunicationPreferences.mockResolvedValueOnce(hostPreferences);
        const { unmount } = renderWithLanguage(<HostCommunicationPreferences />);
        await waitForLoadedPreferences();
        expect(getToggle("Reservation", "SMS")).toHaveAttribute("aria-checked", "true");
        expect(getToggle("Messages", "Email")).toHaveAttribute("aria-checked", "false");
        unmount();

        fetchCommunicationPreferences.mockResolvedValueOnce(guestPreferences);
        renderWithLanguage(<GuestCommunicationPreferences />);
        await waitForLoadedPreferences();
        expect(getToggle("Reservation", "SMS")).toHaveAttribute("aria-checked", "false");
        expect(getToggle("Messages", "Email")).toHaveAttribute("aria-checked", "true");

        expect(fetchCommunicationPreferences).toHaveBeenNthCalledWith(1, "host");
        expect(fetchCommunicationPreferences).toHaveBeenNthCalledWith(2, "guest");
    });

    test("Host and Guest save through the same API contract with different personas", async () => {
        const { unmount } = renderWithLanguage(<HostCommunicationPreferences />);
        await waitForLoadedPreferences();
        fireEvent.click(getToggle("Messages", "SMS"));
        fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
        await waitFor(() => expect(saveCommunicationPreferences).toHaveBeenCalledTimes(1));
        unmount();

        fetchCommunicationPreferences.mockResolvedValue(defaults);
        saveCommunicationPreferences.mockResolvedValue(defaults);
        renderWithLanguage(<GuestCommunicationPreferences />);
        await waitForLoadedPreferences();
        fireEvent.click(getToggle("Messages", "SMS"));
        fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
        await waitFor(() => expect(saveCommunicationPreferences).toHaveBeenCalledTimes(2));

        expect(saveCommunicationPreferences.mock.calls[0][0]).toBe("host");
        expect(saveCommunicationPreferences.mock.calls[1][0]).toBe("guest");
        expect(saveCommunicationPreferences.mock.calls[0][1]).toEqual(saveCommunicationPreferences.mock.calls[1][1]);
    });
});
