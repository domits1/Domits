import React from "react";
import { useNavigate } from "react-router-dom";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import { SettingsContent } from "../../../../components/settings/SettingsComponents";
import useSettingsData from "../../../../hooks/useSettingsData";
import "../../../../styles/sass/pages/dashboard/settingsDashboard.css";
import "../styles/hostSettings.css";

const SHOW_PREF_FORMATS = false;
const SHOW_AUTH_MFA = false;

const HostSettingsPersonalData = () => {
    const settingsData = useSettingsData();
    const navigate = useNavigate();

    return (
        <div className="host-settings-subpage">
            <button className="host-settings-back" onClick={() => navigate(-1)} type="button">
                <ArrowBackOutlinedIcon sx={{ fontSize: 18 }} />
                Settings
            </button>
            <div className="page-body settings-page">
                <h2>Personal Data</h2>
                <div className="dashboards">
                    <div className="content">
                        <SettingsContent
                            {...settingsData}
                            showPrefFormats={SHOW_PREF_FORMATS}
                            showAuthMfa={SHOW_AUTH_MFA}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HostSettingsPersonalData;
