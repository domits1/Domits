import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import PasswordChangeSection from "../../components/settings/PasswordChangeSection";

const t = {
    prefs: {
        passwordLabel: "Password",
        changePassword: "Change Password",
        changePasswordTitle: "Change your password",
        currentPassword: "Current password",
        newPassword: "New password",
        confirmPassword: "Confirm new password",
        savePassword: "Save password",
        passwordChanged: "Password changed successfully.",
        showPassword: "Show password",
        hidePassword: "Hide password",
    },
    buttons: { saving: "Saving...", close: "Close", cancel: "Cancel" },
};

const baseProps = {
    t,
    isChangingPassword: false,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    passwordError: "",
    isSavingPassword: false,
    passwordChangeSuccess: false,
    onOpenPasswordChange: jest.fn(),
    onClosePasswordChange: jest.fn(),
    onCurrentPasswordChange: jest.fn(),
    onNewPasswordChange: jest.fn(),
    onConfirmPasswordChange: jest.fn(),
    onSubmitPasswordChange: jest.fn(),
};

describe("PasswordChangeSection", () => {
    test("shows the toggle button and hides the form when closed", () => {
        render(<PasswordChangeSection {...baseProps} />);
        expect(screen.getByRole("button", { name: t.prefs.changePassword })).toBeInTheDocument();
        expect(screen.queryByLabelText(t.prefs.currentPassword)).not.toBeInTheDocument();
    });

    test("opens the inline form and submits the entered passwords", () => {
        const onSubmitPasswordChange = jest.fn();
        render(
            <PasswordChangeSection
                {...baseProps}
                isChangingPassword
                currentPassword="old-pass"
                newPassword="new-pass"
                confirmPassword="new-pass"
                onSubmitPasswordChange={onSubmitPasswordChange}
            />
        );

        expect(screen.getByLabelText(t.prefs.currentPassword)).toHaveValue("old-pass");
        fireEvent.click(screen.getByRole("button", { name: t.prefs.savePassword }));
        expect(onSubmitPasswordChange).toHaveBeenCalledTimes(1);
    });

    test("shows the password error message when present", () => {
        render(<PasswordChangeSection {...baseProps} isChangingPassword passwordError="New password and confirmation do not match." />);
        expect(screen.getByText("New password and confirmation do not match.")).toBeInTheDocument();
    });
});
