import React from "react";
import PropTypes from "prop-types";
import useSettingsTrans from "../hooks/useSettingsTrans";
import SettingsSubPage from "./SettingsSubPage";

const getSaveLabel = (isSaving, saveSuccess, t) => {
    if (isSaving) return t.buttons.saving;
    if (saveSuccess) return t.buttons.saved;
    return t.buttons.save;
};

const CompanyForm = ({
    profile,
    onFieldChange,
    onSave,
    isSaving,
    saveSuccess,
    error,
    logoError,
    isUploadingLogo,
    logoInputRef,
    onLogoButtonClick,
    onLogoInputChange,
    onLogoRemove,
}) => {
    const { t, hub } = useSettingsTrans("company");
    const { fields } = t;

    return (
        <SettingsSubPage hubLabel={hub.breadcrumb} breadcrumb={t.breadcrumb} title={t.title} subtitle={t.subtitle}>
            <section className="personal-data-section">
                <h2 className="personal-data-section-title">{t.privateSection}</h2>
                <p className="settings-section-note">{t.privateSectionNote}</p>
                <div className="personal-data-card">
                    <div className="personal-data-card-inner">
                        <div className="personal-data-fields-col">
                            <div className="pd-field">
                                <label className="pd-field-label" htmlFor="company-name">
                                    {fields.companyName}
                                </label>
                                <input
                                    id="company-name"
                                    type="text"
                                    name="companyName"
                                    value={profile.companyName}
                                    onChange={onFieldChange}
                                    className="pd-field-input"
                                    placeholder={fields.placeholder}
                                />
                            </div>
                            <p className="company-card-hint">{fields.hint}</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="personal-data-section">
                <h2 className="personal-data-section-title">{t.publicSection}</h2>
                <p className="settings-section-note">{t.publicSectionNote}</p>
                <div className="personal-data-card">
                    <div className="personal-data-card-inner">
                        <div className="personal-data-photo-col">
                            {profile.logoUrl ? (
                                <img src={profile.logoUrl} alt={fields.logo} className="company-logo-preview" />
                            ) : (
                                <div className="company-logo-placeholder" aria-hidden="true">{fields.logo}</div>
                            )}
                            <div className="personal-data-photo-actions">
                                <button
                                    type="button"
                                    onClick={onLogoButtonClick}
                                    className="pd-photo-btn pd-photo-btn--primary"
                                    disabled={isUploadingLogo}
                                >
                                    {isUploadingLogo ? fields.logoUploading : fields.logoUpload}
                                </button>
                                <button
                                    type="button"
                                    onClick={onLogoRemove}
                                    className="pd-photo-btn pd-photo-btn--secondary"
                                    disabled={isUploadingLogo || !profile.logoUrl}
                                >
                                    {fields.logoRemove}
                                </button>
                            </div>
                            {logoError && <p className="pd-field-error">{logoError}</p>}
                            <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/*"
                                onChange={onLogoInputChange}
                                style={{ display: "none" }}
                                aria-label={fields.logoUpload}
                            />
                        </div>

                        <div className="personal-data-fields-col">
                            <div className="pd-field">
                                <label className="pd-field-label" htmlFor="company-display-name">
                                    {fields.displayName}
                                </label>
                                <input
                                    id="company-display-name"
                                    type="text"
                                    name="displayName"
                                    value={profile.displayName}
                                    onChange={onFieldChange}
                                    className="pd-field-input"
                                    placeholder={fields.displayNamePlaceholder}
                                />
                            </div>

                            <div className="pd-field">
                                <label className="pd-field-label" htmlFor="company-description">
                                    {fields.description}
                                </label>
                                <input
                                    id="company-description"
                                    type="text"
                                    name="description"
                                    value={profile.description}
                                    onChange={onFieldChange}
                                    className="pd-field-input"
                                    placeholder={fields.descriptionPlaceholder}
                                />
                            </div>

                            <div className="pd-field">
                                <label className="pd-field-label" htmlFor="company-website">
                                    {fields.website}
                                </label>
                                <input
                                    id="company-website"
                                    type="text"
                                    name="website"
                                    value={profile.website}
                                    onChange={onFieldChange}
                                    className="pd-field-input"
                                    placeholder={fields.websitePlaceholder}
                                />
                            </div>

                            <div className="pd-field">
                                <label className="pd-field-label" htmlFor="company-public-email">
                                    {fields.publicEmail}
                                </label>
                                <input
                                    id="company-public-email"
                                    type="email"
                                    name="publicEmail"
                                    value={profile.publicEmail}
                                    onChange={onFieldChange}
                                    className="pd-field-input"
                                    placeholder={fields.publicEmailPlaceholder}
                                />
                            </div>

                            <div className="pd-field">
                                <label className="pd-field-label" htmlFor="company-public-phone">
                                    {fields.publicPhone}
                                </label>
                                <input
                                    id="company-public-phone"
                                    type="text"
                                    name="publicPhone"
                                    value={profile.publicPhone}
                                    onChange={onFieldChange}
                                    className="pd-field-input"
                                    placeholder={fields.publicPhonePlaceholder}
                                />
                            </div>

                            <div className="pd-field">
                                <label className="pd-field-label" htmlFor="company-country">
                                    {fields.country}
                                </label>
                                <input
                                    id="company-country"
                                    type="text"
                                    name="country"
                                    value={profile.country}
                                    onChange={onFieldChange}
                                    className="pd-field-input"
                                    placeholder={fields.countryPlaceholder}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="personal-data-card-footer">
                        {error && <p className="pd-field-error">{error}</p>}
                        <button
                            type="button"
                            className={`pd-save-btn${saveSuccess ? " pd-save-btn--saved" : ""}`}
                            onClick={onSave}
                            disabled={isSaving}
                        >
                            {getSaveLabel(isSaving, saveSuccess, t)}
                        </button>
                    </div>
                </div>
            </section>
        </SettingsSubPage>
    );
};

CompanyForm.propTypes = {
    profile: PropTypes.shape({
        companyName: PropTypes.string,
        displayName: PropTypes.string,
        logoUrl: PropTypes.string,
        description: PropTypes.string,
        website: PropTypes.string,
        publicEmail: PropTypes.string,
        publicPhone: PropTypes.string,
        country: PropTypes.string,
    }).isRequired,
    onFieldChange: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    isSaving: PropTypes.bool.isRequired,
    saveSuccess: PropTypes.bool.isRequired,
    error: PropTypes.string,
    logoError: PropTypes.string,
    isUploadingLogo: PropTypes.bool.isRequired,
    logoInputRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
    onLogoButtonClick: PropTypes.func.isRequired,
    onLogoInputChange: PropTypes.func.isRequired,
    onLogoRemove: PropTypes.func.isRequired,
};

export default CompanyForm;
