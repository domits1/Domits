import React, { useState } from "react";
import useSettingsTrans from "../hooks/useSettingsTrans";
import SettingsSubPage from "../components/SettingsSubPage";
import "../../../../styles/sass/pages/dashboard/settingsDashboard.css";
import "../styles/hostSettings.css";

const HostSettingsCompliance = () => {
    const [registrationNumber, setRegistrationNumber] = useState("");
    const { t, hub } = useSettingsTrans("compliance");
    const { fields, buttons } = t;

    return (
        <SettingsSubPage hubLabel={hub.breadcrumb} breadcrumb={t.breadcrumb} title={t.title} subtitle={t.subtitle}>
            <section className="personal-data-section">
                <h2 className="personal-data-section-title">{t.section}</h2>
                <div className="personal-data-card">
                    <div className="personal-data-card-inner">
                        <div className="personal-data-fields-col">
                            <div className="pd-field">
                                <label className="pd-field-label" htmlFor="registration-number">
                                    {fields.propertyRegistration}
                                </label>
                                <input
                                    id="registration-number"
                                    type="text"
                                    name="registrationNumber"
                                    value={registrationNumber}
                                    onChange={(e) => setRegistrationNumber(e.target.value)}
                                    className="pd-field-input"
                                    placeholder={fields.placeholder}
                                />
                            </div>
                            <p className="compliance-card-hint">{fields.hint}</p>
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

export default HostSettingsCompliance;
