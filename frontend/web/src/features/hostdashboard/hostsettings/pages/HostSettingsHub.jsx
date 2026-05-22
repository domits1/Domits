import React, { useContext } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import CorporateFareOutlinedIcon from "@mui/icons-material/CorporateFareOutlined";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { LanguageContext } from "../../../../context/LanguageContext";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import de from "../../../../content/de.json";
import es from "../../../../content/es.json";
import "../styles/hostSettings.css";

const contentByLanguage = { en, nl, de, es };

const CARD_ICONS = {
  "personal-data": <AccountCircleOutlinedIcon />,
  company:         <CorporateFareOutlinedIcon />,
  team:            <PeopleOutlineIcon />,
  "rate-plans":    <PercentOutlinedIcon />,
  compliance:      <VerifiedUserOutlinedIcon />,
};

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
  to:    PropTypes.string.isRequired,
  icon:  PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  desc:  PropTypes.string.isRequired,
};

const HostSettingsHub = () => {
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.settings?.hub ?? contentByLanguage.en.settings.hub;
  const { personalData, company, team, ratePlans, compliance } = t.cards;

  const personalCards = [
    { to: "personal-data", icon: CARD_ICONS["personal-data"], title: personalData.title, desc: personalData.desc },
  ];

  const accountCards = [
    { to: "company",     icon: CARD_ICONS.company,      title: company.title,    desc: company.desc },
    { to: "team",        icon: CARD_ICONS.team,          title: team.title,       desc: team.desc },
    { to: "rate-plans",  icon: CARD_ICONS["rate-plans"], title: ratePlans.title,  desc: ratePlans.desc },
    { to: "compliance",  icon: CARD_ICONS.compliance,    title: compliance.title, desc: compliance.desc },
  ];

  return (
    <div className="host-settings-hub">
      <div className="host-settings-hub-header">
        <h1 className="host-settings-hub-title">{t.title}</h1>
        <p className="host-settings-hub-subtitle">{t.subtitle}</p>
      </div>

      <div className="host-settings-section">
        <h2 className="host-settings-section-title">{t.personalSection}</h2>
        <div className="host-settings-cards-single">
          {personalCards.map((card) => (
            <SettingsCard key={card.to} {...card} />
          ))}
        </div>
      </div>

      <div className="host-settings-section">
        <h2 className="host-settings-section-title">{t.accountSection}</h2>
        <div className="host-settings-cards-grid">
          {accountCards.map((card) => (
            <SettingsCard key={card.to} {...card} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HostSettingsHub;
