import React, { useEffect } from "react";
import SettingsSubPage from "../../hostsettings/components/SettingsSubPage";
import useSettingsTrans from "../../hostsettings/hooks/useSettingsTrans";
import { useRemoteLock } from "../hooks/useRemoteLock";
import RemoteLockStatusCard from "../components/RemoteLockStatusCard";
import "../../hostsettings/styles/hostSettings.css";
import "../styles/HomeAutomation.css";

function HomeAutomationView() {
  const { t, hub, language } = useSettingsTrans("homeAutomation");
  const { status, lastSyncAt, loading, error, reload } = useRemoteLock();

  // The host sees a fixed message; the real detail goes to the console.
  useEffect(() => {
    if (error) console.error("Failed to load the RemoteLock status:", error);
  }, [error]);

  return (
    <SettingsSubPage hubLabel={hub.breadcrumb} breadcrumb={t.breadcrumb} title={t.title} subtitle={t.subtitle}>
      <div className="host-homeauto">
        {loading && (
          <p className="host-homeauto__message" role="status">
            {t.loading}
          </p>
        )}

        {!loading && error && (
          <div className="host-homeauto__error" role="alert">
            <p className="host-homeauto__error-text">{t.loadError}</p>
            <button type="button" className="host-homeauto__retry" onClick={reload}>
              {t.retry}
            </button>
          </div>
        )}

        {!loading && !error && (
          <RemoteLockStatusCard status={status} lastSyncAt={lastSyncAt} copy={t} language={language} />
        )}
      </div>
    </SettingsSubPage>
  );
}

export default HomeAutomationView;
