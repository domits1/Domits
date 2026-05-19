import React, { useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import standardAvatar from "../../../../images/standard.png";
import { normalizeImageUrl } from "../../../guestdashboard/utils/image";
import {
    optionShape,
    countryCodeShape,
    authStatusShape,
    userShape,
    tempUserShape,
    refShape,
} from "../../../../components/settings/propTypes";

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

function getSaveLabel(isSaving, saveSuccess) {
    if (isSaving) return "Saving...";
    if (saveSuccess) return "Saved!";
    return "Save changes";
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
}) => (
    <div className="personal-data-page">
        <nav className="personal-data-breadcrumb">
            <Link to="/hostdashboard/settings">Settings</Link>
            <span className="personal-data-breadcrumb-sep">/</span>
            <span className="personal-data-breadcrumb-current">Personal Data</span>
        </nav>

        <header className="personal-data-header">
            <h1 className="personal-data-title">Personal Information</h1>
            <p className="personal-data-subtitle">
                Manage your personal profile information and account preferences.
            </p>
        </header>

        <section className="personal-data-section">
            <h2 className="personal-data-section-title">Profile</h2>
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
                                {isUploadingPhoto ? "Working..." : "Upload"}
                            </button>
                            <button
                                type="button"
                                onClick={onPhotoRemove}
                                className="pd-photo-btn pd-photo-btn--secondary"
                                disabled={isUploadingPhoto || !user.picture}
                            >
                                Remove
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
                            <label className="pd-field-label" htmlFor="pd-name">Full name</label>
                            <input
                                id="pd-name"
                                type="text"
                                name="name"
                                value={tempUser.name || ""}
                                onChange={onInputChange}
                                className="pd-field-input"
                                placeholder="Full name"
                            />
                        </div>

                        <div className="pd-field">
                            <label className="pd-field-label" htmlFor="pd-title">Title</label>
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
                                            {opt || "Select title"}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pd-field">
                            <label className="pd-field-label" htmlFor="pd-email">Email</label>
                            {isVerifying ? (
                                <div className="pd-verify-row">
                                    <input
                                        id="pd-email-code"
                                        type="text"
                                        name="verificationCode"
                                        value={verificationCode}
                                        onChange={onVerificationInputChange}
                                        className="pd-field-input"
                                        placeholder="Verification code sent to your email"
                                    />
                                    <button
                                        type="button"
                                        className="pd-verify-btn"
                                        onClick={onVerifyEmail}
                                    >
                                        Verify
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
                                    placeholder="Email address"
                                />
                            )}
                        </div>

                        <div className="pd-field">
                            <label className="pd-field-label" htmlFor="pd-phone">Phone</label>
                            <PhoneField
                                countryCodes={countryCodes}
                                selectedCountryCode={selectedCountryCode}
                                onCountryCodeChange={onCountryCodeChange}
                                stripPhone={stripPhone}
                                onPhoneChange={onPhoneChange}
                            />
                        </div>

                        <div className="pd-field">
                            <label className="pd-field-label" htmlFor="pd-sex">Sex</label>
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
                                            {opt || "Select sex"}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pd-field">
                            <label className="pd-field-label" htmlFor="pd-dob">Date of birth</label>
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
                            <label className="pd-field-label" htmlFor="pd-pob">Place of birth</label>
                            <div className="pd-select-wrapper">
                                <select
                                    id="pd-pob"
                                    name="placeOfBirth"
                                    value={tempUser.placeOfBirth || ""}
                                    onChange={onInputChange}
                                    className="pd-field-input pd-field-select"
                                >
                                    <option value="">Country</option>
                                    {placeOfBirthOptions.map((country) => (
                                        <option key={country} value={country}>
                                            {country}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pd-field">
                            <label className="pd-field-label" htmlFor="pd-nationality">Nationality</label>
                            <div className="pd-select-wrapper">
                                <select
                                    id="pd-nationality"
                                    name="nationality"
                                    value={tempUser.nationality || ""}
                                    onChange={onInputChange}
                                    className="pd-field-input pd-field-select"
                                >
                                    <option value="">Nationality</option>
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
                        {getSaveLabel(isSaving, saveSuccess)}
                    </button>
                </div>
            </div>
        </section>

        <section className="personal-data-section">
            <h2 className="personal-data-section-title">Preferences / Authentication</h2>
            <div className="personal-data-card personal-data-pref-card">
                <div className="pd-pref-row">
                    <span className="pd-pref-label">Default language</span>
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
                    <span className="pd-pref-label">Email</span>
                    <span className={`pd-status-pill ${authStatus.emailVerified ? "pd-status-pill--active" : "pd-status-pill--inactive"}`}>
                        {authStatus.emailVerified ? "Active" : "Inactive"}
                    </span>
                    {authStatus.emailVerified && (
                        <span className="pd-verified-check">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                <path d="M3 8l3.5 3.5L13 5" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Verified
                        </span>
                    )}
                </div>

                {showAuthMfa && (
                    <>
                        <div className="pd-auth-row">
                            <span className="pd-pref-label">SMS</span>
                            <span className={`pd-status-pill ${authStatus.preferredMFA === "SMS" ? "pd-status-pill--active" : "pd-status-pill--inactive"}`}>
                                {authStatus.preferredMFA === "SMS" ? "Active" : "Inactive"}
                            </span>
                            <span className="pd-auth-subtext">
                                Phone verified: {authStatus.phoneVerified ? "Yes" : "No"}
                            </span>
                        </div>

                        <div className="pd-auth-row">
                            <span className="pd-pref-label">Authenticator app</span>
                            <span className={`pd-status-pill ${authStatus.preferredMFA === "TOTP" ? "pd-status-pill--active" : "pd-status-pill--inactive"}`}>
                                {authStatus.preferredMFA === "TOTP" ? "Active" : "Inactive"}
                            </span>
                            <span className="pd-auth-subtext">App-based codes (TOTP)</span>
                        </div>
                    </>
                )}
            </div>
        </section>
    </div>
);

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
};

export default PersonalDataForm;
