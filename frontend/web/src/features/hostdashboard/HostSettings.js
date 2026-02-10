import React, {useContext, useEffect, useMemo, useRef, useState} from "react";
import PropTypes from "prop-types";
import editIcon from "../../images/icons/edit-05.png";
import checkIcon from "../../images/icons/checkPng.png";
import {API, graphqlOperation, Auth} from "aws-amplify";
import {confirmEmailChange} from "../guestdashboard/emailSettings";
import {normalizeImageUrl} from "../guestdashboard/utils/image";
import standardAvatar from "../../images/standard.png";
import {LanguageContext} from "../../context/LanguageContext";
import countryList from "react-select-country-list";
import './settingshostdashboard.css';

const optionShape = PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
});

const countryCodeShape = PropTypes.shape({
    code: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
});

const authStatusShape = PropTypes.shape({
    emailVerified: PropTypes.bool.isRequired,
    phoneVerified: PropTypes.bool.isRequired,
    preferredMFA: PropTypes.string.isRequired,
});

const userShape = PropTypes.shape({
    email: PropTypes.string,
    name: PropTypes.string,
    address: PropTypes.string,
    phone: PropTypes.string,
    family: PropTypes.string,
    title: PropTypes.string,
    dateOfBirth: PropTypes.string,
    placeOfBirth: PropTypes.string,
    sex: PropTypes.string,
    picture: PropTypes.string,
    nationality: PropTypes.string,
});

const tempUserShape = PropTypes.shape({
    email: PropTypes.string,
    name: PropTypes.string,
    phone: PropTypes.string,
    title: PropTypes.string,
    dateOfBirth: PropTypes.string,
    placeOfBirth: PropTypes.string,
    sex: PropTypes.string,
    picture: PropTypes.string,
    nationality: PropTypes.string,
});

const editStateShape = PropTypes.shape({
    email: PropTypes.bool,
    name: PropTypes.bool,
    phone: PropTypes.bool,
    dateOfBirth: PropTypes.bool,
    placeOfBirth: PropTypes.bool,
    nationality: PropTypes.bool,
});

const refShape = PropTypes.shape({
    current: PropTypes.any,
});

const HostSettingsLayout = ({children}) => (
    <div className="page-body host-settings-page">
        <h2>Settings</h2>
        <div className="dashboards">
            <div className="content">{children}</div>
        </div>
    </div>
);

const EditActionButtons = ({isEditing, onSave, onToggle, saveAlt, editAlt}) => (
    <div className="infoBoxActions">
        <div
            onClick={isEditing ? onSave : undefined}
            className={`host-icon-background save-button${isEditing ? "" : " is-hidden"}`}
            role="button"
        >
            <img src={checkIcon} alt={saveAlt} className="save-check-icon" />
        </div>
        <div
            onClick={onToggle}
            className={`host-icon-background edit-button${isEditing ? " is-active" : ""}`}
        >
            {isEditing ? (
                <span className="edit-x" aria-hidden="true">X</span>
            ) : (
                <img src={editIcon} alt={editAlt} className="guest-edit-icon" />
            )}
        </div>
    </div>
);

const EditableInfoBox = ({
    label,
    isEditing,
    editContent,
    displayContent,
    onSave,
    onToggle,
    saveAlt,
    editAlt,
}) => (
    <div className="InfoBox">
        <div className="infoBoxText">
            <span>{label}</span>
            {isEditing ? editContent : displayContent}
        </div>
        <EditActionButtons
            isEditing={isEditing}
            onSave={onSave}
            onToggle={onToggle}
            saveAlt={saveAlt}
            editAlt={editAlt}
        />
    </div>
);

const ProfilePhotoBox = ({
    userPicture,
    isUploadingPhoto,
    photoError,
    onPhotoButtonClick,
    onPhotoRemove,
    onPhotoInputChange,
    photoInputRef,
}) => (
    <>
        <div className="InfoBox profile-photo-box">
            <div className="infoBoxText">
                <span>Profile photo:</span>
                <div className="profile-photo-row">
                    <img
                        src={userPicture ? normalizeImageUrl(userPicture) : standardAvatar}
                        alt="Profile"
                        className="profile-photo-image"
                    />
                    <div className="profile-photo-actions">
                        <button
                            type="button"
                            onClick={onPhotoButtonClick}
                            className="photo-action primary"
                            disabled={isUploadingPhoto}
                        >
                            {isUploadingPhoto ? "Working..." : "Upload"}
                        </button>
                        <button
                            type="button"
                            onClick={onPhotoRemove}
                            className="photo-action danger"
                            disabled={isUploadingPhoto || !userPicture}
                        >
                            Remove
                        </button>
                    </div>
                </div>
                {photoError && (
                    <p className="field-error">{photoError}</p>
                )}
            </div>
        </div>
        <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={onPhotoInputChange}
            style={{ display: "none" }}
        />
    </>
);

