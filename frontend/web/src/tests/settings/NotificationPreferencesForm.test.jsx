import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import NotificationPreferencesForm from "../../components/settings/NotificationPreferencesForm";
import en from "../../content/en.json";

const labels = en.settings.communicationPreferences;

const getToggle = (eventName, channelName) =>
    screen.getByRole("switch", { name: `${eventName} ${channelName} notifications` });

describe("NotificationPreferencesForm", () => {
    test("renders the notification preferences matrix", () => {
        render(<NotificationPreferencesForm labels={labels} />);

        expect(screen.getByRole("heading", { name: /notification preferences/i })).toBeInTheDocument();
        expect(screen.getByText("Reservation")).toBeInTheDocument();
        expect(screen.getByText("Cancellation")).toBeInTheDocument();
        expect(screen.getByText("Messages")).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Email" })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "SMS" })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Push" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
    });

    test("uses the approved defaults and disables required email preferences", () => {
        render(<NotificationPreferencesForm labels={labels} />);

        expect(getToggle("Reservation", "Email")).toHaveAttribute("aria-checked", "true");
        expect(getToggle("Reservation", "Email")).toBeDisabled();
        expect(getToggle("Reservation", "SMS")).toHaveAttribute("aria-checked", "false");
        expect(getToggle("Reservation", "Push")).toHaveAttribute("aria-checked", "true");
        expect(getToggle("Cancellation", "Email")).toHaveAttribute("aria-checked", "true");
        expect(getToggle("Cancellation", "Email")).toBeDisabled();
        expect(getToggle("Cancellation", "SMS")).toHaveAttribute("aria-checked", "true");
        expect(getToggle("Cancellation", "Push")).toHaveAttribute("aria-checked", "true");
        expect(getToggle("Messages", "Email")).toHaveAttribute("aria-checked", "true");
        expect(getToggle("Messages", "Email")).not.toBeDisabled();
        expect(getToggle("Messages", "SMS")).toHaveAttribute("aria-checked", "false");
        expect(getToggle("Messages", "Push")).toHaveAttribute("aria-checked", "true");
        expect(screen.getAllByText("Required")).toHaveLength(2);
    });

    test("required email preferences stay on when clicked", () => {
        render(<NotificationPreferencesForm labels={labels} />);

        const reservationEmail = getToggle("Reservation", "Email");
        const cancellationEmail = getToggle("Cancellation", "Email");

        fireEvent.click(reservationEmail);
        fireEvent.click(cancellationEmail);

        expect(reservationEmail).toHaveAttribute("aria-checked", "true");
        expect(cancellationEmail).toHaveAttribute("aria-checked", "true");
    });

    test("messages email remains toggleable", () => {
        render(<NotificationPreferencesForm labels={labels} />);

        const messagesEmail = getToggle("Messages", "Email");
        expect(messagesEmail).toHaveAttribute("aria-checked", "true");

        fireEvent.click(messagesEmail);
        expect(messagesEmail).toHaveAttribute("aria-checked", "false");
    });

    test("reservation and cancellation sms and push remain toggleable", () => {
        render(<NotificationPreferencesForm labels={labels} />);

        const reservationSms = getToggle("Reservation", "SMS");
        const reservationPush = getToggle("Reservation", "Push");
        const cancellationSms = getToggle("Cancellation", "SMS");
        const cancellationPush = getToggle("Cancellation", "Push");

        fireEvent.click(reservationSms);
        fireEvent.click(reservationPush);
        fireEvent.click(cancellationSms);
        fireEvent.click(cancellationPush);

        expect(reservationSms).toHaveAttribute("aria-checked", "true");
        expect(reservationPush).toHaveAttribute("aria-checked", "false");
        expect(cancellationSms).toHaveAttribute("aria-checked", "false");
        expect(cancellationPush).toHaveAttribute("aria-checked", "false");
    });
});