import React from "react";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Link } from "react-router-dom";
import useSettingsTrans from "../hooks/useSettingsTrans";
import SettingsSubPage from "../components/SettingsSubPage";
import "../styles/hostSettings.css";

const HostSettingsRatePlans = () => {
  const { t, hub } = useSettingsTrans("ratePlans");
  const { hostOnlyFee, enterprise } = t;

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
        <div className="personal-data-card enterprise-rate-plan-card">
          <Link
            to="/hostdashboard/settings/rate-plans/enterprise"
            className="rate-plan-item rate-plan-enterprise-link"
          >
            <div className="host-settings-card-icon">
              <PercentOutlinedIcon />
            </div>
            <div className="rate-plan-item-body">
              <span className="rate-plan-item-title">{enterprise.cardTitle}</span>
              <span className="rate-plan-item-sub">{enterprise.cardSubtitle}</span>
              <span className="rate-plan-item-note">{enterprise.cardNote}</span>
            </div>
            <ChevronRightIcon className="host-settings-card-chevron" />
          </Link>
        </div>
      </section>
    </SettingsSubPage>
  );
};

export default HostSettingsRatePlans;
