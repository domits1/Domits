import React from "react";
import {SettingsLayout, SettingsContent} from "../../components/settings/SettingsComponents";
import useSettingsData from "../../hooks/useSettingsData";

const SHOW_PREF_FORMATS = false;
const SHOW_AUTH_MFA = false;

const GuestDashboard = () => {
    const settingsData = useSettingsData();

    return (
        <SettingsLayout>
            <SettingsContent
                {...settingsData}
                showPrefFormats={SHOW_PREF_FORMATS}
                showAuthMfa={SHOW_AUTH_MFA}
            />
        </SettingsLayout>
    );
};

export default GuestDashboard;
