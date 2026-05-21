import React, { useContext } from "react";
import { Link } from "react-router-dom";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { LanguageContext } from "../../../../context/LanguageContext";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import de from "../../../../content/de.json";
import es from "../../../../content/es.json";
import "../styles/hostSettings.css";

const contentByLanguage = { en, nl, de, es };

const HostSettingsRatePlans = () => {
    const { language } = useContext(LanguageContext);
    const t = contentByLanguage[language]?.settings?.ratePlans ?? contentByLanguage.en.settings.ratePlans;
    const hub = contentByLanguage[language]?.settings?.hub ?? contentByLanguage.en.settings.hub;

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
                <h2 className="personal-data-section-title">{t.standardSection}</h2>
                <div className="personal-data-card">
                    <div className="rate-plan-item">
                        <div className="host-settings-card-icon">
                            <PercentOutlinedIcon />
                        </div>
                        <div className="rate-plan-item-body">
                            <span className="rate-plan-item-title">{t.hostOnlyFee.title}</span>
                            <span className="rate-plan-item-sub">{t.hostOnlyFee.sub}</span>
                            <span className="rate-plan-item-note">{t.hostOnlyFee.note}</span>
                        </div>
                        <ChevronRightIcon className="host-settings-card-chevron" />
                    </div>
                </div>
            </section>

            <section className="personal-data-section">
                <h2 className="personal-data-section-title">{t.additionalSection}</h2>
                <p className="personal-data-subtitle">{t.additionalSubtitle}</p>
            </section>
        </div>
    );
};

export default HostSettingsRatePlans;
