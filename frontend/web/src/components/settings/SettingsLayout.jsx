import React from "react";
import PropTypes from "prop-types";
import '../../styles/sass/pages/dashboard/settingsDashboard.css';

const SettingsLayout = ({children}) => (
    <div className="page-body settings-page">
        <h2>Settings</h2>
        <div className="dashboards">
            <div className="content">{children}</div>
        </div>
    </div>
);

SettingsLayout.propTypes = {
    children: PropTypes.node.isRequired,
};

export default SettingsLayout;
