import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Auth } from "aws-amplify";
import { LanguageContext } from "../../../../context/LanguageContext";
import HostNotificationMatrix from "./HostNotificationMatrix";
import {
    cloneDefaultHostNotificationPreferences,
    HOST_NOTIFICATION_SECTIONS,
} from "../hostNotificationCatalog";
import {
    fetchHostNotificationPreferences,
    saveHostNotificationPreferences,
} from "../../../../components/settings/api/communicationPreferences";

jest.mock("aws-amplify", () => ({
    Auth: {
        currentAuthenticatedUser: jest.fn(),
    },
}));

jest.mock("../../../../components/settings/api/communicationPreferences", () => ({
    fetchHostNotificationPreferences: jest.fn(),
    saveHostNotificationPreferences: jest.fn(),
}));

const renderMatrix = (path = "/hostdashboard/settings/communication-preferences") => render(
    <LanguageContext.Provider value={{ language: "en" }}>
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/hostdashboard/settings/communication-preferences/*" element={<HostNotificationMatrix />} />
            </Routes>
        </MemoryRouter>
    </LanguageContext.Provider>
);

describe("HostNotificationMatrix", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Auth.currentAuthenticatedUser.mockResolvedValue({ attributes: { "custom:group": "Host" } });
        fetchHostNotificationPreferences.mockResolvedValue(cloneDefaultHostNotificationPreferences());
        saveHostNotificationPreferences.mockImplementation(async (preferences) => preferences);
    });

    test("renders the Property Manager tab by default with its complete event list", async () => {
        renderMatrix();

        expect(await screen.findByRole("heading", { name: "Property Manager" })).toBeInTheDocument();
        expect(screen.getByText("New reservation")).toBeInTheDocument();
        expect(screen.getByText("Conflict detected")).toBeInTheDocument();
        expect(screen.getByText("Listing unavailable")).toBeInTheDocument();
        expect(screen.getAllByRole("checkbox")).toHaveLength(
            HOST_NOTIFICATION_SECTIONS.find((section) => section.key === "propertyManager").events.length
        );
        expect(screen.queryByRole("link", { name: "Engineering" })).not.toBeInTheDocument();
    });

    test("navigates to another category and displays its events", async () => {
        renderMatrix();

        fireEvent.click(await screen.findByRole("link", { name: "Finance" }));

        expect(await screen.findByRole("heading", { name: "Finance" })).toBeInTheDocument();
        expect(screen.getByText("Guest payment received")).toBeInTheDocument();
        expect(screen.getByText("Accounting export failed")).toBeInTheDocument();
    });


    test("shows the staff task notifications in their own tab", async () => {
        renderMatrix();

        fireEvent.click(await screen.findByRole("link", { name: "Staff & Tasks" }));

        expect(await screen.findByRole("heading", { name: "Staff & Tasks" })).toBeInTheDocument();
        expect(screen.getByText("Cleaning required")).toBeInTheDocument();
        expect(screen.getByText("Emergency property issue")).toBeInTheDocument();
        expect(screen.getAllByRole("checkbox")).toHaveLength(
            HOST_NOTIFICATION_SECTIONS.find((section) => section.key === "staff").events.length
        );
    });

    test("updates and saves an individual event preference", async () => {
        renderMatrix();

        const checkbox = await screen.findByRole("checkbox", { name: "New reservation notifications" });
        fireEvent.click(checkbox);

        expect(checkbox).not.toBeChecked();
        const saveButton = screen.getByRole("button", { name: "Save notification choices" });
        expect(saveButton).toBeEnabled();
        fireEvent.click(saveButton);

        await waitFor(() => expect(saveHostNotificationPreferences).toHaveBeenCalledTimes(1));
        const savedPayload = saveHostNotificationPreferences.mock.calls[0][0];
        expect(savedPayload.propertyManager.newBooking).toBe(false);
        expect(await screen.findByText("Notification preferences saved.")).toBeInTheDocument();
    });

    test("shows Engineering only to Admin and Engineer accounts", async () => {
        Auth.currentAuthenticatedUser.mockResolvedValue({ attributes: { "custom:group": "Engineer" } });
        renderMatrix();

        expect(await screen.findByRole("link", { name: "Engineering" })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("link", { name: "Engineering" }));

        expect(await screen.findByRole("heading", { name: "Engineering" })).toBeInTheDocument();
        expect(screen.getByText("API downtime")).toBeInTheDocument();
    });

    test("redirects a regular host away from a direct Engineering route", async () => {
        renderMatrix("/hostdashboard/settings/communication-preferences/engineering");

        expect(await screen.findByRole("heading", { name: "Property Manager" })).toBeInTheDocument();
        expect(screen.queryByText("API downtime")).not.toBeInTheDocument();
    });

    test("does not enable saving when preferences failed to load", async () => {
        fetchHostNotificationPreferences.mockRejectedValueOnce(new Error("network failed"));
        renderMatrix();

        await waitFor(() => expect(screen.getByText("We could not load your notification preferences. Please try again.")).toBeInTheDocument());
        expect(screen.getByRole("button", { name: "Save notification choices" })).toBeDisabled();
        expect(screen.getByRole("checkbox", { name: "New reservation notifications" })).toBeDisabled();
    });
});
