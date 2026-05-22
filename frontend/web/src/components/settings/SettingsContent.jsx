import React, { useContext } from "react";
import PropTypes from "prop-types";
import {normalizeImageUrl} from "../../features/guestdashboard/utils/image";
import standardAvatar from "../../images/standard.png";
import EditableInfoBox from "./shared/EditableInfoBox";
import {
    optionShape,
    countryCodeShape,
    authStatusShape,
    userShape,
    tempUserShape,
    editStateShape,
    refShape,
} from "./propTypes";
import { LanguageContext } from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";

const contentByLanguage = { en, nl, de, es };
const useSettingsT = () => {
    const { language } = useContext(LanguageContext);
    return contentByLanguage[language]?.guestdashboard?.settingsPage;
};

const ProfilePhotoBox = ({
    userPicture,
    isUploadingPhoto,
    photoError,
    onPhotoButtonClick,
    onPhotoRemove,
    onPhotoInputChange,
    photoInputRef,
}) => {
    const t = useSettingsT();
    return (
        <>
            <div className="InfoBox profile-photo-box">
                <div className="infoBoxText">
                    <span>{t?.profilePhoto || "Profile photo:"}</span>
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
                                {isUploadingPhoto ? (t?.working || "Working...") : (t?.upload || "Upload")}
                            </button>
                            <button
                                type="button"
                                onClick={onPhotoRemove}
                                className="photo-action danger"
                                disabled={isUploadingPhoto || !userPicture}
                            >
                                {t?.remove || "Remove"}
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
                aria-label="Upload profile photo"
            />
        </>
    );
};

const TitleField = ({value, options, onChange}) => {
    const t = useSettingsT();
    return (
        <div className="InfoBox">
            <div className="infoBoxText infoBoxText--row">
                <label htmlFor="title-select">{t?.titleLabel || "Title:"}</label>
                <div className="infoBoxEditRow">
                    <select
                        id="title-select"
                        name="title"
                        value={value}
                        onChange={onChange}
                        className="guest-edit-input"
                    >
                        {options.map((option) => (
                            <option key={option || "empty"} value={option}>
                                {option || (t?.selectTitle || "Select title")}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};

const NameField = ({
    isEditing,
    value,
    tempValue,
    onChange,
    onKeyPress,
    onSave,
    onToggle,
}) => {
    const t = useSettingsT();
    return (
    <EditableInfoBox
        label={t?.fullName || "Full name:"}
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
};

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
}) => {
    const t = useSettingsT();
    return (
    <EditableInfoBox
        label={t?.email || "Email:"}
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
                        placeholder={t?.codeSentEmail || "Code sent to your email!"}
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
};

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
}) => {
    const t = useSettingsT();
    return (
    <EditableInfoBox
        label={t?.phone || "Phone:"}
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
                    {countryCodes.map((country) => (
                        <option key={country.code} value={country.code}>
                            {country.name} ({country.code})
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    name="phone"
                    placeholder={t?.phoneNumber || "Phone Number"}
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
};

const SexField = ({value, options, onChange}) => {
    const t = useSettingsT();
    return (
        <div className="InfoBox">
            <div className="infoBoxText infoBoxText--row">
                <label htmlFor="sex-select">{t?.sex || "Sex:"}</label>
                <div className="infoBoxEditRow">
                    <select
                        id="sex-select"
                        name="sex"
                        value={value}
                        onChange={onChange}
                        className="guest-edit-input"
                    >
                        {options.map((option) => (
                            <option key={option || "empty"} value={option}>
                                {option || (t?.selectSex || "Select sex")}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};

const DateOfBirthField = ({
    isEditing,
    value,
    tempValue,
    error,
    onChange,
    onKeyPress,
    onSave,
    onToggle,
}) => {
    const t = useSettingsT();
    return (
    <EditableInfoBox
        label={t?.dateOfBirth || "Date of birth:"}
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
};

const PlaceOfBirthField = ({
    isEditing,
    value,
    tempValue,
    options,
    onChange,
    onSave,
    onToggle,
}) => {
    const t = useSettingsT();
    return (
    <EditableInfoBox
        label={t?.placeOfBirth || "Place of birth:"}
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
                    <option value="">{t?.selectCountry || "Select country"}</option>
                    {options.map((country) => (
                        <option key={country} value={country}>
                            {country}
                        </option>
                    ))}
                </select>
            </div>
        )}
        displayContent={
            value ? <p>{value}</p> : <p className="placeholder-text">{t?.selectCountry || "Country"}</p>
        }
    />
    );
};

const NationalityField = ({
    isEditing,
    value,
    tempValue,
    error,
    onChange,
    onKeyPress,
    onSave,
    onToggle,
}) => {
    const t = useSettingsT();
    return (
    <EditableInfoBox
        label={t?.nationality || "Nationality:"}
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
                    placeholder={t?.nationalityPlaceholder || "e.g. Dutch"}
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
            value ? <p>{value}</p> : <p className="placeholder-text">{t?.nationality || "Nationality"}</p>
        }
    />
    );
};

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
}) => {
    const t = useSettingsT();
    return (
    <div className="preferencesSection">
        <h3>{t?.preferences || "Preferences"}</h3>

        <div className="InfoBox">
            <div className="infoBoxText infoBoxText--row">
                <span>{t?.defaultLanguage || "Default language:"}</span>
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
};

const AuthenticationSection = ({authStatus, showAuthMfa}) => {
    const t = useSettingsT();
    return (
    <div className="preferencesSection authSection">
        <h3>{t?.authentication || "Authentication"}</h3>

        <div className="InfoBox">
            <div className="infoBoxText">
                <div className="infoBoxTextRow">
                    <span>{t?.emailLabel || "Email"}</span>
                    <span className={`status-pill ${authStatus.emailVerified ? "is-active" : "is-inactive"}`}>
                        {authStatus.emailVerified ? (t?.active || "Active") : (t?.inactive || "Inactive")}
                    </span>
                </div>
                <p className="auth-subtext">
                    {authStatus.emailVerified ? (t?.verified || "Verified") : (t?.notVerified || "Not verified")}
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
                                {authStatus.preferredMFA === "SMS" ? (t?.active || "Active") : (t?.inactive || "Inactive")}
                            </span>
                        </div>
                        <p className="auth-subtext">
                            {t?.phoneVerified || "Phone verified"}: {authStatus.phoneVerified ? (t?.yes || "Yes") : (t?.no || "No")}
                        </p>
                    </div>
                </div>

                <div className="InfoBox">
                    <div className="infoBoxText">
                        <div className="infoBoxTextRow">
                            <span>{t?.authenticatorApp || "Authenticator app"}</span>
                            <span className={`status-pill ${authStatus.preferredMFA === "TOTP" ? "is-active" : "is-inactive"}`}>
                                {authStatus.preferredMFA === "TOTP" ? (t?.active || "Active") : (t?.inactive || "Inactive")}
                            </span>
                        </div>
                        <p className="auth-subtext">{t?.totpSubtext || "App-based codes (TOTP)"}</p>
                    </div>
                </div>
            </>
        )}
    </div>
    );
};

const SettingsContent = ({
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
}) => {
    const t = useSettingsT();
    return (
    <div className="personalInfoContent">
        <h3>{t?.personalInfo || "Personal Information"}</h3>
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

SettingsContent.propTypes = {
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

export default SettingsContent;
