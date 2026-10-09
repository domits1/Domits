import React from "react";
import useSettingsTrans from "../hooks/useSettingsTrans";
import SettingsSubPage from "../components/SettingsSubPage";
import DirectBookingWebsitePlanSection from "../components/DirectBookingWebsitePlanSection";
import "../styles/hostSettings.css";

const HostSettingsDirectBookingWebsiteRatePlan = () => {
  const { hub, t } = useSettingsTrans("ratePlans");
  const websitePlan = t.websitePlan;

  return (
    <SettingsSubPage
      hubLabel={hub.breadcrumb}
      breadcrumb={websitePlan.breadcrumb}
      title={websitePlan.pageTitle}
      subtitle={websitePlan.pageSubtitle}
    >
      <DirectBookingWebsitePlanSection />
    </SettingsSubPage>
  );
};

export default HostSettingsDirectBookingWebsiteRatePlan;
