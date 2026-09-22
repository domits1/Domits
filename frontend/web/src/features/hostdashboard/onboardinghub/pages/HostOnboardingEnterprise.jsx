import React, { useContext, useEffect, useMemo, useState } from "react";
import { LanguageContext } from "../../../../context/LanguageContext";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import de from "../../../../content/de.json";
import es from "../../../../content/es.json";
import SettingsSubPage from "../../hostsettings/components/SettingsSubPage";
import OnboardingModeTabs from "../components/OnboardingModeTabs";
import OnboardingStepTile from "../components/OnboardingStepTile";
import OnboardingProgressBar from "../components/OnboardingProgressBar";
import {
  fetchHostProperties,
  checkCompanyStatus,
  checkTeamStatus,
  checkAnyPropertyListedStatus,
  checkAnyWebsiteStatus,
  checkAccountChannelsStatus,
  checkPaymentsStatus,
  checkPricingStatus,
  checkTasksStatus,
  checkMarketplaceStatus,
  computeIsGoLiveReady,
} from "../services/onboardingStatusService";
import "../../hostsettings/styles/hostSettings.css";
import "../styles/onboardingHub.css";

const contentByLanguage = { en, nl, de, es };

const STEP_KEYS = [
  "company",
  "team",
  "listProperties",
  "website",
  "channels",
  "payments",
  "pricing",
  "tasks",
  "marketplace",
];
const REQUIRED_STEP_KEYS = new Set(["company", "team", "listProperties", "website", "payments"]);

// Channels and Pricing point at Calendar & Pricing for now rather than their
// eventual dedicated pages (Channex account settings, PriceLabs setup) --
// the destination asked for while those flows are not ready yet.
const STEP_LINKS = {
  company: "/hostdashboard/settings/company",
  team: "/hostdashboard/settings/team",
  listProperties: "/hostdashboard/listings",
  website: "/hostdashboard/website",
  channels: "/hostdashboard/calendar-pricing",
  payments: "/hostdashboard/finance",
  pricing: "/hostdashboard/calendar-pricing",
  tasks: "/hostdashboard/tasks",
  marketplace: "/hostdashboard/integrations-marketplace",
};

const UNKNOWN_STATUS = { complete: false, scope: "account", unknown: true };

const HostOnboardingEnterprise = () => {
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.settings?.onboardingHub ?? contentByLanguage.en.settings.onboardingHub;
  const enterprise = t.enterprise;
  const hub = contentByLanguage[language]?.settings?.hub ?? contentByLanguage.en.settings.hub;

  const [stepStatus, setStepStatus] = useState({});
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    (async () => {
      let hostProperties = [];
      let propertiesFailed = false;
      try {
        hostProperties = await fetchHostProperties();
      } catch {
        propertiesFailed = true;
      }
      if (isCancelled) return;

      const [company, team, website, channels, payments, pricing, tasks, marketplace] = await Promise.all([
        checkCompanyStatus(),
        checkTeamStatus(),
        propertiesFailed ? Promise.resolve(UNKNOWN_STATUS) : checkAnyWebsiteStatus(hostProperties),
        checkAccountChannelsStatus(),
        checkPaymentsStatus(),
        checkPricingStatus(),
        checkTasksStatus(),
        checkMarketplaceStatus(),
      ]);

      const listProperties = propertiesFailed ? UNKNOWN_STATUS : checkAnyPropertyListedStatus(hostProperties);

      if (!isCancelled) {
        setStepStatus({ company, team, listProperties, website, channels, payments, pricing, tasks, marketplace });
        setIsLoadingStatus(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  const completedCount = STEP_KEYS.filter((key) => stepStatus[key]?.complete).length;

  const isGoLiveReady = useMemo(
    () => computeIsGoLiveReady(stepStatus, REQUIRED_STEP_KEYS),
    [stepStatus]
  );

  return (
    <SettingsSubPage hubLabel={hub.breadcrumb} breadcrumb={enterprise.breadcrumb} title={enterprise.title} subtitle={enterprise.subtitle}>
      <OnboardingModeTabs hostLabel={t.tabs.host} enterpriseLabel={t.tabs.enterprise} navLabel={t.tabs.navLabel} />

      <OnboardingProgressBar
        completedCount={completedCount}
        totalCount={STEP_KEYS.length}
        label={t.progress.label.replace("{completed}", completedCount).replace("{total}", STEP_KEYS.length)}
      />

      <div className="onboarding-hub-steps">
        {STEP_KEYS.map((key) => {
          const tileStatus = stepStatus[key];
          return (
            <OnboardingStepTile
              key={key}
              to={STEP_LINKS[key]}
              title={enterprise.steps[key].title}
              desc={enterprise.steps[key].desc}
              isComplete={Boolean(tileStatus?.complete)}
              isLoading={isLoadingStatus && !tileStatus}
              isUnknown={Boolean(tileStatus?.unknown)}
              badges={[REQUIRED_STEP_KEYS.has(key) ? t.requiredBadge : t.optionalBadge, t.accountWideBadge]}
              statusCompleteLabel={t.statusComplete}
              statusIncompleteLabel={t.statusIncomplete}
              // Channex account status is restricted to an allowlist today, so
              // regular hosts always read "unknown" here — that's not a
              // transient check failure like the other unknown tiles, so it
              // gets its own honest copy instead of the generic wording.
              statusUnknownLabel={key === "channels" ? t.channelsComingSoon : t.statusUnknown}
            />
          );
        })}
      </div>

      <div className="onboarding-golive-cta">
        <h2 className="onboarding-golive-cta-title">{enterprise.goLiveSection.title}</h2>
        <p className="onboarding-golive-cta-desc">{enterprise.goLiveSection.desc}</p>
        <span
          className={`onboarding-golive-pill${isGoLiveReady ? " onboarding-golive-pill--ready" : " onboarding-golive-pill--not-ready"}`}
        >
          {isGoLiveReady ? enterprise.goLiveSection.readyLabel : enterprise.goLiveSection.notReadyLabel}
        </span>
      </div>
    </SettingsSubPage>
  );
};

export default HostOnboardingEnterprise;
