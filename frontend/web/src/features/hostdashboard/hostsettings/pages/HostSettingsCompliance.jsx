import React from "react";
import { Link } from "react-router-dom";
import useSettingsTrans from "../hooks/useSettingsTrans";
import useComplianceSettings from "../hooks/useComplianceSettings";
import SettingsSubPage from "../components/SettingsSubPage";
import "../../../../styles/sass/pages/dashboard/settingsDashboard.css";
import "../styles/hostSettings.css";

const getSaveLabel = (isSaving, saveSuccess, buttons) => {
    if (isSaving) return buttons.saving;
    if (saveSuccess) return buttons.saved;
    return buttons.save;
};

const buildOptionLabel = (property, untitledLabel) => {
    const title = property.title || untitledLabel;
    return property.city ? `${title} - ${property.city}` : title;
};

const HostSettingsCompliance = () => {
    const { t, hub } = useSettingsTrans("compliance");
    const { fields, buttons, states, errors } = t;
    const compliance = useComplianceSettings();

    const handlePropertyChange = (event) => {
        if (compliance.isDirty && !window.confirm(t.unsavedChangesConfirm)) {
            return;
        }
        compliance.selectProperty(event.target.value);
    };

    const renderBody = () => {
        if (compliance.isLoading) {
            return <p className="compliance-card-hint">{states.loading}</p>;
        }
        if (compliance.hasLoadError) {
            return <p className="pd-field-error">{errors.load}</p>;
        }
        if (compliance.properties.length === 0) {
            return (
                <>
                    <p className="compliance-card-hint">{states.empty}</p>
                    <p className="compliance-card-hint">
                        <Link to="/hostonboarding">{states.createListing}</Link>
                    </p>
                </>
            );
        }

        return (
            <>
                <div className="pd-field">
                    <label className="pd-field-label" htmlFor="compliance-property">
                        {fields.property}
                    </label>
                    <div className="pd-select-wrapper">
                        <select
                            id="compliance-property"
                            name="propertyId"
                            value={compliance.selectedPropertyId}
                            onChange={handlePropertyChange}
                            disabled={compliance.isSaving}
                            className="pd-field-input pd-field-select"
                        >
                            {compliance.properties.map((property) => (
                                <option key={property.id} value={property.id}>
                                    {buildOptionLabel(property, fields.untitledListing)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="pd-field">
                    <label className="pd-field-label" htmlFor="registration-number">
                        {fields.propertyRegistration}
                    </label>
                    <input
                        id="registration-number"
                        type="text"
                        name="registrationNumber"
                        value={compliance.registrationNumber}
                        onChange={(event) => compliance.updateRegistrationNumber(event.target.value)}
                        disabled={compliance.isRegistrationNumberUnavailable}
                        className="pd-field-input"
                        placeholder={fields.placeholder}
                    />
                </div>
                {compliance.isRegistrationNumberUnavailable && (
                    <p className="pd-field-error">{errors.registrationUnavailable}</p>
                )}
                {!compliance.isRegistrationNumberUnavailable && !compliance.hasSavedRegistrationNumber && (
                    <p className="compliance-card-hint">{fields.noRegistrationYet}</p>
                )}
                <p className="compliance-card-hint">{fields.hint}</p>
            </>
        );
    };

    const showForm = !compliance.isLoading && !compliance.hasLoadError && compliance.properties.length > 0;

    return (
        <SettingsSubPage hubLabel={hub.breadcrumb} breadcrumb={t.breadcrumb} title={t.title} subtitle={t.subtitle}>
            <section className="personal-data-section">
                <h2 className="personal-data-section-title">{t.section}</h2>
                <div className="personal-data-card">
                    <div className="personal-data-card-inner">
                        <div className="personal-data-fields-col">{renderBody()}</div>
                    </div>
                    {showForm && (
                        <div className="personal-data-card-footer">
                            {compliance.errorKey && <p className="pd-field-error">{errors[compliance.errorKey]}</p>}
                            <button
                                type="button"
                                className={`pd-save-btn${compliance.saveSuccess ? " pd-save-btn--saved" : ""}`}
                                onClick={compliance.save}
                                disabled={!compliance.isDirty || compliance.isSaving}
                            >
                                {getSaveLabel(compliance.isSaving, compliance.saveSuccess, buttons)}
                            </button>
                        </div>
                    )}
                </div>
            </section>
        </SettingsSubPage>
    );
};

export default HostSettingsCompliance;
