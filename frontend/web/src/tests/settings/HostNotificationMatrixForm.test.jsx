import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import HostNotificationMatrixForm from "../../features/hostdashboard/hostsettings/pages/HostNotificationMatrixForm";
import { DEFAULT_HOST_NOTIFICATION_PREFERENCES } from "../../components/settings/hostNotificationMatrixConfig";
import en from "../../content/en.json";

const labels = en.settings.communicationPreferences.notificationMatrix;
const updatePreference = jest.fn();

const renderForm = (overrides = {}) => render(
    <HostNotificationMatrixForm
        labels={labels}
        preferences={DEFAULT_HOST_NOTIFICATION_PREFERENCES}
        updatePreference={updatePreference}
        isLoading={false}
        isSaving={false}
        loadError=""
        error=""
        saveSuccess={false}
        isDirty={false}
        onSave={jest.fn()}
        onRetry={jest.fn()}
        {...overrides}
    />
);

const getChannelToggle = (event, channel) =>
    screen.getByRole("checkbox", { name: `${event} - ${labels.channels[channel]}` });

describe("HostNotificationMatrixForm", () => {
    beforeEach(() => jest.clearAllMocks());

    test("renders the notification categories and three delivery channels", () => {
        renderForm();

        expect(screen.getByRole("tab", { name: /Property Manager 20/i })).toHaveAttribute("aria-selected", "true");
        expect(screen.getByRole("tab", { name: /Bookings & Reservations 17/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Property Owner 12/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Finance 12/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Distribution 12/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Compliance 4/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Tasks 10/i })).toBeInTheDocument();
        expect(getChannelToggle("New booking", "inApp")).toBeChecked();
        expect(getChannelToggle("New booking", "email")).toBeChecked();
        expect(getChannelToggle("New booking", "sms")).not.toBeChecked();
        expect(screen.queryByText("Recipients")).not.toBeInTheDocument();
        expect(screen.queryByText("Priority")).not.toBeInTheDocument();
        expect(screen.queryByText("Action")).not.toBeInTheDocument();
    });

    test("lets a host choose each channel independently", () => {
        renderForm();

        fireEvent.click(getChannelToggle("New booking", "email"));
        expect(updatePreference).toHaveBeenCalledWith("manager_new_booking", "email", false);
    });

    test("can turn off email notifications for every event at once", () => {
        renderForm();

        fireEvent.click(screen.getByRole("button", { name: labels.disableAllEmail }));
        expect(updatePreference).toHaveBeenCalledTimes(87);
        expect(updatePreference).toHaveBeenCalledWith("manager_new_booking", "email", false);
        expect(updatePreference).toHaveBeenCalledWith("task_completed", "email", false);
    });

    test("shows only the selected category's notifications", () => {
        renderForm();

        fireEvent.click(screen.getByRole("tab", { name: /Finance 12/i }));
        expect(screen.getByText("Reconciliation mismatch")).toBeInTheDocument();
        expect(screen.queryByText("New booking")).not.toBeInTheDocument();
    });

    test("disables controls and offers retry after a loading failure", () => {
        renderForm({ loadError: "Load failed" });

        expect(getChannelToggle("New booking", "email")).toBeDisabled();
        expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    });
});
