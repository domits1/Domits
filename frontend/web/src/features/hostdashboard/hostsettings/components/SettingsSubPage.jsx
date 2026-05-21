import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

const SettingsSubPage = ({ hubLabel, breadcrumb, title, subtitle, children }) => (
    <div className="personal-data-page">
        <nav className="personal-data-breadcrumb">
            <Link to="/hostdashboard/settings">{hubLabel}</Link>
            <span className="personal-data-breadcrumb-sep">/</span>
            <span className="personal-data-breadcrumb-current">{breadcrumb}</span>
        </nav>
        <header className="personal-data-header">
            <h1 className="personal-data-title">{title}</h1>
            <p className="personal-data-subtitle">{subtitle}</p>
        </header>
        {children}
    </div>
);

SettingsSubPage.propTypes = {
    hubLabel:   PropTypes.string.isRequired,
    breadcrumb: PropTypes.string.isRequired,
    title:      PropTypes.string.isRequired,
    subtitle:   PropTypes.string.isRequired,
    children:   PropTypes.node.isRequired,
};

export default SettingsSubPage;
