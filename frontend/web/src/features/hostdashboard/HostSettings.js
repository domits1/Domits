import React from "react";
import { Link } from "react-router-dom";
import {SettingsLayout, SettingsContent} from "../../components/settings/SettingsComponents";
import useSettingsData from "../../hooks/useSettingsData";

const SHOW_PREF_FORMATS = false;
const SHOW_AUTH_MFA = false;

const HostSettings = () => {
    const settingsData = useSettingsData();

    return (
        <SettingsLayout>
            <nav className="settings-subnav">
                <Link to="/hostdashboard/settings" className="settings-subnav-link active">Profile</Link>
                <Link to="/hostdashboard/settings/team" className="settings-subnav-link">Team</Link>
            </nav>
            <SettingsContent
                {...settingsData}
                showPrefFormats={SHOW_PREF_FORMATS}
                showAuthMfa={SHOW_AUTH_MFA}
            />
        </SettingsLayout>
    );
};

export default HostSettings;
