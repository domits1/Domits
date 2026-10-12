import React from "react";
import useSettingsTrans from "../hooks/useSettingsTrans";
import SettingsSubPage from "../components/SettingsSubPage";
import useUserProfile from "../../../../hooks/useUserProfile";
import usePasswordChange from "../../../../hooks/usePasswordChange";
import AuthenticationStatusSection from "../../../../components/settings/AuthenticationStatusSection";
import PasswordChangeSection from "../../../../components/settings/PasswordChangeSection";
import "../../../../styles/sass/pages/dashboard/settingsDashboard.css";
import "../styles/hostSettings.css";

const HostSettingsPrivacySecurity = () => {
    const { t, hub } = useSettingsTrans("privacySecurity");
    const { t: personalDataT } = useSettingsTrans("personalData");
    const { authStatus, authStatusLoading, authStatusError, mfaStatusError } = useUserProfile();
    const passwordChange = usePasswordChange();

    return (
        <SettingsSubPage hubLabel={hub.breadcrumb} breadcrumb={t.breadcrumb} title={t.title} subtitle={t.subtitle}>
            <section className="personal-data-section">
                <h2 className="personal-data-section-title">{t.authenticationSection}</h2>
                <div className="personal-data-card personal-data-pref-card">
                    <AuthenticationStatusSection
                        authStatus={authStatus}
                        authStatusLoading={authStatusLoading}
                        authStatusError={authStatusError}
                        mfaStatusError={mfaStatusError}
                        labels={t.auth}
                    />

                    <PasswordChangeSection t={personalDataT} {...passwordChange} />
                </div>
            </section>

            <section className="personal-data-section">
                <h2 className="personal-data-section-title">{t.pinSection}</h2>
                <div className="personal-data-card personal-data-pref-card">
                    <div className="pd-auth-row">
                        <p className="pd-auth-subtext">{t.pin.comingSoon}</p>
                    </div>
                </div>
            </section>
        </SettingsSubPage>
    );
};

export default HostSettingsPrivacySecurity;
