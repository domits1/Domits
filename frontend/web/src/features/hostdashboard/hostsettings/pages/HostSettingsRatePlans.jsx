import React from "react";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import useSettingsTrans from "../hooks/useSettingsTrans";
import SettingsSubPage from "../components/SettingsSubPage";
import "../styles/hostSettings.css";

const HostSettingsRatePlans = () => {
  const { t, hub } = useSettingsTrans("ratePlans");
  const { hostOnlyFee } = t;

  return (
    <SettingsSubPage hubLabel={hub.breadcrumb} breadcrumb={t.breadcrumb} title={t.title} subtitle={t.subtitle}>
      <section className="personal-data-section">
        <h2 className="personal-data-section-title">{t.standardSection}</h2>
        <div className="personal-data-card">
          <div className="rate-plan-item">
            <div className="host-settings-card-icon">
              <PercentOutlinedIcon />
            </div>
            <div className="rate-plan-item-body">
              <span className="rate-plan-item-title">{hostOnlyFee.title}</span>
              <span className="rate-plan-item-sub">{hostOnlyFee.sub}</span>
              <span className="rate-plan-item-note">{hostOnlyFee.note}</span>
            </div>
            <ChevronRightIcon className="host-settings-card-chevron" />
          </div>
        </div>
      </section>

      <section className="personal-data-section">
        <h2 className="personal-data-section-title">{t.additionalSection}</h2>
        <p className="personal-data-subtitle">{t.additionalSubtitle}</p>
      </section>
    </SettingsSubPage>
  );
};

export default HostSettingsRatePlans;
