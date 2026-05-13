import React from "react";
import { Link } from "react-router-dom";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import GppGoodOutlinedIcon from "@mui/icons-material/GppGoodOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import "./hostsettings/styles/hostSettings.css";

const SettingCard = ({ icon: Icon, title, description, to }) => (
    <Link className="host-settings-card" to={to}>
        <div className="host-settings-card-icon">
            <Icon sx={{ fontSize: 26, color: "#15803d" }} />
        </div>
        <div className="host-settings-card-body">
            <span className="host-settings-card-title">{title}</span>
            <span className="host-settings-card-desc">{description}</span>
        </div>
        <ChevronRightIcon sx={{ color: "#9ca3af", fontSize: 20 }} />
    </Link>
);

const HostSettings = () => (
    <div className="host-settings-hub">
        <div className="host-settings-hub-header">
            <h1 className="host-settings-hub-title">Settings</h1>
            <p className="host-settings-hub-subtitle">Manage your personal and account settings in one place</p>
        </div>

        <section className="host-settings-section">
            <h2 className="host-settings-section-title">Personal Settings</h2>
            <div className="host-settings-cards-single">
                <SettingCard
                    icon={AccountCircleOutlinedIcon}
                    title="Personal Data"
                    description="Manage your contact info, profile photo and personal details."
                    to="personal-data"
                />
            </div>
        </section>

        <section className="host-settings-section">
            <h2 className="host-settings-section-title">Account Settings</h2>
            <div className="host-settings-cards-grid">
                <SettingCard
                    icon={BusinessOutlinedIcon}
                    title="Company"
                    description="Manage your company name and basic details."
                    to="company"
                />
                <SettingCard
                    icon={GroupOutlinedIcon}
                    title="Team"
                    description="Manage your primary host and team members."
                    to="team"
                />
                <SettingCard
                    icon={PercentOutlinedIcon}
                    title="Rate Plans"
                    description="View your 10% host-only and future pricing options."
                    to="rate-plans"
                />
                <SettingCard
                    icon={GppGoodOutlinedIcon}
                    title="Compliance"
                    description="Manage your registration number and verification."
                    to="compliance"
                />
            </div>
        </section>
    </div>
);

export default HostSettings;
