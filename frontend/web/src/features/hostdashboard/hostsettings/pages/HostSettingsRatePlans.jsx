import React from "react";
import { Link } from "react-router-dom";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import "../styles/hostSettings.css";

const HostSettingsRatePlans = () => (
    <div className="personal-data-page">
        <nav className="personal-data-breadcrumb">
            <Link to="/hostdashboard/settings">Settings</Link>
            <span className="personal-data-breadcrumb-sep">/</span>
            <span className="personal-data-breadcrumb-current">Rate Plans</span>
        </nav>

        <header className="personal-data-header">
            <h1 className="personal-data-title">Rate Plans</h1>
            <p className="personal-data-subtitle">Manage your rate plans.</p>
        </header>

        <section className="personal-data-section">
            <h2 className="personal-data-section-title">Standard Rate Plan</h2>
            <div className="personal-data-card">
                <div className="rate-plan-item">
                    <div className="host-settings-card-icon">
                        <PercentOutlinedIcon />
                    </div>
                    <div className="rate-plan-item-body">
                        <span className="rate-plan-item-title">Host Only Fee</span>
                        <span className="rate-plan-item-sub">10% of bookings paid by host</span>
                        <span className="rate-plan-item-note">Allows Domits to run the platform 24/7</span>
                    </div>
                    <ChevronRightIcon className="host-settings-card-chevron" />
                </div>
            </div>
        </section>

        <section className="personal-data-section">
            <h2 className="personal-data-section-title">Additional Plans</h2>
            <p className="personal-data-subtitle">
                Additional rate plans for direct bookings will be available soon.
            </p>
        </section>
    </div>
);

export default HostSettingsRatePlans;
