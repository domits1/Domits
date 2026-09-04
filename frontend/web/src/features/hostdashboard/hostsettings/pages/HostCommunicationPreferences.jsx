import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { LanguageContext } from "../../../../context/LanguageContext";
import NotificationPreferencesForm from "../../../../components/settings/NotificationPreferencesForm";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import de from "../../../../content/de.json";
import es from "../../../../content/es.json";
import "../../../../styles/sass/pages/dashboard/settingsDashboard.css";
import "../styles/hostSettings.css";

const contentByLanguage = { en, nl, de, es };

const HostCommunicationPreferences = () => {
    const { language } = useContext(LanguageContext);
    const settingsContent = contentByLanguage[language]?.settings ?? contentByLanguage.en.settings;
    const t = settingsContent.communicationPreferences;

    return (
        <div className="personal-data-page">
            <div className="personal-data-breadcrumb">
                <Link to="/hostdashboard/settings">{settingsContent.hub.breadcrumb}</Link>
                <span className="personal-data-breadcrumb-sep">/</span>
                <span className="personal-data-breadcrumb-current">{t.breadcrumb}</span>
            </div>

            <div className="personal-data-header">
                <h1 className="personal-data-title">{t.title}</h1>
                <p className="personal-data-subtitle">{t.subtitle}</p>
            </div>

            <NotificationPreferencesForm labels={t} />
        </div>
    );
};

export default HostCommunicationPreferences;