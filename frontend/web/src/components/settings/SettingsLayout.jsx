import React from "react";
import PropTypes from "prop-types";
import '../../styles/sass/pages/dashboard/settingsDashboard.css';

const SettingsLayout = ({ children }) => (
    <div className="settingsPage">
        <div className="settingsContainer">
            <h1 className="settingsTitle">Settings</h1>
            <div className="settingsContentWrapper">
                {children}
            </div>
        </div>
    </div>
);

SettingsLayout.propTypes = {
    children: PropTypes.node.isRequired,
};

export default SettingsLayout;