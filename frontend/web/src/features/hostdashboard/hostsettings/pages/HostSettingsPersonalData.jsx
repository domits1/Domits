import React from "react";
import useSettingsData from "../../../../hooks/useSettingsData";
import PersonalDataForm from "../components/PersonalDataForm";
import "../../../../styles/sass/pages/dashboard/settingsDashboard.css";
import "../styles/hostSettings.css";

const SHOW_PREF_FORMATS = false;
const SHOW_AUTH_MFA = false;

const HostSettingsPersonalData = () => {
    const settingsData = useSettingsData();
    const {
        user,
        tempUser,
        selectedCountryCode,
        stripPhone,
        onSaveUserName,
        onSaveUserEmail,
        onSaveUserPhone,
        onSaveUserDateOfBirth,
        onSaveUserPlaceOfBirth,
        onSaveUserNationality,
    } = settingsData;

    const saveAll = async () => {
        const saves = [];

        if ((tempUser.name || "").trim() !== (user.name || "").trim()) {
            saves.push(onSaveUserName());
        }
        if ((tempUser.email || "").trim() !== (user.email || "").trim()) {
            saves.push(onSaveUserEmail());
        }
        const fullPhone = `${selectedCountryCode}${stripPhone || ""}`.trim();
        if (fullPhone !== (user.phone || "").trim()) {
            saves.push(onSaveUserPhone());
        }
        if ((tempUser.dateOfBirth || "") !== (user.dateOfBirth || "")) {
            saves.push(onSaveUserDateOfBirth());
        }
        if ((tempUser.placeOfBirth || "") !== (user.placeOfBirth || "")) {
            saves.push(onSaveUserPlaceOfBirth());
        }
        if ((tempUser.nationality || "").trim() !== (user.nationality || "").trim()) {
            saves.push(onSaveUserNationality());
        }

        await Promise.allSettled(saves);
    };

    return (
        <PersonalDataForm
            {...settingsData}
            showPrefFormats={SHOW_PREF_FORMATS}
            showAuthMfa={SHOW_AUTH_MFA}
            onSaveAll={saveAll}
            onVerifyEmail={settingsData.onSaveUserEmail}
        />
    );
};

export default HostSettingsPersonalData;
