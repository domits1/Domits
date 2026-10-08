import React, { useState } from "react";
import PropTypes from "prop-types";

const EyeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const EyeOffIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a20.29 20.29 0 015.06-6.06M9.9 4.24A10.94 10.94 0 0112 4c7 0 11 8 11 8a20.29 20.29 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

const PasswordField = ({ id, label, value, onChange, autoComplete, isVisible, onToggleVisibility, showLabel, hideLabel }) => (
    <div className="pd-field">
        <label className="pd-field-label" htmlFor={id}>{label}</label>
        <div className="pd-password-input-wrap">
            <input
                id={id}
                type={isVisible ? "text" : "password"}
                value={value}
                onChange={onChange}
                className="pd-field-input"
                autoComplete={autoComplete}
            />
            <button
                type="button"
                className="pd-password-toggle"
                onClick={onToggleVisibility}
                aria-label={isVisible ? hideLabel : showLabel}
            >
                {isVisible ? <EyeOffIcon /> : <EyeIcon />}
            </button>
        </div>
    </div>
);

PasswordField.propTypes = {
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    autoComplete: PropTypes.string.isRequired,
    isVisible: PropTypes.bool.isRequired,
    onToggleVisibility: PropTypes.func.isRequired,
    showLabel: PropTypes.string.isRequired,
    hideLabel: PropTypes.string.isRequired,
};

function getPasswordToggleLabel(isChangingPassword, passwordChangeSuccess, t) {
    if (!isChangingPassword) return t.prefs.changePassword;
    return passwordChangeSuccess ? t.buttons.close : t.buttons.cancel;
}

const PasswordChangeSection = ({
    t,
    isChangingPassword,
    currentPassword,
    newPassword,
    confirmPassword,
    passwordError,
    isSavingPassword,
    passwordChangeSuccess,
    onOpenPasswordChange,
    onClosePasswordChange,
    onCurrentPasswordChange,
    onNewPasswordChange,
    onConfirmPasswordChange,
    onSubmitPasswordChange,
}) => {
    const [visiblePasswordFields, setVisiblePasswordFields] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const togglePasswordVisibility = (field) =>
        setVisiblePasswordFields((prev) => ({ ...prev, [field]: !prev[field] }));

    return (
        <>
            <div className="pd-auth-row">
                <span className="pd-pref-label">{t.prefs.passwordLabel}</span>
                <span className="pd-password-dots">{"•".repeat(8)}</span>
                <button
                    type="button"
                    className="pd-verify-btn"
                    onClick={isChangingPassword ? onClosePasswordChange : onOpenPasswordChange}
                >
                    {getPasswordToggleLabel(isChangingPassword, passwordChangeSuccess, t)}
                </button>
            </div>

            {isChangingPassword && (
                <form
                    className="pd-password-inline"
                    onSubmit={(e) => {
                        e.preventDefault();
                        onSubmitPasswordChange();
                    }}
                >
                    <p className="pd-password-inline-title">{t.prefs.changePasswordTitle}</p>

                    <PasswordField
                        id="pd-current-password"
                        label={t.prefs.currentPassword}
                        value={currentPassword}
                        onChange={onCurrentPasswordChange}
                        autoComplete="current-password"
                        isVisible={visiblePasswordFields.current}
                        onToggleVisibility={() => togglePasswordVisibility("current")}
                        showLabel={t.prefs.showPassword}
                        hideLabel={t.prefs.hidePassword}
                    />

                    <PasswordField
                        id="pd-new-password"
                        label={t.prefs.newPassword}
                        value={newPassword}
                        onChange={onNewPasswordChange}
                        autoComplete="new-password"
                        isVisible={visiblePasswordFields.new}
                        onToggleVisibility={() => togglePasswordVisibility("new")}
                        showLabel={t.prefs.showPassword}
                        hideLabel={t.prefs.hidePassword}
                    />

                    <PasswordField
                        id="pd-confirm-password"
                        label={t.prefs.confirmPassword}
                        value={confirmPassword}
                        onChange={onConfirmPasswordChange}
                        autoComplete="new-password"
                        isVisible={visiblePasswordFields.confirm}
                        onToggleVisibility={() => togglePasswordVisibility("confirm")}
                        showLabel={t.prefs.showPassword}
                        hideLabel={t.prefs.hidePassword}
                    />

                    {passwordError && <p className="pd-field-error pd-password-error">{passwordError}</p>}
                    {passwordChangeSuccess && (
                        <p className="pd-password-success">{t.prefs.passwordChanged}</p>
                    )}

                    <div className="pd-password-inline-actions">
                        <button
                            type="submit"
                            className="pd-save-btn"
                            disabled={isSavingPassword}
                        >
                            {isSavingPassword ? t.buttons.saving : t.prefs.savePassword}
                        </button>
                    </div>
                </form>
            )}
        </>
    );
};

PasswordChangeSection.propTypes = {
    t: PropTypes.shape({
        prefs: PropTypes.object.isRequired,
        buttons: PropTypes.object.isRequired,
    }).isRequired,
    isChangingPassword: PropTypes.bool.isRequired,
    currentPassword: PropTypes.string.isRequired,
    newPassword: PropTypes.string.isRequired,
    confirmPassword: PropTypes.string.isRequired,
    passwordError: PropTypes.string,
    isSavingPassword: PropTypes.bool.isRequired,
    passwordChangeSuccess: PropTypes.bool.isRequired,
    onOpenPasswordChange: PropTypes.func.isRequired,
    onClosePasswordChange: PropTypes.func.isRequired,
    onCurrentPasswordChange: PropTypes.func.isRequired,
    onNewPasswordChange: PropTypes.func.isRequired,
    onConfirmPasswordChange: PropTypes.func.isRequired,
    onSubmitPasswordChange: PropTypes.func.isRequired,
};

export default PasswordChangeSection;
