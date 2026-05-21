import React, { useContext } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { LanguageContext } from "../../../../context/LanguageContext";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import de from "../../../../content/de.json";
import es from "../../../../content/es.json";

const contentByLanguage = { en, nl, de, es };

const CompanyForm = ({ companyName, onChange }) => {
    const { language } = useContext(LanguageContext);
    const t   = contentByLanguage[language]?.settings?.company ?? contentByLanguage.en.settings.company;
    const hub = contentByLanguage[language]?.settings?.hub     ?? contentByLanguage.en.settings.hub;

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
                                <label className="pd-field-label" htmlFor="company-name">
                                    {t.fields.companyName}
                                </label>
                                <input
                                    id="company-name"
                                    type="text"
                                    name="companyName"
                                    value={companyName}
                                    onChange={onChange}
                                    className="pd-field-input"
                                    placeholder={t.fields.placeholder}
                                />
                            </div>
                            <p className="company-card-hint">{t.fields.hint}</p>
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

CompanyForm.propTypes = {
    companyName: PropTypes.string.isRequired,
    onChange:    PropTypes.func.isRequired,
};

export default CompanyForm;
