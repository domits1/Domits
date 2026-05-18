import React from "react";
import { Link } from "react-router-dom";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import CorporateFareOutlinedIcon from "@mui/icons-material/CorporateFareOutlined";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import "../styles/hostSettings.css";

const PERSONAL_CARDS = [
  {
    to: "personal-data",
    icon: <AccountCircleOutlinedIcon />,
    title: "Personal Data",
    desc: "Manage your contact info, profile photo and personal details.",
  },
];

const ACCOUNT_CARDS = [
  {
    to: "company",
    icon: <CorporateFareOutlinedIcon />,
    title: "Company",
    desc: "Manage your company name and basic details.",
  },
  {
    to: "team",
    icon: <PeopleOutlineIcon />,
    title: "Team",
    desc: "Manage your primary host and team members.",
  },
  {
    to: "rate-plans",
    icon: <PercentOutlinedIcon />,
    title: "Rate Plans",
    desc: "View your 10% host-only and future pricing options.",
  },
  {
    to: "compliance",
    icon: <VerifiedUserOutlinedIcon />,
    title: "Compliance",
    desc: "Manage your registration number and verification.",
  },
];

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

const HostSettingsHub = () => (
  <div className="host-settings-hub">
    <div className="host-settings-hub-header">
      <h1 className="host-settings-hub-title">Settings</h1>
      <p className="host-settings-hub-subtitle">
        Manage your personal and account settings in one place
      </p>
    </div>

    <div className="host-settings-section">
      <h2 className="host-settings-section-title">Personal Settings</h2>
      <div className="host-settings-cards-single">
        {PERSONAL_CARDS.map((card) => (
          <SettingsCard key={card.to} {...card} />
        ))}
      </div>
    </div>

    <div className="host-settings-section">
      <h2 className="host-settings-section-title">Account Settings</h2>
      <div className="host-settings-cards-grid">
        {ACCOUNT_CARDS.map((card) => (
          <SettingsCard key={card.to} {...card} />
        ))}
      </div>
    </div>
  </div>
);

export default HostSettingsHub;
