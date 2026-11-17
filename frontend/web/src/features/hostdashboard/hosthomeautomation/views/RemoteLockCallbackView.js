import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import SettingsSubPage from "../../hostsettings/components/SettingsSubPage";
import useSettingsTrans from "../../hostsettings/hooks/useSettingsTrans";
import { HOME_AUTOMATION_CALLBACK_PATH, HOME_AUTOMATION_PATH } from "../constants/homeAutomationConstants";
import { completeRemoteLockConnect } from "../services/remoteLockService";
import { getErrorMessageKey } from "../utils/remoteLockErrors";
import "../../hostsettings/styles/hostSettings.css";
import "../styles/HomeAutomation.css";

// Where RemoteLock sends the host back with a one-time code and the state this app issued. Neither value is ever
// shown or logged, and both leave the address bar before anything else happens.
function RemoteLockCallbackView() {
  const { t, hub } = useSettingsTrans("homeAutomation");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [errorKey, setErrorKey] = useState(null);
  // The code can be used once, and React runs effects twice in development.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = params.get("code");
    const state = params.get("state");
    const wasCancelled = params.has("error");
    navigate(HOME_AUTOMATION_CALLBACK_PATH, { replace: true });

    if (wasCancelled) {
      setErrorKey("cancelled");
    } else if (!code || !state) {
      setErrorKey("missingParams");
    } else {
      completeRemoteLockConnect({ code, state })
        .then(() => navigate(HOME_AUTOMATION_PATH, { replace: true }))
        .catch((error) => {
          console.error("Failed to complete the RemoteLock connection:", error?.code || "unknown");
          setErrorKey(getErrorMessageKey(error?.code) ?? "generic");
        });
    }
  }, [navigate, params]);

  return (
    <SettingsSubPage hubLabel={hub.breadcrumb} breadcrumb={t.breadcrumb} title={t.callback.title} subtitle="">
      <div className="host-homeauto">
        {errorKey ? (
          <div className="host-homeauto__error" role="alert">
            <p className="host-homeauto__error-text">{t.errors[errorKey] ?? t.modal.error}</p>
            <Link className="host-homeauto__retry" to={HOME_AUTOMATION_PATH}>
              {t.callback.back}
            </Link>
          </div>
        ) : (
          <p className="host-homeauto__message" role="status">
            {t.callback.working}
          </p>
        )}
      </div>
    </SettingsSubPage>
  );
}

export default RemoteLockCallbackView;
