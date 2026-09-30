import React from "react";
import PropTypes from "prop-types";
import { authStatusShape } from "./propTypes";

// Renders the Email/SMS/Authenticator-app status rows for the Privacy & Security page.
// SMS and Authenticator app are status-only here: the Cognito pool has MFA off and login
// cannot handle an MFA challenge yet, so there is no Enable/Manage action to wire up.
const AuthenticationStatusSection = ({
    authStatus,
    authStatusLoading,
    authStatusError,
    mfaStatusError,
    labels,
}) => {
    if (authStatusLoading) {
        return <p className="pd-auth-subtext">{labels.loading}</p>;
    }

    const mfaUnavailable = authStatusError || mfaStatusError;

    return (
        <>
            <div className="pd-auth-row">
                <span className="pd-pref-label">{labels.emailLabel}</span>
                {authStatusError ? (
                    <span className="pd-status-pill pd-status-pill--inactive">{labels.unavailable}</span>
                ) : (
                    <>
                        <span className={`pd-status-pill ${authStatus.emailVerified ? "pd-status-pill--active" : "pd-status-pill--inactive"}`}>
                            {authStatus.emailVerified ? labels.active : labels.inactive}
                        </span>
                        {authStatus.emailVerified && (
                            <span className="pd-verified-check">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                    <path d="M3 8l3.5 3.5L13 5" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {labels.verified}
                            </span>
                        )}
                    </>
                )}
            </div>

            <div className="pd-auth-row">
                <span className="pd-pref-label">{labels.sms}</span>
                <span className={`pd-status-pill ${!mfaUnavailable && authStatus.preferredMFA === "SMS" ? "pd-status-pill--active" : "pd-status-pill--inactive"}`}>
                    {mfaUnavailable ? labels.unavailable : (authStatus.preferredMFA === "SMS" ? labels.active : labels.inactive)}
                </span>
            </div>

            <div className="pd-auth-row">
                <span className="pd-pref-label">{labels.authenticatorApp}</span>
                <span className={`pd-status-pill ${!mfaUnavailable && authStatus.preferredMFA === "TOTP" ? "pd-status-pill--active" : "pd-status-pill--inactive"}`}>
                    {mfaUnavailable ? labels.unavailable : (authStatus.preferredMFA === "TOTP" ? labels.active : labels.inactive)}
                </span>
            </div>

            <p className="pd-auth-subtext">{mfaUnavailable ? labels.error : labels.comingSoon}</p>
        </>
    );
};

AuthenticationStatusSection.propTypes = {
    authStatus: authStatusShape.isRequired,
    authStatusLoading: PropTypes.bool.isRequired,
    authStatusError: PropTypes.bool.isRequired,
    mfaStatusError: PropTypes.bool.isRequired,
    labels: PropTypes.shape({
        emailLabel: PropTypes.string.isRequired,
        active: PropTypes.string.isRequired,
        inactive: PropTypes.string.isRequired,
        unavailable: PropTypes.string.isRequired,
        verified: PropTypes.string.isRequired,
        sms: PropTypes.string.isRequired,
        authenticatorApp: PropTypes.string.isRequired,
        comingSoon: PropTypes.string.isRequired,
        loading: PropTypes.string.isRequired,
        error: PropTypes.string.isRequired,
    }).isRequired,
};

export default AuthenticationStatusSection;
