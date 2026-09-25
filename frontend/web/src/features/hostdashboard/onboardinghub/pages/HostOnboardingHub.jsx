import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LanguageContext } from "../../../../context/LanguageContext";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import de from "../../../../content/de.json";
import es from "../../../../content/es.json";
import SettingsSubPage from "../../hostsettings/components/SettingsSubPage";
import OnboardingModeTabs from "../components/OnboardingModeTabs";
import PropertyPicker from "../components/PropertyPicker";
import OnboardingStepTile from "../components/OnboardingStepTile";
import OnboardingProgressBar from "../components/OnboardingProgressBar";
import {
  fetchHostProperties,
  checkListPropertyStatus,
  checkWebsiteStatus,
  checkChannelsStatus,
  checkPaymentsStatus,
  checkPricingStatus,
} from "../services/onboardingStatusService";
import "../../hostsettings/styles/hostSettings.css";
import "../styles/onboardingHub.css";

const contentByLanguage = { en, nl, de, es };

const STEP_KEYS = ["listProperty", "website", "channels", "automate"];
const REQUIRED_STEP_KEYS = new Set(["listProperty", "automate"]);

const HostOnboardingHub = () => {
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.settings?.onboardingHub ?? contentByLanguage.en.settings.onboardingHub;
  const hub = contentByLanguage[language]?.settings?.hub ?? contentByLanguage.en.settings.hub;
  const navigate = useNavigate();

  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [propertiesError, setPropertiesError] = useState(null);
  const [stepStatus, setStepStatus] = useState({});
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    (async () => {
      try {
        const hostProperties = await fetchHostProperties();
        if (isCancelled) return;
        setProperties(hostProperties);
        setSelectedPropertyId(hostProperties[0]?.propertyId ?? null);
      } catch (error) {
        if (!isCancelled) setPropertiesError(error.message || t.propertyPicker.loadError);
      } finally {
        if (!isCancelled) setIsLoadingProperties(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedProperty = useMemo(
    () => properties.find((property) => property.propertyId === selectedPropertyId) || null,
    [properties, selectedPropertyId]
  );

  useEffect(() => {
    if (!selectedProperty) {
      setStepStatus({});
      return;
    }

    let isCancelled = false;
    setIsLoadingStatus(true);

    (async () => {
      const [listProperty, website, channels, payments, pricing] = await Promise.all([
        Promise.resolve(checkListPropertyStatus()),
        checkWebsiteStatus(selectedProperty.propertyId),
        checkChannelsStatus(selectedProperty.propertyId),
        checkPaymentsStatus(),
        checkPricingStatus(),
      ]);

      if (!isCancelled) {
        // The "Automate Operations" tile intentionally reuses the payments status
        // directly (see getTileStatus below) instead of an OR-combined check, so
        // the tile can never read "Complete" while Go Live — which gates on
        // Payments specifically — is still disabled. Pricing is fetched only to
        // surface as an optional sub-detail on the tile, never to affect its
        // completion state.
        setStepStatus({ listProperty, website, channels, payments, pricing });
        setIsLoadingStatus(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [selectedProperty]);

  // The "automate" tile's status is the payments status, not a dedicated
  // "automate" entry — see the comment where stepStatus is set above.
  const getTileStatus = (key) => (key === "automate" ? stepStatus.payments : stepStatus[key]);

  const completedCount = STEP_KEYS.filter((key) => getTileStatus(key)?.complete).length;

  // The website editor 404s ("Website draft not found") when no draft exists
  // yet for this property — reuse the same status this tile's checkmark
  // already reflects to send the host to the workspace (where they can start
  // one) instead of straight into that dead end.
  const websiteLink = selectedProperty
    ? stepStatus.website?.complete
      ? `/hostdashboard/website/${encodeURIComponent(selectedProperty.propertyId)}`
      : `/hostdashboard/website?propertyId=${encodeURIComponent(selectedProperty.propertyId)}`
    : null;

  const stepLinks = selectedProperty
    ? {
        listProperty: "/hostdashboard/hostonboarding",
        website: websiteLink,
        channels: "/hostdashboard/integrations-marketplace",
        automate: "/hostdashboard/finance",
      }
    : null;

  const isGoLiveEnabled = Boolean(stepStatus.listProperty?.complete && stepStatus.payments?.complete);

  const handleGoLiveClick = () => {
    if (!isGoLiveEnabled || !selectedProperty) return;
    navigate(`/hostdashboard/settings/onboarding/go-live?propertyId=${encodeURIComponent(selectedProperty.propertyId)}`);
  };

  return (
    <SettingsSubPage hubLabel={hub.breadcrumb} breadcrumb={t.breadcrumb} title={t.title} subtitle={t.subtitle}>
      <OnboardingModeTabs hostLabel={t.tabs.host} enterpriseLabel={t.tabs.enterprise} navLabel={t.tabs.navLabel} />

      {isLoadingProperties && <p className="onboarding-hub-loading">{t.propertyPicker.loading}</p>}

      {!isLoadingProperties && propertiesError && (
        <p className="onboarding-hub-error">{propertiesError}</p>
      )}

      {!isLoadingProperties && !propertiesError && properties.length === 0 && (
        <div className="onboarding-hub-empty">
          <p>{t.propertyPicker.empty}</p>
          <a className="onboarding-hub-empty-cta" href="/hostdashboard/hostonboarding">
            {t.steps.listProperty.title}
          </a>
        </div>
      )}

      {!isLoadingProperties && !propertiesError && properties.length > 0 && selectedProperty && (
        <>
          <PropertyPicker
            properties={properties}
            selectedPropertyId={selectedPropertyId}
            onSelect={setSelectedPropertyId}
            label={t.propertyPicker.label}
          />

          <OnboardingProgressBar
            completedCount={completedCount}
            totalCount={STEP_KEYS.length}
            label={t.progress.label
              .replace("{completed}", completedCount)
              .replace("{total}", STEP_KEYS.length)}
          />

          <div className="onboarding-hub-steps">
            {STEP_KEYS.map((key) => {
              const tileStatus = getTileStatus(key);
              return (
                <OnboardingStepTile
                  key={key}
                  to={stepLinks[key]}
                  title={t.steps[key].title}
                  desc={t.steps[key].desc}
                  isComplete={Boolean(tileStatus?.complete)}
                  isLoading={isLoadingStatus && !tileStatus}
                  isUnknown={Boolean(tileStatus?.unknown)}
                  badges={[
                    REQUIRED_STEP_KEYS.has(key) ? t.requiredBadge : t.optionalBadge,
                    tileStatus?.scope === "account" ? t.accountWideBadge : null,
                  ]}
                  subDetail={key === "automate" && stepStatus.pricing?.complete ? t.pricingConnectedSubDetail : null}
                  statusCompleteLabel={t.statusComplete}
                  statusIncompleteLabel={t.statusIncomplete}
                  statusUnknownLabel={t.statusUnknown}
                />
              );
            })}
          </div>

          <div className="onboarding-golive-cta">
            <h2 className="onboarding-golive-cta-title">{t.steps.goLive.title}</h2>
            <p className="onboarding-golive-cta-desc">{t.steps.goLive.desc}</p>
            <button
              type="button"
              className="onboarding-golive-activate-button"
              disabled={!isGoLiveEnabled}
              onClick={handleGoLiveClick}
            >
              {t.goLiveButton}
            </button>
            {!isGoLiveEnabled && <p className="onboarding-golive-blocked">{t.goLiveBlockedText}</p>}
          </div>
        </>
      )}
    </SettingsSubPage>
  );
};

export default HostOnboardingHub;
