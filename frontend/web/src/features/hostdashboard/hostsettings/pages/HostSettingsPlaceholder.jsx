import React from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import "../styles/hostSettings.css";

const HostSettingsPlaceholder = ({ title }) => {
    const navigate = useNavigate();

    return (
        <div className="host-settings-subpage">
            <button className="host-settings-back" onClick={() => navigate(-1)} type="button">
                <ArrowBackOutlinedIcon sx={{ fontSize: 18 }} />
                Settings
            </button>
            <div className="page-body settings-page">
                <h2>{title}</h2>
                <div className="host-settings-coming-soon">
                    <p>This section is coming soon.</p>
                </div>
            </div>
        </div>
    );
};

HostSettingsPlaceholder.propTypes = {
    title: PropTypes.string.isRequired,
};

export default HostSettingsPlaceholder;
