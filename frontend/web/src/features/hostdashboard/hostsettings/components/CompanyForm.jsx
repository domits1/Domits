import React from "react";
import PropTypes from "prop-types";
import useSettingsTrans from "../hooks/useSettingsTrans";
import SettingsSubPage from "./SettingsSubPage";

const CompanyForm = ({ companyName, onChange }) => {
    const { t, hub } = useSettingsTrans("company");
    const { fields, buttons } = t;

    return (
        <SettingsSubPage hubLabel={hub.breadcrumb} breadcrumb={t.breadcrumb} title={t.title} subtitle={t.subtitle}>
            <section className="personal-data-section">
                <h2 className="personal-data-section-title">{t.section}</h2>
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
                                    value={companyName}
                                    onChange={onChange}
                                    className="pd-field-input"
                                    placeholder={fields.placeholder}
                                />
                            </div>
                            <p className="company-card-hint">{fields.hint}</p>
                        </div>
                    </div>
                    <div className="personal-data-card-footer">
                        <button type="button" className="pd-save-btn" disabled>
                            {buttons.comingSoon}
                        </button>
                    </div>
                </div>
            </section>
        </SettingsSubPage>
    );
};

CompanyForm.propTypes = {
    companyName: PropTypes.string.isRequired,
    onChange:    PropTypes.func.isRequired,
};

export default CompanyForm;
