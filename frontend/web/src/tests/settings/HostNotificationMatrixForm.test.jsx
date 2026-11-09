import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import HostNotificationMatrixForm from "../../features/hostdashboard/hostsettings/pages/HostNotificationMatrixForm";
import en from "../../content/en.json";

const labels = en.settings.communicationPreferences.notificationMatrix;
const updatePreference = jest.fn();
const createCategory = (key, labelKey, prefix, events) => ({
    key,
    labelKey,
    events: events.map(([suffix, event]) => ({ key: prefix + "_" + suffix, event })),
});
const categories = [
    createCategory("propertyManager", "propertyManager", "manager", [["new_booking", "New booking"]]),
    createCategory("bookings", "bookings", "booking", [["created", "Booking created"]]),
    createCategory("propertyOwner", "propertyOwner", "owner", [["new_booking", "New booking"]]),
    createCategory("finance", "finance", "finance", [
        ["chargeback", "Chargeback"],
        ["reconciliation_mismatch", "Reconciliation mismatch"],
    ]),
    createCategory("distribution", "distribution", "distribution", [["channel_connected", "Channel connected"]]),
    createCategory("compliance", "compliance", "compliance", [["kyc_rejected", "KYC rejected"]]),
    createCategory("tasks", "tasks", "task", [["completed", "Task completed"]]),
];
const preferences = Object.fromEntries(
    categories.flatMap((category) => category.events.map((event) => [
        event.key,
        { inApp: true, email: true, sms: false },
    ]))
);

const renderForm = (overrides = {}) => render(
    <HostNotificationMatrixForm
        labels={labels}
        categories={categories}
        preferences={preferences}
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
    screen.getByRole("checkbox", { name: event + " - " + labels.channels[channel] });

describe("HostNotificationMatrixForm", () => {
    beforeEach(() => jest.clearAllMocks());

    test("renders the notification categories and three delivery channels", () => {
        renderForm();

        expect(screen.getByRole("tab", { name: /Property Manager 1/i })).toHaveAttribute("aria-selected", "true");
        expect(screen.getByRole("tab", { name: /Bookings & Reservations 1/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Property Owner 1/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Finance 2/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Distribution 1/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Compliance 1/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Tasks 1/i })).toBeInTheDocument();
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
        expect(updatePreference).toHaveBeenCalledTimes(8);
        expect(updatePreference).toHaveBeenCalledWith("manager_new_booking", "email", false);
        expect(updatePreference).toHaveBeenCalledWith("task_completed", "email", false);
    });

    test("shows only the selected category's notifications", () => {
        renderForm();

        fireEvent.click(screen.getByRole("tab", { name: /Finance 2/i }));
        expect(screen.getByText("Reconciliation mismatch")).toBeInTheDocument();
        expect(screen.queryByText("New booking")).not.toBeInTheDocument();
    });

    test("disables controls and offers retry after a loading failure", () => {
        renderForm({ loadError: "Load failed" });

        expect(getChannelToggle("New booking", "email")).toBeDisabled();
        expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    });
});
