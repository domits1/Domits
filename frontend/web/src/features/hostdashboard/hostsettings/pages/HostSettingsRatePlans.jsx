import React from "react";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Link } from "react-router-dom";
import useSettingsTrans from "../hooks/useSettingsTrans";
import SettingsSubPage from "../components/SettingsSubPage";
import "../styles/hostSettings.css";

const RatePlanCard = ({ to, title, subtitle, note, linkClassName }) => (
  <div className="personal-data-card enterprise-rate-plan-card">
    <Link to={to} className={`rate-plan-item ${linkClassName}`}>
      <div className="host-settings-card-icon">
        <PercentOutlinedIcon />
      </div>
      <div className="rate-plan-item-body">
        <span className="rate-plan-item-title">{title}</span>
        <span className="rate-plan-item-sub">{subtitle}</span>
        <span className="rate-plan-item-note">{note}</span>
      </div>
      <ChevronRightIcon className="host-settings-card-chevron" />
    </Link>
  </div>
);

const HostSettingsRatePlans = () => {
  const { t, hub } = useSettingsTrans("ratePlans");
  const { hostOnlyFee, directBooking, enterprise, websitePlan } = t;

  return (
    <SettingsSubPage
      hubLabel={hub.breadcrumb}
      breadcrumb={t.breadcrumb}
      title={t.title}
      subtitle={t.subtitle}
    >
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
        <div className="host-settings-cards-grid rate-plan-cards-grid">
          <RatePlanCard
            to="/hostdashboard/settings/rate-plans/direct-booking"
            title={directBooking.cardTitle}
            subtitle={directBooking.cardSubtitle}
            note={directBooking.cardNote}
            linkClassName="rate-plan-direct-booking-link"
          />
          <RatePlanCard
            to="/hostdashboard/settings/rate-plans/enterprise"
            title={enterprise.cardTitle}
            subtitle={enterprise.cardSubtitle}
            note={enterprise.cardNote}
            linkClassName="rate-plan-enterprise-link"
          />

          <RatePlanCard
            to="/hostdashboard/settings/rate-plans/direct-booking-website"
            title={websitePlan.cardTitle}
            subtitle={websitePlan.cardSubtitle}
            note={websitePlan.cardNote}
            linkClassName="rate-plan-website-link"
          />
        </div>
      </section>
    </SettingsSubPage>
  );
};

export default HostSettingsRatePlans;
