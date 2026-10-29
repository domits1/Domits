import React, { useCallback, useEffect, useState } from "react";
import SettingsSubPage from "../../hostsettings/components/SettingsSubPage";
import useSettingsTrans from "../../hostsettings/hooks/useSettingsTrans";
import { useRemoteLock } from "../hooks/useRemoteLock";
import { useRemoteLockDevices } from "../hooks/useRemoteLockDevices";
import RemoteLockStatusCard from "../components/RemoteLockStatusCard";
import RemoteLockDevicesList from "../components/RemoteLockDevicesList";
import RemoteLockConfirmModal from "../components/RemoteLockConfirmModal";
import { getErrorMessageKey } from "../utils/remoteLockErrors";
import "../../hostsettings/styles/hostSettings.css";
import "../styles/HomeAutomation.css";

function HomeAutomationView() {
  const { t, hub, language } = useSettingsTrans("homeAutomation");
  const { status, lastSyncAt, loading, error, reload, applyResult } = useRemoteLock();
  const [activeAction, setActiveAction] = useState(null);
  const connected = status === "CONNECTED";
  const devices = useRemoteLockDevices(connected);

  // The host sees a fixed message; the real detail goes to the console.
  useEffect(() => {
    if (error) console.error("Failed to load the RemoteLock status:", error);
  }, [error]);

  useEffect(() => {
    if (devices.error) console.error("Failed to load the RemoteLock devices:", devices.error);
  }, [devices.error]);

  const closeModal = useCallback(() => setActiveAction(null), []);

  const handleDone = (result) => {
    applyResult(result);
    setActiveAction(null);
  };

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
          <>
            <RemoteLockStatusCard
              status={status}
              lastSyncAt={lastSyncAt}
              copy={t}
              language={language}
              onAction={setActiveAction}
            />
            <RemoteLockDevicesList
              connected={connected}
              devices={devices.devices}
              truncated={devices.truncated}
              loading={devices.loading}
              error={devices.error}
              errorText={t.errors[getErrorMessageKey(devices.errorCode)]}
              onRetry={devices.retry}
              copy={t.devices}
              language={language}
            />
            {activeAction && (
              <RemoteLockConfirmModal variant={activeAction} copy={t} onClose={closeModal} onDone={handleDone} />
            )}
          </>
        )}
      </div>
    </SettingsSubPage>
  );
}

export default HomeAutomationView;
