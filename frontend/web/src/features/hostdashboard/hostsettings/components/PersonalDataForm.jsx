import React, { useRef, useEffect, useContext, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import standardAvatar from "../../../../images/standard.png";
import { normalizeImageUrl } from "../../../guestdashboard/utils/image";
import { LanguageContext } from "../../../../context/LanguageContext";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import de from "../../../../content/de.json";
import es from "../../../../content/es.json";
import {
    optionShape,
    countryCodeShape,
    authStatusShape,
    userShape,
    tempUserShape,
    refShape,
} from "../../../../components/settings/propTypes";

const contentByLanguage = { en, nl, de, es };

const PhoneField = ({ countryCodes, selectedCountryCode, onCountryCodeChange, stripPhone, onPhoneChange }) => {
    const selectRef = useRef(null);

    useEffect(() => {
        const select = selectRef.current;
        if (!select) return;
        const text = select.options[select.selectedIndex]?.text || "";
        const sizer = document.createElement("span");
        sizer.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;font-size:0.9rem;padding:0 32px 0 12px;";
        sizer.textContent = text;
        document.body.appendChild(sizer);
        select.style.width = `${sizer.offsetWidth + 2}px`;
        sizer.remove();
    }, [selectedCountryCode]);

    return (
        <div className="pd-phone-row">
            <select
                ref={selectRef}
                value={selectedCountryCode}
                onChange={onCountryCodeChange}
                className="pd-field-input pd-phone-code"
                aria-label="Country code"
            >
                {countryCodes.map((c) => (
                    <option key={c.code} value={c.code}>
                        {c.name} ({c.code})
                    </option>
                ))}
            </select>
            <input
                id="pd-phone"
                type="text"
                name="phone"
                value={stripPhone || ""}
                onChange={onPhoneChange}
                className="pd-field-input pd-phone-number"
                placeholder="Phone number"
            />
        </div>
    );
};

PhoneField.propTypes = {
    countryCodes: PropTypes.arrayOf(countryCodeShape).isRequired,
    selectedCountryCode: PropTypes.string.isRequired,
    onCountryCodeChange: PropTypes.func.isRequired,
    stripPhone: PropTypes.string.isRequired,
    onPhoneChange: PropTypes.func.isRequired,
};

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

function getSaveLabel(isSaving, saveSuccess, t) {
    if (isSaving) return t.buttons.saving;
    if (saveSuccess) return t.buttons.saved;
    return t.buttons.save;
}

function getPasswordToggleLabel(isChangingPassword, passwordChangeSuccess, t) {
    if (!isChangingPassword) return t.prefs.changePassword;
    return passwordChangeSuccess ? t.buttons.close : t.buttons.cancel;
}

const PersonalDataForm = ({
    user,
    tempUser,
    isUploadingPhoto,
    photoError,
    photoInputRef,
    onPhotoButtonClick,
    onPhotoRemove,
    onPhotoInputChange,
    titleOptions,
    sexOptions,
    placeOfBirthOptions,
    countryCodes,
    selectedCountryCode,
    stripPhone,
    dateOfBirthError,
    nationalityError,
    isVerifying,
    verificationCode,
    onTitleChange,
    onInputChange,
    onSexChange,
    onCountryCodeChange,
    onPhoneChange,
    onDateOfBirthChange,
    onVerificationInputChange,
    onSaveAll,
    isSaving,
    saveSuccess,
    onVerifyEmail,
    language,
    languageOptions,
    onLanguageChange,
    dateFormat,
    dateFormatOptions,
    onDateFormatChange,
    priceFormat,
    priceFormatOptions,
    onPriceFormatChange,
    showPrefFormats,
    showAuthMfa,
    authStatus,
    breadcrumbPath,
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
    const { language: lang } = useContext(LanguageContext);
    const t = contentByLanguage[lang]?.settings?.personalData ?? contentByLanguage.en.settings.personalData;
    const [visiblePasswordFields, setVisiblePasswordFields] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const togglePasswordVisibility = (field) =>
        setVisiblePasswordFields((prev) => ({ ...prev, [field]: !prev[field] }));

    return (
    <div className="personal-data-page">
        {breadcrumbPath && (
            <nav className="personal-data-breadcrumb">
                <Link to={breadcrumbPath}>{t.hub?.breadcrumb ?? "Settings"}</Link>
                <span className="personal-data-breadcrumb-sep">/</span>
                <span className="personal-data-breadcrumb-current">{t.breadcrumb}</span>
            </nav>
        )}

        <header className="personal-data-header">
            <h1 className="personal-data-title">{t.title}</h1>
            <p className="personal-data-subtitle">{t.subtitle}</p>
        </header>

        <section className="personal-data-section">
            <h2 className="personal-data-section-title">{t.profileSection}</h2>
            <div className="personal-data-card">
                <div className="personal-data-card-inner">
                    <div className="personal-data-photo-col">
                        <img
                            src={user.picture ? normalizeImageUrl(user.picture) : standardAvatar}
                            alt="Profile"
                            className="personal-data-photo"
                        />
                        <div className="personal-data-photo-actions">
                            <button
                                type="button"
                                onClick={onPhotoButtonClick}
                                className="pd-photo-btn pd-photo-btn--primary"
                                disabled={isUploadingPhoto}
                            >
                                {isUploadingPhoto ? t.photo.uploading : t.photo.upload}
                            </button>
                            <button
                                type="button"
                                onClick={onPhotoRemove}
                                className="pd-photo-btn pd-photo-btn--secondary"
                                disabled={isUploadingPhoto || !user.picture}
                            >
                                {t.photo.remove}
                            </button>
                        </div>
                        {photoError && <p className="pd-field-error">{photoError}</p>}
                        <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={onPhotoInputChange}
                            style={{ display: "none" }}
                            aria-label="Upload profile photo"
                        />
                    </div>

                    <div className="personal-data-fields-col">
                        <div className="pd-field">
                            <label className="pd-field-label" htmlFor="pd-first-name">{t.fields.firstName}</label>
                            <input
                                id="pd-first-name"
                                type="text"
                                name="firstName"
                                value={tempUser.firstName || ""}
                                onChange={onInputChange}
                                className="pd-field-input"
                                placeholder={t.fields.firstName}
                            />
                        </div>

                        <div className="pd-field">
                            <label className="pd-field-label" htmlFor="pd-last-name">{t.fields.lastName}</label>
                            <input
                                id="pd-last-name"
                                type="text"
                                name="lastName"
                                value={tempUser.lastName || ""}
                                onChange={onInputChange}
                                className="pd-field-input"
                                placeholder={t.fields.lastName}
                            />
                        </div>

                        <div className="pd-field">
                            <label className="pd-field-label" htmlFor="pd-title">{t.fields.title}</label>
                            <div className="pd-select-wrapper">
                                <select
                                    id="pd-title"
                                    name="title"
                                    value={tempUser.title || ""}
                                    onChange={onTitleChange}
                                    className="pd-field-input pd-field-select"
                                >
                                    {titleOptions.map((opt) => (
                                        <option key={opt || "empty"} value={opt}>
                                            {opt || t.fields.selectTitle}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pd-field">
                            <label className="pd-field-label" htmlFor="pd-email">{t.fields.email}</label>
                            {isVerifying ? (
                                <div className="pd-verify-row">
                                    <input
                                        id="pd-email-code"
                                        type="text"
                                        name="verificationCode"
                                        value={verificationCode}
                                        onChange={onVerificationInputChange}
                                        className="pd-field-input"
                                        placeholder={t.fields.verificationCode}
                                    />
                                    <button
                                        type="button"
                                        className="pd-verify-btn"
                                        onClick={onVerifyEmail}
                                    >
                                        {t.fields.verify}
                                    </button>
                                </div>
                            ) : (
                                <input
                                    id="pd-email"
                                    type="email"
                                    name="email"
                                    value={tempUser.email || ""}
                                    onChange={onInputChange}
                                    className="pd-field-input"
                                    placeholder={t.fields.emailAddress}
                                />
                            )}
                        </div>

                        <div className="pd-field">
                            <label className="pd-field-label" htmlFor="pd-phone">{t.fields.phone}</label>
                            <PhoneField
                                countryCodes={countryCodes}
                                selectedCountryCode={selectedCountryCode}
                                onCountryCodeChange={onCountryCodeChange}
                                stripPhone={stripPhone}
                                onPhoneChange={onPhoneChange}
                                placeholder={t.fields.phoneNumber}
                            />
                        </div>

                        <div className="pd-field">
                            <label className="pd-field-label" htmlFor="pd-sex">{t.fields.sex}</label>
                            <div className="pd-select-wrapper">
                                <select
                                    id="pd-sex"
                                    name="sex"
                                    value={tempUser.sex || ""}
                                    onChange={onSexChange}
                                    className="pd-field-input pd-field-select"
                                >
                                    {sexOptions.map((opt) => (
                                        <option key={opt || "empty"} value={opt}>
                                            {opt || t.fields.selectSex}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pd-field">
                            <label className="pd-field-label" htmlFor="pd-dob">{t.fields.dateOfBirth}</label>
                            <input
                                id="pd-dob"
                                type="text"
                                name="dateOfBirth"
                                value={tempUser.dateOfBirth || ""}
                                onChange={onDateOfBirthChange}
                                className="pd-field-input"
                                placeholder="DD-MM-YYYY"
                                inputMode="numeric"
                            />
                            {dateOfBirthError && <p className="pd-field-error">{dateOfBirthError}</p>}
                        </div>

                        <div className="pd-field">
                            <label className="pd-field-label" htmlFor="pd-pob">{t.fields.placeOfBirth}</label>
                            <div className="pd-select-wrapper">
                                <select
                                    id="pd-pob"
                                    name="placeOfBirth"
                                    value={tempUser.placeOfBirth || ""}
                                    onChange={onInputChange}
                                    className="pd-field-input pd-field-select"
                                >
                                    <option value="">{t.fields.country}</option>
                                    {placeOfBirthOptions.map((country) => (
                                        <option key={country} value={country}>
                                            {country}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pd-field">
                            <label className="pd-field-label" htmlFor="pd-nationality">{t.fields.nationality}</label>
                            <div className="pd-select-wrapper">
                                <select
                                    id="pd-nationality"
                                    name="nationality"
                                    value={tempUser.nationality || ""}
                                    onChange={onInputChange}
                                    className="pd-field-input pd-field-select"
                                >
                                    <option value="">{t.fields.nationality}</option>
                                    {placeOfBirthOptions.map((country) => (
                                        <option key={country} value={country}>
                                            {country}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {nationalityError && <p className="pd-field-error">{nationalityError}</p>}
                        </div>
                    </div>
                </div>

                <div className="personal-data-card-footer">
                    <button
                        type="button"
                        className={`pd-save-btn${saveSuccess ? " pd-save-btn--saved" : ""}`}
                        onClick={onSaveAll}
                        disabled={isSaving}
                    >
                        {getSaveLabel(isSaving, saveSuccess, t)}
                    </button>
                </div>
            </div>
        </section>

        <section className="personal-data-section">
            <h2 className="personal-data-section-title">{t.prefsSection}</h2>
            <div className="personal-data-card personal-data-pref-card">
                <div className="pd-pref-row">
                    <span className="pd-pref-label">{t.prefs.defaultLanguage}</span>
                    <select
                        name="defaultLanguage"
                        value={language}
                        onChange={onLanguageChange}
                        className="pd-field-input pd-pref-select"
                    >
                        {languageOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {showPrefFormats && (
                    <>
                        <div className="pd-pref-row">
                            <span className="pd-pref-label">Date format</span>
                            <select
                                name="dateFormat"
                                value={dateFormat}
                                onChange={onDateFormatChange}
                                className="pd-field-input pd-pref-select"
                            >
                                {dateFormatOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="pd-pref-row">
                            <span className="pd-pref-label">Price format</span>
                            <select
                                name="priceFormat"
                                value={priceFormat}
                                onChange={onPriceFormatChange}
                                className="pd-field-input pd-pref-select"
                            >
                                {priceFormatOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </>
                )}

                <div className="pd-auth-row">
                    <span className="pd-pref-label">{t.prefs.emailLabel}</span>
                    <span className={`pd-status-pill ${authStatus.emailVerified ? "pd-status-pill--active" : "pd-status-pill--inactive"}`}>
                        {authStatus.emailVerified ? t.prefs.active : t.prefs.inactive}
                    </span>
                    {authStatus.emailVerified && (
                        <span className="pd-verified-check">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                <path d="M3 8l3.5 3.5L13 5" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {t.prefs.verified}
                        </span>
                    )}
                </div>

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

                {showAuthMfa && (
                    <>
                        <div className="pd-auth-row">
                            <span className="pd-pref-label">{t.prefs.sms}</span>
                            <span className={`pd-status-pill ${authStatus.preferredMFA === "SMS" ? "pd-status-pill--active" : "pd-status-pill--inactive"}`}>
                                {authStatus.preferredMFA === "SMS" ? t.prefs.active : t.prefs.inactive}
                            </span>
                            <span className="pd-auth-subtext">
                                {authStatus.phoneVerified ? t.prefs.phoneVerifiedYes : t.prefs.phoneVerifiedNo}
                            </span>
                        </div>

                        <div className="pd-auth-row">
                            <span className="pd-pref-label">{t.prefs.authenticatorApp}</span>
                            <span className={`pd-status-pill ${authStatus.preferredMFA === "TOTP" ? "pd-status-pill--active" : "pd-status-pill--inactive"}`}>
                                {authStatus.preferredMFA === "TOTP" ? t.prefs.active : t.prefs.inactive}
                            </span>
                            <span className="pd-auth-subtext">{t.prefs.totp}</span>
                        </div>
                    </>
                )}
            </div>
        </section>
    </div>
    );
};

PersonalDataForm.propTypes = {
    user: userShape.isRequired,
    tempUser: tempUserShape.isRequired,
    isUploadingPhoto: PropTypes.bool.isRequired,
    photoError: PropTypes.string,
    photoInputRef: refShape.isRequired,
    onPhotoButtonClick: PropTypes.func.isRequired,
    onPhotoRemove: PropTypes.func.isRequired,
    onPhotoInputChange: PropTypes.func.isRequired,
    titleOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
    sexOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
    placeOfBirthOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
    countryCodes: PropTypes.arrayOf(countryCodeShape).isRequired,
    selectedCountryCode: PropTypes.string.isRequired,
    stripPhone: PropTypes.string.isRequired,
    dateOfBirthError: PropTypes.string,
    nationalityError: PropTypes.string,
    isVerifying: PropTypes.bool.isRequired,
    verificationCode: PropTypes.string.isRequired,
    onTitleChange: PropTypes.func.isRequired,
    onInputChange: PropTypes.func.isRequired,
    onSexChange: PropTypes.func.isRequired,
    onCountryCodeChange: PropTypes.func.isRequired,
    onPhoneChange: PropTypes.func.isRequired,
    onDateOfBirthChange: PropTypes.func.isRequired,
    onVerificationInputChange: PropTypes.func.isRequired,
    onSaveAll: PropTypes.func.isRequired,
    isSaving: PropTypes.bool.isRequired,
    saveSuccess: PropTypes.bool.isRequired,
    onVerifyEmail: PropTypes.func.isRequired,
    language: PropTypes.string.isRequired,
    languageOptions: PropTypes.arrayOf(optionShape).isRequired,
    onLanguageChange: PropTypes.func.isRequired,
    dateFormat: PropTypes.string.isRequired,
    dateFormatOptions: PropTypes.arrayOf(optionShape).isRequired,
    onDateFormatChange: PropTypes.func.isRequired,
    priceFormat: PropTypes.string.isRequired,
    priceFormatOptions: PropTypes.arrayOf(optionShape).isRequired,
    onPriceFormatChange: PropTypes.func.isRequired,
    showPrefFormats: PropTypes.bool.isRequired,
    showAuthMfa: PropTypes.bool.isRequired,
    authStatus: authStatusShape.isRequired,
    breadcrumbPath: PropTypes.string,
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

export default PersonalDataForm;
