import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import HostNotificationMatrixForm from "../../features/hostdashboard/hostsettings/pages/HostNotificationMatrixForm";
import { DEFAULT_HOST_NOTIFICATION_PREFERENCES } from "../../components/settings/hostNotificationMatrixConfig";
import en from "../../content/en.json";

const labels = en.settings.communicationPreferences.notificationMatrix;

describe("HostNotificationMatrixForm", () => {
    test("renders every host notification category and the Property Manager events by default", () => {
        const updatePreference = jest.fn();
        render(
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
            />
        );

        expect(screen.getByRole("tab", { name: /Property Manager 20/i })).toHaveAttribute("aria-selected", "true");
        expect(screen.getByRole("tab", { name: /Bookings & Reservations 17/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Property Owner 12/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Finance 12/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Distribution 12/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Compliance 4/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Tasks 10/i })).toBeInTheDocument();
        expect(screen.getByRole("checkbox", { name: "New booking notifications" })).toBeChecked();
    });

    test("allows a host to toggle an individual event", () => {
        const updatePreference = jest.fn();
        render(
            <HostNotificationMatrixForm
                labels={labels}
                preferences={DEFAULT_HOST_NOTIFICATION_PREFERENCES}
                updatePreference={updatePreference}
                isLoading={false}
                isSaving={false}
                loadError=""
                error=""
                saveSuccess={false}
                isDirty
                onSave={jest.fn()}
                onRetry={jest.fn()}
            />
        );

        fireEvent.click(screen.getByRole("checkbox", { name: "New booking notifications" }));
        expect(updatePreference).toHaveBeenCalledWith("manager_new_booking", false);
    });

    test("shows the selected category's event options", () => {
        render(
            <HostNotificationMatrixForm
                labels={labels}
                preferences={DEFAULT_HOST_NOTIFICATION_PREFERENCES}
                updatePreference={jest.fn()}
                isLoading={false}
                isSaving={false}
                loadError=""
                error=""
                saveSuccess={false}
                isDirty={false}
                onSave={jest.fn()}
                onRetry={jest.fn()}
            />
        );

        fireEvent.click(screen.getByRole("tab", { name: /Finance 12/i }));
        expect(screen.getByText("Reconciliation mismatch")).toBeInTheDocument();
        expect(screen.queryByText("New booking")).not.toBeInTheDocument();
    });

    test("disables event controls while preferences are loading or could not be loaded", () => {
        render(
            <HostNotificationMatrixForm
                labels={labels}
                preferences={DEFAULT_HOST_NOTIFICATION_PREFERENCES}
                updatePreference={jest.fn()}
                isLoading={false}
                isSaving={false}
                loadError="Load failed"
                error=""
                saveSuccess={false}
                isDirty
                onSave={jest.fn()}
                onRetry={jest.fn()}
            />
        );

        expect(screen.getByRole("checkbox", { name: "New booking notifications" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    });
});
