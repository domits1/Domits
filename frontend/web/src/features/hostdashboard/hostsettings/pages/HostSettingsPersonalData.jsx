import React from "react";
import useSettingsData from "../../../../hooks/useSettingsData";
import usePersonalDataSave from "../../../../hooks/usePersonalDataSave";
import PersonalDataForm from "../components/PersonalDataForm";
import "../../../../styles/sass/pages/dashboard/settingsDashboard.css";
import "../styles/hostSettings.css";

const SHOW_PREF_FORMATS = false;
const SHOW_AUTH_MFA = false;

const HostSettingsPersonalData = () => {
    const settingsData = useSettingsData();
    const { saveAll, isSaving, saveSuccess } = usePersonalDataSave(settingsData);

    return (
        <PersonalDataForm
            {...settingsData}
            showPrefFormats={SHOW_PREF_FORMATS}
            showAuthMfa={SHOW_AUTH_MFA}
            onSaveAll={saveAll}
            isSaving={isSaving}
            saveSuccess={saveSuccess}
            onVerifyEmail={settingsData.onSaveUserEmail}
            breadcrumbPath="/hostdashboard/settings"
        />
    );
};

export default HostSettingsPersonalData;
