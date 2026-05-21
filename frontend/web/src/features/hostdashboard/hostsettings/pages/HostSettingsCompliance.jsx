import React, { useState, useContext } from "react";
import { Link } from "react-router-dom";
import { LanguageContext } from "../../../../context/LanguageContext";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import de from "../../../../content/de.json";
import es from "../../../../content/es.json";
import "../../../../styles/sass/pages/dashboard/settingsDashboard.css";
import "../styles/hostSettings.css";

const contentByLanguage = { en, nl, de, es };

const HostSettingsCompliance = () => {
    const [registrationNumber, setRegistrationNumber] = useState("");
    const { language } = useContext(LanguageContext);
    const t   = contentByLanguage[language]?.settings?.compliance ?? contentByLanguage.en.settings.compliance;
    const hub = contentByLanguage[language]?.settings?.hub        ?? contentByLanguage.en.settings.hub;

    return (
        <div className="personal-data-page">
            <nav className="personal-data-breadcrumb">
                <Link to="/hostdashboard/settings">{hub.breadcrumb}</Link>
                <span className="personal-data-breadcrumb-sep">/</span>
                <span className="personal-data-breadcrumb-current">{t.breadcrumb}</span>
            </nav>

            <header className="personal-data-header">
                <h1 className="personal-data-title">{t.title}</h1>
                <p className="personal-data-subtitle">{t.subtitle}</p>
            </header>

            <section className="personal-data-section">
                <h2 className="personal-data-section-title">{t.section}</h2>
                <div className="personal-data-card">
                    <div className="personal-data-card-inner">
                        <div className="personal-data-fields-col">
                            <div className="pd-field">
                                <label className="pd-field-label" htmlFor="registration-number">
                                    {t.fields.propertyRegistration}
                                </label>
                                <input
                                    id="registration-number"
                                    type="text"
                                    name="registrationNumber"
                                    value={registrationNumber}
                                    onChange={(e) => setRegistrationNumber(e.target.value)}
                                    className="pd-field-input"
                                    placeholder={t.fields.placeholder}
                                />
                            </div>
                            <p className="compliance-card-hint">{t.fields.hint}</p>
                        </div>
                    </div>
                    <div className="personal-data-card-footer">
                        <button type="button" className="pd-save-btn" disabled>
                            {t.buttons.comingSoon}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HostSettingsCompliance;