const TitleField = ({value, options, onChange}) => (
    <div className="InfoBox">
        <div className="infoBoxText infoBoxText--row">
            <span>Title:</span>
            <div className="infoBoxEditRow">
                <select
                    name="title"
                    value={value}
                    onChange={onChange}
                    className="guest-edit-input"
                >
                    {options.map((option) => (
                        <option key={option || "empty"} value={option}>
                            {option || "Select title"}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    </div>
);

const NameField = ({
    isEditing,
    value,
    tempValue,
    onChange,
    onKeyPress,
    onSave,
    onToggle,
}) => (
    <EditableInfoBox
        label="Full name:"
        isEditing={isEditing}
        onSave={onSave}
        onToggle={onToggle}
        saveAlt="Save Name"
        editAlt="Edit Name"
        editContent={(
            <div className="infoBoxEditRow">
                <input
                    type="text"
                    name="name"
                    value={tempValue}
                    onChange={onChange}
                    className="guest-edit-input"
                    onKeyPress={onKeyPress}
                />
            </div>
        )}
        displayContent={<p>{value || "-"}</p>}
    />
);

const EmailField = ({
    isEditing,
    isVerifying,
    value,
    tempValue,
    verificationCode,
    onChange,
    onVerificationChange,
    onKeyPress,
    onSave,
    onToggle,
}) => (
    <EditableInfoBox
        label="Email:"
        isEditing={isEditing}
        onSave={onSave}
        onToggle={onToggle}
        saveAlt="Save Email"
        editAlt="Edit Email"
        editContent={(
            <div className="infoBoxEditRow">
                {isVerifying ? (
                    <input
                        type="text"
                        name="verificationCode"
                        value={verificationCode}
                        onChange={onVerificationChange}
                        placeholder="Code sent to your email!"
                        className="guest-edit-input"
                        onKeyPress={onKeyPress}
                    />
                ) : (
                    <input
                        type="email"
                        name="email"
                        value={tempValue}
                        onChange={onChange}
                        className="guest-edit-input"
                        onKeyPress={onKeyPress}
                    />
                )}
            </div>
        )}
        displayContent={<p>{value || "-"}</p>}
    />
);

const PhoneField = ({
    isEditing,
    value,
    countryCodes,
    selectedCountryCode,
    stripPhone,
    onCountryCodeChange,
    onPhoneChange,
    onKeyPress,
    onSave,
    onToggle,
}) => (
    <EditableInfoBox
        label="Phone:"
        isEditing={isEditing}
        onSave={onSave}
        onToggle={onToggle}
        saveAlt="Save Phone number"
        editAlt="Edit Phone number"
        editContent={(
            <div className="infoBoxEditRow">
                <select
                    value={selectedCountryCode}
                    onChange={onCountryCodeChange}
                    className="countryCodeDropdown"
                >
                    {countryCodes.map((country, index) => (
                        <option key={index} value={country.code}>
                            {country.name} ({country.code})
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    name="phone"
                    placeholder="Phone Number"
                    value={stripPhone}
                    onChange={onPhoneChange}
                    className="guest-edit-input"
                    onKeyPress={onKeyPress}
                />
            </div>
        )}
        displayContent={<p>{value || "-"}</p>}
    />
);

const SexField = ({value, options, onChange}) => (
    <div className="InfoBox">
        <div className="infoBoxText infoBoxText--row">
            <span>Sex:</span>
            <div className="infoBoxEditRow">
                <select
                    name="sex"
                    value={value}
                    onChange={onChange}
                    className="guest-edit-input"
                >
                    {options.map((option) => (
                        <option key={option || "empty"} value={option}>
                            {option || "Select sex"}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    </div>
);

const DateOfBirthField = ({
    isEditing,
    value,
    tempValue,
    error,
    onChange,
    onKeyPress,
    onSave,
    onToggle,
}) => (
    <EditableInfoBox
        label="Date of birth:"
        isEditing={isEditing}
        onSave={onSave}
        onToggle={onToggle}
        saveAlt="Save Date of Birth"
        editAlt="Edit Date of Birth"
        editContent={(
            <div className="infoBoxEditRow">
                <input
                    type="text"
                    name="dateOfBirth"
                    placeholder="DD-MM-YYYY"
                    value={tempValue}
                    onChange={onChange}
                    className="guest-edit-input"
                    onKeyPress={onKeyPress}
                    inputMode="numeric"
                />
                {error && (
                    <p className="field-error">{error}</p>
                )}
            </div>
        )}
        displayContent={value ? <p>{value}</p> : <p className="placeholder-text">DD-MM-YYYY</p>}
    />
);

const PlaceOfBirthField = ({
    isEditing,
    value,
    tempValue,
    options,
    onChange,
    onSave,
    onToggle,
}) => (
    <EditableInfoBox
        label="Place of birth:"
        isEditing={isEditing}
        onSave={onSave}
        onToggle={onToggle}
        saveAlt="Save Place of Birth"
        editAlt="Edit Place of Birth"
        editContent={(
            <div className="infoBoxEditRow">
                <select
                    name="placeOfBirth"
                    value={tempValue}
                    onChange={onChange}
                    className="guest-edit-input"
                >
                    <option value="">Select country</option>
                    {options.map((country) => (
                        <option key={country} value={country}>
                            {country}
                        </option>
                    ))}
                </select>
            </div>
        )}
        displayContent={
            value ? <p>{value}</p> : <p className="placeholder-text">Country</p>
        }
    />
);

const NationalityField = ({
    isEditing,
    value,
    tempValue,
    error,
    onChange,
    onKeyPress,
    onSave,
    onToggle,
}) => (
    <EditableInfoBox
        label="Nationality:"
        isEditing={isEditing}
        onSave={onSave}
        onToggle={onToggle}
        saveAlt="Save Nationality"
        editAlt="Edit Nationality"
        editContent={(
            <div className="infoBoxEditRow">
                <input
                    type="text"
                    name="nationality"
                    placeholder="e.g. Dutch"
                    value={tempValue}
                    onChange={onChange}
                    className="guest-edit-input"
                    onKeyPress={onKeyPress}
                />
                {error && (
                    <p className="field-error">{error}</p>
                )}
            </div>
        )}
        displayContent={
            value ? <p>{value}</p> : <p className="placeholder-text">Nationality</p>
        }
    />
);

const PreferencesSection = ({
    language,
    languageOptions,
    onLanguageChange,
    showPrefFormats,
    dateFormat,
    priceFormat,
    dateFormatOptions,
    priceFormatOptions,
    onDateFormatChange,
    onPriceFormatChange,
}) => (
    <div className="preferencesSection">
        <h3>Preferences</h3>

        <div className="InfoBox">
            <div className="infoBoxText infoBoxText--row">
                <span>Default language:</span>
                <div className="infoBoxEditRow">
                    <select
                        name="defaultLanguage"
                        value={language}
                        onChange={onLanguageChange}
                        className="guest-edit-input"
                    >
                        {languageOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>

        {showPrefFormats && (
            <>
                <div className="InfoBox">
                    <div className="infoBoxText infoBoxText--row">
                        <span>Date format:</span>
                        <div className="infoBoxEditRow">
                            <select
                                name="dateFormat"
                                value={dateFormat}
                                onChange={onDateFormatChange}
                                className="guest-edit-input"
                            >
                                {dateFormatOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="InfoBox">
                    <div className="infoBoxText infoBoxText--row">
                        <span>Price format:</span>
                        <div className="infoBoxEditRow">
                            <select
                                name="priceFormat"
                                value={priceFormat}
                                onChange={onPriceFormatChange}
                                className="guest-edit-input"
                            >
                                {priceFormatOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </>
        )}
    </div>
);

const AuthenticationSection = ({authStatus, showAuthMfa}) => (
    <div className="preferencesSection authSection">
        <h3>Authentication</h3>

        <div className="InfoBox">
            <div className="infoBoxText">
                <div className="infoBoxTextRow">
                    <span>Email</span>
                    <span className={`status-pill ${authStatus.emailVerified ? "is-active" : "is-inactive"}`}>
                        {authStatus.emailVerified ? "Active" : "Inactive"}
                    </span>
                </div>
                <p className="auth-subtext">
                    {authStatus.emailVerified ? "Verified" : "Not verified"}
                </p>
            </div>
        </div>

        {showAuthMfa && (
            <>
                <div className="InfoBox">
                    <div className="infoBoxText">
                        <div className="infoBoxTextRow">
                            <span>SMS</span>
                            <span className={`status-pill ${authStatus.preferredMFA === "SMS" ? "is-active" : "is-inactive"}`}>
                                {authStatus.preferredMFA === "SMS" ? "Active" : "Inactive"}
                            </span>
                        </div>
                        <p className="auth-subtext">
                            Phone verified: {authStatus.phoneVerified ? "Yes" : "No"}
                        </p>
                    </div>
                </div>

                <div className="InfoBox">
                    <div className="infoBoxText">
                        <div className="infoBoxTextRow">
                            <span>Authenticator app</span>
                            <span className={`status-pill ${authStatus.preferredMFA === "TOTP" ? "is-active" : "is-inactive"}`}>
                                {authStatus.preferredMFA === "TOTP" ? "Active" : "Inactive"}
                            </span>
                        </div>
                        <p className="auth-subtext">App-based codes (TOTP)</p>
                    </div>
                </div>
            </>
        )}
    </div>
);

const HostSettingsContent = ({
    user,
    tempUser,
    editState,
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
    onSaveUserEmail,
    onSaveUserPhone,
    onSaveUserDateOfBirth,
    onSaveUserPlaceOfBirth,
    onSaveUserNationality,
    onToggleEditState,
    showPrefFormats,
    showAuthMfa,
}) => (
    <div className="personalInfoContent">
        <h3>Personal Information</h3>
        <ProfilePhotoBox
            userPicture={user.picture}
            isUploadingPhoto={isUploadingPhoto}
            photoError={photoError}
            onPhotoButtonClick={onPhotoButtonClick}
            onPhotoRemove={onPhotoRemove}
            onPhotoInputChange={onPhotoInputChange}
            photoInputRef={photoInputRef}
        />
        <TitleField value={user.title} options={titleOptions} onChange={onTitleChange} />
        <NameField
            isEditing={editState.name}
            value={user.name}
            tempValue={tempUser.name}
            onChange={onInputChange}
            onKeyPress={onKeyPressName}
            onSave={onSaveUserName}
            onToggle={() => onToggleEditState("name")}
        />
        <EmailField
            isEditing={editState.email}
            isVerifying={isVerifying}
            value={user.email}
            tempValue={tempUser.email}
            verificationCode={verificationCode}
            onChange={onInputChange}
            onVerificationChange={onVerificationInputChange}
            onKeyPress={onKeyPressEmail}
            onSave={onSaveUserEmail}
            onToggle={() => onToggleEditState("email")}
        />
        <PhoneField
            isEditing={editState.phone}
            value={user.phone}
            countryCodes={countryCodes}
            selectedCountryCode={selectedCountryCode}
            stripPhone={stripPhone}
            onCountryCodeChange={onCountryCodeChange}
            onPhoneChange={onPhoneChange}
            onKeyPress={onKeyPressPhone}
            onSave={onSaveUserPhone}
            onToggle={() => onToggleEditState("phone")}
        />
        <SexField value={user.sex} options={sexOptions} onChange={onSexChange} />
        <DateOfBirthField
            isEditing={editState.dateOfBirth}
            value={user.dateOfBirth}
            tempValue={tempUser.dateOfBirth}
            error={dateOfBirthError}
            onChange={onDateOfBirthChange}
            onKeyPress={onKeyPressDateOfBirth}
            onSave={onSaveUserDateOfBirth}
            onToggle={() => onToggleEditState("dateOfBirth")}
        />
        <PlaceOfBirthField
            isEditing={editState.placeOfBirth}
            value={user.placeOfBirth}
            tempValue={tempUser.placeOfBirth}
            options={placeOfBirthOptions}
            onChange={onInputChange}
            onSave={onSaveUserPlaceOfBirth}
            onToggle={() => onToggleEditState("placeOfBirth")}
        />
        <NationalityField
            isEditing={editState.nationality}
            value={user.nationality}
            tempValue={tempUser.nationality}
            error={nationalityError}
            onChange={onInputChange}
            onKeyPress={onKeyPressNationality}
            onSave={onSaveUserNationality}
            onToggle={() => onToggleEditState("nationality")}
        />
        <PreferencesSection
            language={language}
            languageOptions={languageOptions}
            onLanguageChange={onLanguageChange}
            showPrefFormats={showPrefFormats}
            dateFormat={dateFormat}
            priceFormat={priceFormat}
            dateFormatOptions={dateFormatOptions}
            priceFormatOptions={priceFormatOptions}
            onDateFormatChange={onDateFormatChange}
            onPriceFormatChange={onPriceFormatChange}
        />
        <AuthenticationSection authStatus={authStatus} showAuthMfa={showAuthMfa} />
    </div>
);

HostSettingsLayout.propTypes = {
    children: PropTypes.node.isRequired,
};

EditActionButtons.propTypes = {
    isEditing: PropTypes.bool.isRequired,
    onSave: PropTypes.func,
    onToggle: PropTypes.func.isRequired,
    saveAlt: PropTypes.string.isRequired,
    editAlt: PropTypes.string.isRequired,
};

EditableInfoBox.propTypes = {
    label: PropTypes.string.isRequired,
    isEditing: PropTypes.bool.isRequired,
    editContent: PropTypes.node.isRequired,
    displayContent: PropTypes.node.isRequired,
    onSave: PropTypes.func,
    onToggle: PropTypes.func.isRequired,
    saveAlt: PropTypes.string.isRequired,
    editAlt: PropTypes.string.isRequired,
};

ProfilePhotoBox.propTypes = {
    userPicture: PropTypes.string,
    isUploadingPhoto: PropTypes.bool.isRequired,
    photoError: PropTypes.string,
    onPhotoButtonClick: PropTypes.func.isRequired,
    onPhotoRemove: PropTypes.func.isRequired,
    onPhotoInputChange: PropTypes.func.isRequired,
    photoInputRef: refShape.isRequired,
};

TitleField.propTypes = {
    value: PropTypes.string,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
    onChange: PropTypes.func.isRequired,
};

NameField.propTypes = {
    isEditing: PropTypes.bool.isRequired,
    value: PropTypes.string,
    tempValue: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    onKeyPress: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    onToggle: PropTypes.func.isRequired,
};

EmailField.propTypes = {
    isEditing: PropTypes.bool.isRequired,
    isVerifying: PropTypes.bool.isRequired,
    value: PropTypes.string,
    tempValue: PropTypes.string,
    verificationCode: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    onVerificationChange: PropTypes.func.isRequired,
    onKeyPress: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    onToggle: PropTypes.func.isRequired,
};

PhoneField.propTypes = {
    isEditing: PropTypes.bool.isRequired,
    value: PropTypes.string,
    countryCodes: PropTypes.arrayOf(countryCodeShape).isRequired,
    selectedCountryCode: PropTypes.string.isRequired,
    stripPhone: PropTypes.string.isRequired,
    onCountryCodeChange: PropTypes.func.isRequired,
    onPhoneChange: PropTypes.func.isRequired,
    onKeyPress: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    onToggle: PropTypes.func.isRequired,
};

SexField.propTypes = {
    value: PropTypes.string,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
    onChange: PropTypes.func.isRequired,
};

DateOfBirthField.propTypes = {
    isEditing: PropTypes.bool.isRequired,
    value: PropTypes.string,
    tempValue: PropTypes.string,
    error: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    onKeyPress: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    onToggle: PropTypes.func.isRequired,
};

PlaceOfBirthField.propTypes = {
    isEditing: PropTypes.bool.isRequired,
    value: PropTypes.string,
    tempValue: PropTypes.string,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
    onChange: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    onToggle: PropTypes.func.isRequired,
};

NationalityField.propTypes = {
    isEditing: PropTypes.bool.isRequired,
    value: PropTypes.string,
    tempValue: PropTypes.string,
    error: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    onKeyPress: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    onToggle: PropTypes.func.isRequired,
};

PreferencesSection.propTypes = {
    language: PropTypes.string.isRequired,
    languageOptions: PropTypes.arrayOf(optionShape).isRequired,
    onLanguageChange: PropTypes.func.isRequired,
    showPrefFormats: PropTypes.bool.isRequired,
    dateFormat: PropTypes.string.isRequired,
    priceFormat: PropTypes.string.isRequired,
    dateFormatOptions: PropTypes.arrayOf(optionShape).isRequired,
    priceFormatOptions: PropTypes.arrayOf(optionShape).isRequired,
    onDateFormatChange: PropTypes.func.isRequired,
    onPriceFormatChange: PropTypes.func.isRequired,
};

AuthenticationSection.propTypes = {
    authStatus: authStatusShape.isRequired,
    showAuthMfa: PropTypes.bool.isRequired,
};

HostSettingsContent.propTypes = {
    user: userShape.isRequired,
    tempUser: tempUserShape.isRequired,
    editState: editStateShape.isRequired,
    verificationCode: PropTypes.string.isRequired,
    isVerifying: PropTypes.bool.isRequired,
    selectedCountryCode: PropTypes.string.isRequired,
    stripPhone: PropTypes.string.isRequired,
    dateOfBirthError: PropTypes.string,
    photoError: PropTypes.string,
    isUploadingPhoto: PropTypes.bool.isRequired,
    nationalityError: PropTypes.string,
    authStatus: authStatusShape.isRequired,
    language: PropTypes.string.isRequired,
    dateFormat: PropTypes.string.isRequired,
    priceFormat: PropTypes.string.isRequired,
    photoInputRef: refShape.isRequired,
    languageOptions: PropTypes.arrayOf(optionShape).isRequired,
    dateFormatOptions: PropTypes.arrayOf(optionShape).isRequired,
    priceFormatOptions: PropTypes.arrayOf(optionShape).isRequired,
    countryCodes: PropTypes.arrayOf(countryCodeShape).isRequired,
    titleOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
    sexOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
    placeOfBirthOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
    onPhotoButtonClick: PropTypes.func.isRequired,
    onPhotoRemove: PropTypes.func.isRequired,
    onPhotoInputChange: PropTypes.func.isRequired,
    onTitleChange: PropTypes.func.isRequired,
    onInputChange: PropTypes.func.isRequired,
    onVerificationInputChange: PropTypes.func.isRequired,
    onKeyPressName: PropTypes.func.isRequired,
    onKeyPressEmail: PropTypes.func.isRequired,
    onKeyPressPhone: PropTypes.func.isRequired,
    onKeyPressDateOfBirth: PropTypes.func.isRequired,
    onKeyPressNationality: PropTypes.func.isRequired,
    onCountryCodeChange: PropTypes.func.isRequired,
    onPhoneChange: PropTypes.func.isRequired,
    onSexChange: PropTypes.func.isRequired,
    onDateOfBirthChange: PropTypes.func.isRequired,
    onLanguageChange: PropTypes.func.isRequired,
    onDateFormatChange: PropTypes.func.isRequired,
    onPriceFormatChange: PropTypes.func.isRequired,
    onSaveUserName: PropTypes.func.isRequired,
    onSaveUserEmail: PropTypes.func.isRequired,
    onSaveUserPhone: PropTypes.func.isRequired,
    onSaveUserDateOfBirth: PropTypes.func.isRequired,
    onSaveUserPlaceOfBirth: PropTypes.func.isRequired,
    onSaveUserNationality: PropTypes.func.isRequired,
    onToggleEditState: PropTypes.func.isRequired,
    showPrefFormats: PropTypes.bool.isRequired,
    showAuthMfa: PropTypes.bool.isRequired,
};


const HostSettings = () => {
    const {language, setLanguage} = useContext(LanguageContext);
    const SHOW_PREF_FORMATS = false;
    const SHOW_AUTH_MFA = false;
    const [tempUser, setTempUser] = useState({
        email: '',
        name: '',
        phone: '',
        title: '',
        dateOfBirth: '',
        placeOfBirth: '',
        sex: '',
        picture: '',
        nationality: '',
    });
    const [user, setUser] = useState({
        email: '',
        name: '',
        address: '',
        phone: '',
        family: '',
        title: '',
        dateOfBirth: '',
        placeOfBirth: '',
        sex: '',
        picture: '',
        nationality: '',
    });
    const [editState, setEditState] = useState({
        email: false,
        name: false,
        phone: false,
        dateOfBirth: false,
        placeOfBirth: false,
        nationality: false,
    });
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [selectedCountryCode, setSelectedCountryCode] = useState("+1");
    const [stripPhone, setStripPhone] = useState("");
    const [dateOfBirthError, setDateOfBirthError] = useState("");
    const [photoError, setPhotoError] = useState("");
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [nationalityError, setNationalityError] = useState("");
    const [authStatus, setAuthStatus] = useState({
        emailVerified: false,
        phoneVerified: false,
        preferredMFA: "NOMFA",
    });
    const [dateFormat, setDateFormat] = useState(localStorage.getItem("dateFormat") || "en");
    const [priceFormat, setPriceFormat] = useState(localStorage.getItem("priceFormat") || "usd");
    const previousDobRef = useRef("");
    const photoInputRef = useRef(null);

    const PROFILE_PHOTO_MAX_SIZE = 5 * 1024 * 1024;
    const PROFILE_UPLOAD_URL_ENDPOINT = "https://d141hj02ed.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Create-UploadUrl";
    const languageOptions = [
        {value: "en", label: "English"},
        {value: "nl", label: "Nederlands"},
        {value: "de", label: "Deutsch"},
        {value: "es", label: "Español"},
    ];

    const dateFormatOptions = [
        {value: "en", label: "English (MM/DD/YYYY)"},
        {value: "nl", label: "Dutch (DD-MM-YYYY)"},
    ];
    const priceFormatOptions = [
        {value: "usd", label: "Dollar ($)"},
        {value: "eur", label: "Euro (€)"},
        {value: "other", label: "Other"},
    ];

    const countryOptions = useMemo(() => countryList().getLabels(), []);
    const placeOfBirthOptions = useMemo(() => {
        if (user.placeOfBirth && !countryOptions.includes(user.placeOfBirth)) {
            return [user.placeOfBirth, ...countryOptions];
        }
        return countryOptions;
    }, [countryOptions, user.placeOfBirth]);

    const countryCodes = [
        {code: "+1", name: "United States/Canada"},
        {code: "+7", name: "Russia"},
        {code: "+20", name: "Egypt"},
        {code: "+27", name: "South Africa"},
        {code: "+30", name: "Greece"},
        {code: "+31", name: "Netherlands"},
        {code: "+32", name: "Belgium"},
        {code: "+33", name: "France"},
        {code: "+34", name: "Spain"},
        {code: "+36", name: "Hungary"},
        {code: "+39", name: "Italy"},
        {code: "+40", name: "Romania"},
        {code: "+44", name: "United Kingdom"},
        {code: "+45", name: "Denmark"},
        {code: "+46", name: "Sweden"},
        {code: "+47", name: "Norway"},
        {code: "+48", name: "Poland"},
        {code: "+49", name: "Germany"},
        {code: "+52", name: "Mexico"},
        {code: "+54", name: "Argentina"},
        {code: "+55", name: "Brazil"},
        {code: "+56", name: "Chile"},
        {code: "+57", name: "Colombia"},
        {code: "+58", name: "Venezuela"},
        {code: "+60", name: "Malaysia"},
        {code: "+61", name: "Australia"},
        {code: "+62", name: "Indonesia"},
        {code: "+63", name: "Philippines"},
        {code: "+64", name: "New Zealand"},
        {code: "+65", name: "Singapore"},
        {code: "+66", name: "Thailand"},
        {code: "+81", name: "Japan"},
        {code: "+82", name: "South Korea"},
        {code: "+84", name: "Vietnam"},
        {code: "+86", name: "China"},
        {code: "+90", name: "Turkey"},
        {code: "+91", name: "India"},
        {code: "+92", name: "Pakistan"},
        {code: "+93", name: "Afghanistan"},
        {code: "+94", name: "Sri Lanka"},
        {code: "+95", name: "Myanmar"},
        {code: "+98", name: "Iran"},
        {code: "+212", name: "Morocco"},
        {code: "+213", name: "Algeria"},
        {code: "+216", name: "Tunisia"},
        {code: "+218", name: "Libya"},
        {code: "+220", name: "Gambia"},
        {code: "+221", name: "Senegal"},
        {code: "+223", name: "Mali"},
        {code: "+225", name: "Ivory Coast"},
        {code: "+230", name: "Mauritius"},
        {code: "+234", name: "Nigeria"},
        {code: "+254", name: "Kenya"},
        {code: "+255", name: "Tanzania"},
        {code: "+256", name: "Uganda"},
        {code: "+260", name: "Zambia"},
        {code: "+263", name: "Zimbabwe"},
        {code: "+267", name: "Botswana"},
        {code: "+356", name: "Malta"},
        {code: "+358", name: "Finland"},
        {code: "+359", name: "Bulgaria"},
        {code: "+370", name: "Lithuania"},
        {code: "+371", name: "Latvia"},
        {code: "+372", name: "Estonia"},
        {code: "+373", name: "Moldova"},
        {code: "+374", name: "Armenia"},
        {code: "+375", name: "Belarus"},
        {code: "+376", name: "Andorra"},
        {code: "+380", name: "Ukraine"},
        {code: "+381", name: "Serbia"},
        {code: "+385", name: "Croatia"},
        {code: "+386", name: "Slovenia"},
        {code: "+387", name: "Bosnia and Herzegovina"},
        {code: "+389", name: "North Macedonia"},
        {code: "+420", name: "Czech Republic"},
        {code: "+421", name: "Slovakia"},
        {code: "+423", name: "Liechtenstein"},
        {code: "+500", name: "Falkland Islands"},
        {code: "+501", name: "Belize"},
        {code: "+502", name: "Guatemala"},
        {code: "+503", name: "El Salvador"},
        {code: "+504", name: "Honduras"},
        {code: "+505", name: "Nicaragua"},
        {code: "+506", name: "Costa Rica"},
        {code: "+507", name: "Panama"},
        {code: "+509", name: "Haiti"},
        {code: "+852", name: "Hong Kong"},
        {code: "+853", name: "Macau"},
        {code: "+855", name: "Cambodia"},
        {code: "+856", name: "Laos"},
        {code: "+880", name: "Bangladesh"},
        {code: "+960", name: "Maldives"},
        {code: "+961", name: "Lebanon"},
        {code: "+962", name: "Jordan"},
        {code: "+963", name: "Syria"},
        {code: "+964", name: "Iraq"},
        {code: "+965", name: "Kuwait"},
        {code: "+966", name: "Saudi Arabia"},
        {code: "+967", name: "Yemen"},
        {code: "+971", name: "United Arab Emirates"},
        {code: "+972", name: "Israel"},
        {code: "+973", name: "Bahrain"},
        {code: "+974", name: "Qatar"},
        {code: "+975", name: "Bhutan"},
        {code: "+976", name: "Mongolia"},
        {code: "+977", name: "Nepal"},
        {code: "+992", name: "Tajikistan"},
        {code: "+993", name: "Turkmenistan"},
        {code: "+994", name: "Azerbaijan"},
        {code: "+995", name: "Georgia"},
        {code: "+996", name: "Kyrgyzstan"},
        {code: "+998", name: "Uzbekistan"},
    ];
    const titleOptions = ["", "Dr.", "Mr.", "Mrs.", "Ms.", "Prof."];
    const sexOptions = ["", "Female", "Male"];

    const handleInputChange = (e) => {
        const {name, value} = e.target;
        setTempUser({...tempUser, [name]: value});
        if (name === "nationality" && nationalityError) {
            setNationalityError("");
        }
    };

    const handleLanguageChange = (e) => {
        setLanguage(e.target.value);
    };

    const handleDateFormatChange = (e) => {
        const value = e.target.value;
        setDateFormat(value);
        localStorage.setItem("dateFormat", value);
    };

    const handlePriceFormatChange = (e) => {
        const value = e.target.value;
        setPriceFormat(value);
        localStorage.setItem("priceFormat", value);
    };

    const normalizePreferredMfa = (value) => {
        if (!value) return "NOMFA";
        if (value === "SOFTWARE_TOKEN_MFA") return "TOTP";
        if (value === "SMS_MFA") return "SMS";
        return value;
    };

    const getProfileUploadUrl = async (fileType) => {
        const response = await fetch(PROFILE_UPLOAD_URL_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ fileType }),
        });

        if (!response.ok) {
            throw new Error("Failed to get upload URL");
        }

        return await response.json();
    };

    const handlePhotoButtonClick = () => {
        if (photoInputRef.current) {
            photoInputRef.current.value = "";
            photoInputRef.current.click();
        }
    };

    const handlePhotoInputChange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setPhotoError("Please select an image file.");
            return;
        }

        if (file.size > PROFILE_PHOTO_MAX_SIZE) {
            setPhotoError("Image must be 5MB or smaller.");
            return;
        }

        setIsUploadingPhoto(true);
        setPhotoError("");

        try {
            const uploadData = await getProfileUploadUrl(file.type);

            if (!uploadData.uploadUrl || !uploadData.fields || !uploadData.fileUrl) {
                throw new Error("Invalid upload response.");
            }

            const formData = new FormData();
            Object.entries(uploadData.fields).forEach(([key, value]) => {
                formData.append(key, value);
            });
            formData.append("file", file);

            const uploadResponse = await fetch(uploadData.uploadUrl, {
                method: "POST",
                body: formData,
            });

            if (!uploadResponse.ok) {
                throw new Error("Failed to upload image.");
            }

            const currentUser = await Auth.currentAuthenticatedUser();
            await Auth.updateUserAttributes(currentUser, { picture: uploadData.fileUrl });
            setUser((prevState) => ({
                ...prevState,
                picture: uploadData.fileUrl,
            }));
        } catch (error) {
            console.error("Error uploading profile photo:", error);
            setPhotoError("Failed to upload photo. Please try again.");
        } finally {
            setIsUploadingPhoto(false);
            if (photoInputRef.current) {
                photoInputRef.current.value = "";
            }
        }
    };

    const handlePhotoRemove = async () => {
        if (!user.picture) return;

        setIsUploadingPhoto(true);
        setPhotoError("");

        try {
            const currentUser = await Auth.currentAuthenticatedUser();
            await Auth.updateUserAttributes(currentUser, { picture: "" });
            setUser((prevState) => ({
                ...prevState,
                picture: "",
            }));
        } catch (error) {
            console.error("Error removing profile photo:", error);
            setPhotoError("Failed to remove photo. Please try again.");
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const formatDateOfBirth = (digits) => {
        if (!digits) return "";
        const day = digits.slice(0, 2);
        const month = digits.slice(2, 4);
        const year = digits.slice(4, 8);

        if (digits.length <= 2) {
            return digits.length === 2 ? `${day}-` : day;
        }
        if (digits.length <= 4) {
            return digits.length === 4 ? `${day}-${month}-` : `${day}-${month}`;
        }
        return `${day}-${month}-${year}`;
    };

    const handleDateOfBirthChange = (e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
        const prevValue = previousDobRef.current || "";
        const prevDigits = prevValue.replace(/\D/g, "");
        const isDeleting = e.target.value.length < prevValue.length;
        let nextDigits = digits;

        if (isDeleting && prevDigits.length === digits.length) {
            const cursor = e.target.selectionStart ?? e.target.value.length;
            if (prevValue[cursor] === "-") {
                const digitsBefore = prevValue.slice(0, cursor).replace(/\D/g, "").length;
                const removeIndex = Math.max(digitsBefore - 1, 0);
                nextDigits = prevDigits.slice(0, removeIndex) + prevDigits.slice(removeIndex + 1);
            }
        }

        const formatted = formatDateOfBirth(nextDigits);
        previousDobRef.current = formatted;
        setTempUser({...tempUser, dateOfBirth: formatted});
        if (dateOfBirthError) {
            setDateOfBirthError("");
        }
    };

    const handleTitleChange = (e) => {
        const value = e.target.value;
        setTempUser((prevState) => ({...prevState, title: value}));
        setUser((prevState) => ({...prevState, title: value}));
    };

    const handleSexChange = async (e) => {
        const value = e.target.value;
        setTempUser((prevState) => ({...prevState, sex: value}));
        setUser((prevState) => ({...prevState, sex: value}));

        if (!value) return;

        try {
            const currentUser = await Auth.currentAuthenticatedUser();
            await Auth.updateUserAttributes(currentUser, { gender: value });
        } catch (error) {
            console.error("Error updating gender:", error);
            alert("Failed to update gender. Please try again.");
        }
    };

    const handleCountryCodeChange = (e) => {
        setSelectedCountryCode(e.target.value);
    };

    const handlePhoneChange = (e) => {
        setStripPhone(e.target.value);
    }

    const handleVerificationInputChange = (e) => {
        setVerificationCode(e.target.value);
    };

    const toggleEditState = (field) => {
        if (field === 'phone' && !editState.phone) {
            const phone = user.phone || "";
            const matchingCountryCode = countryCodes.find(({code}) =>
                phone.startsWith(code)
            );
            const countryCode = matchingCountryCode ? matchingCountryCode.code : "+1";
            const strippedPhone = phone.replace(countryCode, '').trim();

            setSelectedCountryCode(countryCode);
            setTempUser((prevState) => ({
                ...prevState,
                phone: strippedPhone,
            }));
            setStripPhone(strippedPhone);
        }

        setEditState((prevState) => ({...prevState, [field]: !prevState[field]}));
        setIsVerifying(false);
        if (!editState[field]) {
            setTempUser({...tempUser, [field]: user[field]});
        }
        if (field === "dateOfBirth") {
            setDateOfBirthError("");
        }
        if (field === "nationality") {
            setNationalityError("");
        }
    };
    const saveUserEmail = async () => {
        if (isVerifying) {
            try {
                const result = await confirmEmailChange(verificationCode);
                if (result.success) {
                    setUser({...user, email: tempUser.email});
                    toggleEditState('email');
                } else {
                    alert("Incorrect verification code");
                }
            } catch (error) {
                alert("An error occurred during verification. Please try again.");
            }
            return;
        }

        try {
            const userInfo = await Auth.currentAuthenticatedUser();
            const userId = userInfo.username;
            const newEmail = tempUser.email;

            // Validate email before sending request
            if (!newEmail || !/\S+@\S+\.\S+/.test(newEmail)) {
                alert("Please provide a valid email address.");
                return;
            }

            const params = {
                userId,
                newEmail,
            };

            const response = await fetch(
                'https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/General-CustomerIAM-Production-Update-UserEmail',
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(params),
                }
            );

            const result = await response.json();

            if (response.ok) {
                if (result.message === "Email update successful, please verify your new email.") {
                    setIsVerifying(true);
                } else if (result.message === "This email address is already in use.") {
                    alert(result.message);
                } else {
                    console.error("Unexpected error:", result.message || "No message provided");
                }
            } else {
                console.error("Request failed with status:", response.status);
                alert("Failed to update email. Please try again later.");
            }
        } catch (error) {
            console.error("Error updating email:", error);
            alert("An error occurred while updating the email. Please try again later.");
        }
    };


    const saveUserName = async () => {
        try {
            const userInfo = await Auth.currentAuthenticatedUser();
            const userId = userInfo.username;
            const newName = tempUser.name;

            const params = {
                userId,
                newName
            };

            const response = await fetch('https://5imk8jy3hf.execute-api.eu-north-1.amazonaws.com/default/General-CustomerIAM-Production-Update-UserName', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            });

            const result = await response.json();

            if (result.statusCode === 200) {
                setUser({...user, name: tempUser.name});
                toggleEditState('name');
            }
        } catch (error) {
            console.error("Error updating username:", error);
        }
    };

    const saveUserPhone = async () => {
        try {
            const userInfo = await Auth.currentAuthenticatedUser();
            const userId = userInfo.username;
            const newPhone = `${selectedCountryCode}${stripPhone}`;

            const params = {
                userId,
                newPhone
            };

            const response = await fetch('https://24oly7cicg.execute-api.eu-north-1.amazonaws.com/default/General-CustomerIAM-Production-Update-PhoneNumber', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            });

            const result = await response.json();

            if (result.statusCode === 200) {
                setUser({...user, phone: newPhone});
                toggleEditState('phone');
            }
        } catch (error) {
            console.error("Error updating phone number:", error);
        }
    };

    const handleKeyPressEmail = (e) => {
        if (e.key === 'Enter') {
            saveUserEmail();
        }
    };

    const handleKeyPressName = (e) => {
        if (e.key === 'Enter') {
            saveUserName();
        }
    };

    const handleKeyPressPhone = (e) => {
        if (e.key === 'Enter') {
            saveUserPhone();
        }
    };

    const validateDateOfBirth = (value) => {
        if (!value) {
            return "Please enter a date of birth.";
        }
        const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (!match) {
            return "Use format DD-MM-YYYY.";
        }
        const day = Number(match[1]);
        const month = Number(match[2]);
        if (day < 1 || day > 31) {
            return "Day must be between 01 and 31.";
        }
        if (month < 1 || month > 12) {
            return "Month must be between 01 and 12.";
        }
        return "";
    };

    const validateNationality = (value) => {
        const trimmed = value.trim();
        const current = (user.nationality || "").trim();
        if (trimmed === current) return "";
        if (!trimmed) {
            return "Please enter a nationality.";
        }
        if (trimmed.length < 2 || trimmed.length > 64) {
            return "Nationality must be 2 to 64 characters.";
        }
        if (!/^[A-Za-z][A-Za-z\s'-]*$/.test(trimmed)) {
            return "Use letters, spaces, hyphens, or apostrophes.";
        }
        return "";
    };

    const formatBirthdateForStorage = (value) => {
        const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (!match) return value;
        return `${match[3]}-${match[2]}-${match[1]}`;
    };

    const formatBirthdateForDisplay = (value) => {
        if (!value) return value;
        if (/^\d{2}-\d{2}-\d{4}$/.test(value)) return value;
        const parts = value.split("-");
        if (parts.length !== 3 || parts[0].length !== 4) return value;
        const [year, month, day] = parts;
        const paddedMonth = month.padStart(2, "0");
        const paddedDay = day.padStart(2, "0");
        return `${paddedDay}-${paddedMonth}-${year}`;
    };

    const saveUserDateOfBirth = async () => {
        const error = validateDateOfBirth(tempUser.dateOfBirth);
        if (error) {
            setDateOfBirthError(error);
            return;
        }

        const birthdateForStorage = formatBirthdateForStorage(tempUser.dateOfBirth);
        setUser({...user, dateOfBirth: tempUser.dateOfBirth});
        toggleEditState('dateOfBirth');

        try {
            const currentUser = await Auth.currentAuthenticatedUser();
            await Auth.updateUserAttributes(currentUser, { birthdate: birthdateForStorage });
        } catch (error) {
            console.error("Error updating birthdate:", error);
            alert("Failed to update birthdate. Please try again.");
        }
    };

    const saveUserPlaceOfBirth = async () => {
        try {
            const currentUser = await Auth.currentAuthenticatedUser();
            await Auth.updateUserAttributes(currentUser, { "custom:place_of_birth": tempUser.placeOfBirth });
            setUser({...user, placeOfBirth: tempUser.placeOfBirth});
            toggleEditState('placeOfBirth');
        } catch (error) {
            console.error("Error updating place of birth:", error);
            alert("Failed to update place of birth. Please try again.");
        }
    };

    const saveUserNationality = async () => {
        const error = validateNationality(tempUser.nationality || "");
        if (error) {
            setNationalityError(error);
            return;
        }

        try {
            const currentUser = await Auth.currentAuthenticatedUser();
            await Auth.updateUserAttributes(currentUser, { "custom:nationality": tempUser.nationality.trim() });
            setUser({...user, nationality: tempUser.nationality.trim()});
            toggleEditState('nationality');
        } catch (error) {
            console.error("Error updating nationality:", error);
            setNationalityError("Failed to update nationality. Please try again.");
        }
    };

    const handleKeyPressDateOfBirth = (e) => {
        if (e.key === 'Enter') {
            saveUserDateOfBirth();
        }
    };

    const handleKeyPressNationality = (e) => {
        if (e.key === 'Enter') {
            saveUserNationality();
        }
    };

    useEffect(() => {
        fetchAccommodations();
        fetchUserData();
    }, []);

    useEffect(() => {
        previousDobRef.current = tempUser.dateOfBirth || "";
    }, [tempUser.dateOfBirth]);

    useEffect(() => {
        setStripPhone(user.phone)
    }, [user]);

    const fetchUserData = async () => {
        try {
            const currentUser = await Auth.currentAuthenticatedUser({ bypassCache: true });
            const attributes = currentUser?.attributes || {};
            let preferredMFA = "NOMFA";
            try {
                preferredMFA = normalizePreferredMfa(await Auth.getPreferredMFA(currentUser));
            } catch (error) {
                console.warn("Unable to load preferred MFA:", error);
            }
            const emailVerified = attributes.email_verified === true || attributes.email_verified === "true";
            const phoneVerified = attributes.phone_number_verified === true || attributes.phone_number_verified === "true";
            setUser({
                email: attributes.email,
                name: attributes['given_name'],
                address: attributes.address,
                phone: attributes.phone_number,
                family: "2 adults - 2 kids",
                title: '',
                dateOfBirth: formatBirthdateForDisplay(attributes.birthdate || ''),
                placeOfBirth: attributes["custom:place_of_birth"] || '',
                sex: attributes.gender || '',
                picture: attributes.picture || '',
                nationality: attributes["custom:nationality"] || '',
            });
            setAuthStatus({
                emailVerified,
                phoneVerified,
                preferredMFA,
            });
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    };

    const fetchAccommodations = async () => {
        try {
            const response = await API.graphql(graphqlOperation(listAccommodationsQuery));
            console.log("Accommodations:", response.data.listAccommodations.items);
        } catch (error) {
            console.error("Error listing accommodations:", error);
        }
    };

    return (
        <HostSettingsLayout>
            <HostSettingsContent
                user={user}
                tempUser={tempUser}
                editState={editState}
                verificationCode={verificationCode}
                isVerifying={isVerifying}
                selectedCountryCode={selectedCountryCode}
                stripPhone={stripPhone}
                dateOfBirthError={dateOfBirthError}
                photoError={photoError}
                isUploadingPhoto={isUploadingPhoto}
                nationalityError={nationalityError}
                authStatus={authStatus}
                language={language}
                dateFormat={dateFormat}
                priceFormat={priceFormat}
                photoInputRef={photoInputRef}
                languageOptions={languageOptions}
                dateFormatOptions={dateFormatOptions}
                priceFormatOptions={priceFormatOptions}
                countryCodes={countryCodes}
                titleOptions={titleOptions}
                sexOptions={sexOptions}
                placeOfBirthOptions={placeOfBirthOptions}
                onPhotoButtonClick={handlePhotoButtonClick}
                onPhotoRemove={handlePhotoRemove}
                onPhotoInputChange={handlePhotoInputChange}
                onTitleChange={handleTitleChange}
                onInputChange={handleInputChange}
                onVerificationInputChange={handleVerificationInputChange}
                onKeyPressName={handleKeyPressName}
                onKeyPressEmail={handleKeyPressEmail}
                onKeyPressPhone={handleKeyPressPhone}
                onKeyPressDateOfBirth={handleKeyPressDateOfBirth}
                onKeyPressNationality={handleKeyPressNationality}
                onCountryCodeChange={handleCountryCodeChange}
                onPhoneChange={handlePhoneChange}
                onSexChange={handleSexChange}
                onDateOfBirthChange={handleDateOfBirthChange}
                onLanguageChange={handleLanguageChange}
                onDateFormatChange={handleDateFormatChange}
                onPriceFormatChange={handlePriceFormatChange}
                onSaveUserName={saveUserName}
                onSaveUserEmail={saveUserEmail}
                onSaveUserPhone={saveUserPhone}
                onSaveUserDateOfBirth={saveUserDateOfBirth}
                onSaveUserPlaceOfBirth={saveUserPlaceOfBirth}
                onSaveUserNationality={saveUserNationality}
                onToggleEditState={toggleEditState}
                showPrefFormats={SHOW_PREF_FORMATS}
                showAuthMfa={SHOW_AUTH_MFA}
            />
        </HostSettingsLayout>
    );
}

export default HostSettings;
