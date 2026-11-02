import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AuthenticationStatusSection from "../../components/settings/AuthenticationStatusSection";

const labels = {
    emailLabel: "Email",
    active: "Active",
    inactive: "Inactive",
    unavailable: "Unavailable",
    verified: "Verified",
    sms: "SMS",
    comingSoon: "Coming soon: SMS sign-in.",
    loading: "Loading your authentication status...",
    error: "We couldn't load your authentication status. Please refresh the page.",
};

const baseProps = {
    authStatus: { emailVerified: true, phoneVerified: false, preferredMFA: "NOMFA" },
    authStatusLoading: false,
    authStatusError: false,
    mfaStatusError: false,
    labels,
};

describe("AuthenticationStatusSection", () => {
    test("shows the loading message while the status is loading", () => {
        render(<AuthenticationStatusSection {...baseProps} authStatusLoading />);
        expect(screen.getByText(labels.loading)).toBeInTheDocument();
        expect(screen.queryByText(labels.emailLabel)).not.toBeInTheDocument();
    });

    test("shows Active for a verified email and the coming-soon note for SMS", () => {
        render(<AuthenticationStatusSection {...baseProps} />);
        expect(screen.getByText(labels.emailLabel)).toBeInTheDocument();
        expect(screen.getAllByText(labels.active)).toHaveLength(1);
        expect(screen.getByText(labels.verified)).toBeInTheDocument();
        expect(screen.getAllByText(labels.inactive)).toHaveLength(1);
        expect(screen.getByText(labels.comingSoon)).toBeInTheDocument();
        expect(screen.queryByText("Authenticator app")).not.toBeInTheDocument();
    });

    test("shows Inactive for an unverified email", () => {
        render(
            <AuthenticationStatusSection
                {...baseProps}
                authStatus={{ emailVerified: false, phoneVerified: false, preferredMFA: "NOMFA" }}
            />
        );
        expect(screen.getAllByText(labels.inactive)).toHaveLength(2);
        expect(screen.queryByText(labels.verified)).not.toBeInTheDocument();
    });

    test("when the whole fetch failed, email also shows Unavailable, not Inactive", () => {
        render(<AuthenticationStatusSection {...baseProps} authStatusError />);
        expect(screen.getAllByText(labels.unavailable)).toHaveLength(2);
        expect(screen.queryByText(labels.inactive)).not.toBeInTheDocument();
        expect(screen.getByText(labels.error)).toBeInTheDocument();
    });

    test("when only the MFA lookup failed, email keeps its real status", () => {
        render(<AuthenticationStatusSection {...baseProps} mfaStatusError />);
        expect(screen.getByText(labels.active)).toBeInTheDocument();
        expect(screen.getByText(labels.verified)).toBeInTheDocument();
        expect(screen.getAllByText(labels.unavailable)).toHaveLength(1);
        expect(screen.getByText(labels.error)).toBeInTheDocument();
    });
});
