import React from "react";
import { SettingsLayout, SettingsContent } from "../../components/settings/SettingsComponents";
import useSettingsData from "../../hooks/useSettingsData";

const GuestDashboard = () => {
    const settingsData = useSettingsData();

    return (
        <SettingsLayout>
            <SettingsContent {...settingsData} />
        </SettingsLayout>
    );
};

export default GuestDashboard;