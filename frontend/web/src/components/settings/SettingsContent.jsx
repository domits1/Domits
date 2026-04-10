import React from "react";
import PropTypes from "prop-types";
import { normalizeImageUrl } from "../../features/guestdashboard/utils/image";
import standardAvatar from "../../images/standard.png";
import {
    optionShape,
    countryCodeShape,
    authStatusShape,
    userShape,
    tempUserShape,
    editStateShape,
    refShape,
} from "./propTypes";

const SettingsContent = ({
    user,
    tempUser,
    verificationCode,
    isVerifying,
    selectedCountryCode,
    stripPhone,
    dateOfBirthError,
    photoError,
    isUploadingPhoto,
    nationalityError,
    authStatus,
    language,
    dateFormat,
    priceFormat,
    photoInputRef,
    languageOptions,
    dateFormatOptions,
    priceFormatOptions,
    countryCodes,
    titleOptions,
    sexOptions,
    placeOfBirthOptions,
    onPhotoButtonClick,
    onPhotoRemove,
    onPhotoInputChange,
    onTitleChange,
    onInputChange,
    onVerificationInputChange,
    onKeyPressName,
    onKeyPressEmail,
    onKeyPressPhone,
    onKeyPressDateOfBirth,
    onKeyPressNationality,
    onCountryCodeChange,
    onPhoneChange,
    onSexChange,
    onDateOfBirthChange,
    onLanguageChange,
    onDateFormatChange,
    onPriceFormatChange,
    onSaveUserName,
}) => (
    <div className="personalInfoContent">
        <h3>Personal Information</h3>
        <p>Manage your personal profile information and account preferences.</p>

        <div className="profileGrid">
            <div className="profileLeft">
                <div className="profile-photo-box">
                    <img
                        src={user.picture ? normalizeImageUrl(user.picture) : standardAvatar}
                        alt="Profile"
                        className="profile-photo-image"
                    />
                    <button onClick={onPhotoButtonClick} disabled={isUploadingPhoto}>
                        {isUploadingPhoto ? "Working..." : "Upload"}
                    </button>
                    <button onClick={onPhotoRemove} disabled={isUploadingPhoto || !user.picture}>
                        Remove
                    </button>
                    {photoError && <p className="field-error">{photoError}</p>}
                </div>
                <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onPhotoInputChange}
                    style={{ display: "none" }}
                />
            </div>

            <div className="profileRight">
                <div className="formRow">
                    <label>Full name</label>
                    <input
                        type="text"
                        name="name"
                        value={tempUser.name || ""}
                        onChange={onInputChange}
                        onKeyPress={onKeyPressName}
                    />
                </div>

                <div className="formRow">
                    <label>Title</label>
                    <select name="title" value={user.title || ""} onChange={onTitleChange}>
                        {(titleOptions || []).map((opt) => (
                            <option key={opt || "empty"} value={opt}>
                                {opt || "Select title"}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="formRow">
                    <label>Email</label>
                    {isVerifying ? (
                        <input
                            type="text"
                            name="verificationCode"
                            value={verificationCode || ""}
                            onChange={onVerificationInputChange}
                            onKeyPress={onKeyPressEmail}
                        />
                    ) : (
                        <input
                            type="email"
                            name="email"
                            value={tempUser.email || ""}
                            onChange={onInputChange}
                            onKeyPress={onKeyPressEmail}
                        />
                    )}
                </div>

                <div className="formRow">
                    <label>Phone</label>
                    <div className="phoneRow">
                        <select value={selectedCountryCode || ""} onChange={onCountryCodeChange}>
                            {(countryCodes || []).map((c) => (
                                <option key={c.code} value={c.code}>
                                    {c.name} ({c.code})
                                </option>
                            ))}
                        </select>
                        <input
                            type="text"
                            name="phone"
                            value={stripPhone || ""}
                            onChange={onPhoneChange}
                            onKeyPress={onKeyPressPhone}
                        />
                    </div>
                </div>

                <div className="formRow">
                    <label>Sex</label>
                    <select value={user.sex || ""} onChange={onSexChange}>
                        {(sexOptions || []).map((opt) => (
                            <option key={opt || "empty"} value={opt}>
                                {opt || "Select sex"}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="formRow">
                    <label>Date of birth</label>
                    <input
                        type="text"
                        name="dateOfBirth"
                        value={tempUser.dateOfBirth || ""}
                        onChange={onDateOfBirthChange}
                        onKeyPress={onKeyPressDateOfBirth}
                    />
                    {dateOfBirthError && <p className="field-error">{dateOfBirthError}</p>}
                </div>

                <div className="formRow">
                    <label>Place of birth</label>
                    <select
                        name="placeOfBirth"
                        value={tempUser.placeOfBirth || ""}
                        onChange={onInputChange}
                    >
                        <option value="">Select country</option>
                        {(placeOfBirthOptions || []).map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="formRow">
                    <label>Nationality</label>
                    <input
                        type="text"
                        name="nationality"
                        value={tempUser.nationality || ""}
                        onChange={onInputChange}
                        onKeyPress={onKeyPressNationality}
                    />
                    {nationalityError && <p className="field-error">{nationalityError}</p>}
                </div>

                <button className="saveBtn" onClick={onSaveUserName}>
                    Save changes
                </button>
            </div>
        </div>

        <div className="preferencesSection">
            <h3>Preferences / Authentication</h3>

            <div className="preferencesGrid">
                <div className="formRow">
                    <label>Default language</label>
                    <select value={language || ""} onChange={onLanguageChange}>
                        {(languageOptions || []).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="authRow">
                    <span>Email</span>
                    <span className={`status-pill ${authStatus?.emailVerified ? "is-active" : ""}`}>
                        {authStatus?.emailVerified ? "Active" : "Inactive"}
                    </span>
                </div>
            </div>
        </div>
    </div>
);

SettingsContent.propTypes = {
    user: userShape.isRequired,
    tempUser: tempUserShape.isRequired,
    editState: editStateShape,
    verificationCode: PropTypes.string,
    isVerifying: PropTypes.bool,
    selectedCountryCode: PropTypes.string,
    stripPhone: PropTypes.string,
    dateOfBirthError: PropTypes.string,
    photoError: PropTypes.string,
    isUploadingPhoto: PropTypes.bool,
    nationalityError: PropTypes.string,
    authStatus: authStatusShape,
    language: PropTypes.string,
    dateFormat: PropTypes.string,
    priceFormat: PropTypes.string,
    photoInputRef: refShape,
    languageOptions: PropTypes.arrayOf(optionShape),
    dateFormatOptions: PropTypes.arrayOf(optionShape),
    priceFormatOptions: PropTypes.arrayOf(optionShape),
    countryCodes: PropTypes.arrayOf(countryCodeShape),
    titleOptions: PropTypes.arrayOf(PropTypes.string),
    sexOptions: PropTypes.arrayOf(PropTypes.string),
    placeOfBirthOptions: PropTypes.arrayOf(PropTypes.string),
    onPhotoButtonClick: PropTypes.func,
    onPhotoRemove: PropTypes.func,
    onPhotoInputChange: PropTypes.func,
    onTitleChange: PropTypes.func,
    onInputChange: PropTypes.func,
    onVerificationInputChange: PropTypes.func,
    onKeyPressName: PropTypes.func,
    onKeyPressEmail: PropTypes.func,
    onKeyPressPhone: PropTypes.func,
    onKeyPressDateOfBirth: PropTypes.func,
    onKeyPressNationality: PropTypes.func,
    onCountryCodeChange: PropTypes.func,
    onPhoneChange: PropTypes.func,
    onSexChange: PropTypes.func,
    onDateOfBirthChange: PropTypes.func,
    onLanguageChange: PropTypes.func,
    onDateFormatChange: PropTypes.func,
    onPriceFormatChange: PropTypes.func,
    onSaveUserName: PropTypes.func,
};

export default SettingsContent;