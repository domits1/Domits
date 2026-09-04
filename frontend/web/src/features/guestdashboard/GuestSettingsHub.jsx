import React, { useContext } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { LanguageContext } from "../../context/LanguageContext";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";
import "../hostdashboard/hostsettings/styles/hostSettings.css";

const contentByLanguage = { en, nl, de, es };

const SettingsCard = ({ to, icon, title, desc }) => (
    <Link to={to} className="host-settings-card">
        <div className="host-settings-card-icon">{icon}</div>
        <div className="host-settings-card-body">
            <div className="host-settings-card-title">{title}</div>
            <div className="host-settings-card-desc">{desc}</div>
        </div>
        <ChevronRightIcon className="host-settings-card-chevron" />
    </Link>
);

SettingsCard.propTypes = {
    to: PropTypes.string.isRequired,
    icon: PropTypes.node.isRequired,
    title: PropTypes.string.isRequired,
    desc: PropTypes.string.isRequired,
};

const GuestSettingsHub = () => {
    const { language } = useContext(LanguageContext);
    const t = contentByLanguage[language]?.settings?.hub ?? contentByLanguage.en.settings.hub;
    const { personalData, communicationPreferences } = t.cards;

    return (
        <div className="host-settings-hub">
            <div className="host-settings-hub-header">
                <h1 className="host-settings-hub-title">{t.title}</h1>
                <p className="host-settings-hub-subtitle">{t.subtitle}</p>
            </div>

            <div className="host-settings-section">
                <h2 className="host-settings-section-title">{t.personalSection}</h2>
                <div className="host-settings-cards-single">
                    <SettingsCard
                        to="/guestdashboard/settings/personal-data"
                        icon={<AccountCircleOutlinedIcon />}
                        title={personalData.title}
                        desc={personalData.desc}
                    />
                    <SettingsCard
                        to="/guestdashboard/settings/communication-preferences"
                        icon={<NotificationsNoneOutlinedIcon />}
                        title={communicationPreferences.title}
                        desc={communicationPreferences.desc}
                    />
                </div>
            </div>
        </div>
    );
};

export default GuestSettingsHub;