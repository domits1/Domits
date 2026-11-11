import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import HostNotificationMatrixForm from "../../features/hostdashboard/hostsettings/pages/HostNotificationMatrixForm";
import { getHostNotificationMatrixLabels } from "../../content/hostNotificationMatrixLabels";

const labels = getHostNotificationMatrixLabels("en");
const updatePreference = jest.fn();
const REQUIRED_EMAIL_EVENTS = new Set(["manager_new_booking", "booking_created", "owner_new_booking"]);
const createCategory = (key, labelKey, prefix, events) => ({
    key,
    labelKey,
    events: events.map(([suffix, event]) => {
        const eventKey = prefix + "_" + suffix;
        return {
            key: eventKey,
            event,
            ...(REQUIRED_EMAIL_EVENTS.has(eventKey) ? { requiredChannels: ["email"] } : {}),
        };
    }),
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

    test("renders the notification categories and required delivery channels", () => {
        renderForm();

        expect(screen.getByRole("tab", { name: /Property Manager 1/i })).toHaveAttribute("aria-selected", "true");
        expect(screen.getByRole("tab", { name: /Bookings & Reservations 1/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Property Owner 1/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Finance 2/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Distribution 1/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Compliance 1/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Tasks 1/i })).toBeInTheDocument();
        expect(getChannelToggle("New booking", "inApp")).toBeChecked();
        expect(getChannelToggle("New booking", "Email")).toBeChecked();
        expect(getChannelToggle("New booking", "Email")).toBeDisabled();
        expect(screen.getByText(labels.required)).toBeInTheDocument();
        expect(getChannelToggle("New booking", "SMS")).not.toBeChecked();
        expect(screen.queryByText("Recipients")).not.toBeInTheDocument();
        expect(screen.queryByText("Priority")).not.toBeInTheDocument();
        expect(screen.queryByText("Action")).not.toBeInTheDocument();
    });

    test("lets a host change an optional channel independently", () => {
        renderForm();

        fireEvent.click(getChannelToggle("New booking", "In-app"));
        expect(updatePreference).toHaveBeenCalledWith("manager_new_booking", "inApp", false);
    });

    test("bulk email action changes optional events only", () => {
        renderForm();

        fireEvent.click(screen.getByRole("button", { name: labels.disableAllEmail }));
        expect(updatePreference).toHaveBeenCalledTimes(5);
        expect(updatePreference).toHaveBeenCalledWith("finance_chargeback", "email", false);
        expect(updatePreference).toHaveBeenCalledWith("task_completed", "email", false);
        expect(updatePreference).not.toHaveBeenCalledWith("manager_new_booking", "email", false);
        expect(updatePreference).not.toHaveBeenCalledWith("booking_created", "email", false);
        expect(updatePreference).not.toHaveBeenCalledWith("owner_new_booking", "email", false);
    });

    test("shows only the selected category's notifications", () => {
        renderForm();

        fireEvent.click(screen.getByRole("tab", { name: /Finance 2/i }));
        expect(screen.getByText("Reconciliation mismatch")).toBeInTheDocument();
        expect(screen.queryByText("New booking")).not.toBeInTheDocument();
    });

    test("disables controls and offers retry after a loading failure", () => {
        renderForm({ loadError: "Load failed" });

        expect(getChannelToggle("New booking", "Email")).toBeDisabled();
        expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    });
});
