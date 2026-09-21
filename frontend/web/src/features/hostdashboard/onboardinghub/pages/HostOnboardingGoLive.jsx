import React, { useContext, useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { LanguageContext } from "../../../../context/LanguageContext";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import de from "../../../../content/de.json";
import es from "../../../../content/es.json";
import { getAccessToken } from "../../../../services/getAccessToken";
import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import { updatePropertyLifecycleStatus } from "../../hostproperty/services/hostPropertyApi";
import {
  checkListPropertyStatus,
  checkWebsiteStatus,
  checkChannelsStatus,
  checkPaymentsStatus,
  checkPricingStatus,
  checkTasksStatus,
  checkGoLiveStatus,
} from "../services/onboardingStatusService";
import "../../hostsettings/styles/hostSettings.css";
import "../styles/onboardingHub.css";

const contentByLanguage = { en, nl, de, es };

const REQUIRED_CHECKS = [
  { key: "listProperty", check: () => Promise.resolve(checkListPropertyStatus()) },
  { key: "payments", check: () => checkPaymentsStatus() },
];

const OPTIONAL_CHECKS = [
  { key: "website", check: (propertyId) => checkWebsiteStatus(propertyId) },
  { key: "channels", check: (propertyId) => checkChannelsStatus(propertyId) },
  { key: "pricing", check: () => checkPricingStatus() },
  { key: "tasks", check: () => checkTasksStatus() },
];

const fetchProperty = async (propertyId) => {
  const response = await fetch(
    `${PROPERTY_API_BASE}/hostDashboard/single?property=${encodeURIComponent(propertyId)}`,
    { method: "GET", headers: { Authorization: getAccessToken() } }
  );
  if (!response.ok) {
    throw new Error("Could not load this listing.");
  }
  return response.json();
};

const ChecklistIcon = ({ isLoading, isUnknown, isComplete }) => {
  if (isLoading) return <span className="onboarding-step-tile-status-dot" aria-hidden="true" />;
  if (isUnknown) return <HelpOutlineIcon className="onboarding-step-tile-icon onboarding-step-tile-icon-unknown" />;
  return isComplete ? (
    <CheckCircleIcon className="onboarding-step-tile-icon onboarding-step-tile-icon-complete" />
  ) : (
    <RadioButtonUncheckedIcon className="onboarding-step-tile-icon onboarding-step-tile-icon-incomplete" />
  );
};

const HostOnboardingGoLive = () => {
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.settings?.goLive ?? contentByLanguage.en.settings.goLive;
  const hub = contentByLanguage[language]?.settings?.hub ?? contentByLanguage.en.settings.hub;
  const onboardingHub =
    contentByLanguage[language]?.settings?.onboardingHub ?? contentByLanguage.en.settings.onboardingHub;
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get("propertyId");

  const [property, setProperty] = useState(null);
  const [isLoadingProperty, setIsLoadingProperty] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [checklist, setChecklist] = useState({ required: {}, optional: {} });
  const [isActivating, setIsActivating] = useState(false);
  const [activateError, setActivateError] = useState(null);
  const [activateSuccess, setActivateSuccess] = useState(false);

  useEffect(() => {
    if (!propertyId) {
      setLoadError(t.missingPropertyId);
      setIsLoadingProperty(false);
      return;
    }

    let isCancelled = false;

    (async () => {
      try {
        const [propertyData, requiredResults, optionalResults] = await Promise.all([
          fetchProperty(propertyId),
          Promise.all(REQUIRED_CHECKS.map(({ check }) => check(propertyId))),
          Promise.all(OPTIONAL_CHECKS.map(({ check }) => check(propertyId))),
        ]);

        if (isCancelled) return;

        setProperty(propertyData?.property || propertyData);
        setChecklist({
          required: Object.fromEntries(REQUIRED_CHECKS.map(({ key }, index) => [key, requiredResults[index]])),
          optional: Object.fromEntries(OPTIONAL_CHECKS.map(({ key }, index) => [key, optionalResults[index]])),
        });
      } catch (error) {
        if (!isCancelled) setLoadError(error.message || t.loadError);
      } finally {
        if (!isCancelled) setIsLoadingProperty(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const isAlreadyLive = checkGoLiveStatus(property).complete;
  const requiredEntries = Object.entries(checklist.required);
  const allRequiredComplete =
    requiredEntries.length === REQUIRED_CHECKS.length && requiredEntries.every(([, status]) => status?.complete);

  const handleActivate = async () => {
    setIsActivating(true);
    setActivateError(null);
    try {
      await updatePropertyLifecycleStatus({ propertyId, status: "ACTIVE" });
      setActivateSuccess(true);
      setProperty((current) => ({ ...current, status: "ACTIVE" }));
    } catch (error) {
      setActivateError(error.message || t.errorMessage);
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="personal-data-page">
      <nav className="personal-data-breadcrumb">
        <Link to="/hostdashboard/settings">{hub.breadcrumb}</Link>
        <span className="personal-data-breadcrumb-sep">/</span>
        <Link to="/hostdashboard/settings/onboarding">{onboardingHub.breadcrumb}</Link>
        <span className="personal-data-breadcrumb-sep">/</span>
        <span className="personal-data-breadcrumb-current">{t.breadcrumb}</span>
      </nav>
      <header className="personal-data-header">
        <h1 className="personal-data-title">
          {property?.title ? t.title.replace("{propertyName}", property.title) : t.breadcrumb}
        </h1>
        <p className="personal-data-subtitle">{t.subtitle}</p>
      </header>

      {isLoadingProperty && <p className="onboarding-hub-loading">{t.loading}</p>}
      {!isLoadingProperty && loadError && <p className="onboarding-hub-error">{loadError}</p>}

      {!isLoadingProperty && !loadError && (
        <>
          {isAlreadyLive && <p className="onboarding-golive-already-live">{t.alreadyLive}</p>}

          <div className="onboarding-golive-section">
            <h2 className="onboarding-golive-section-title">{t.requiredSection}</h2>
            <ul className="onboarding-golive-checklist">
              {REQUIRED_CHECKS.map(({ key }) => {
                const status = checklist.required[key];
                return (
                  <li key={key} className="onboarding-golive-checklist-item">
                    <ChecklistIcon isLoading={!status} isUnknown={Boolean(status?.unknown)} isComplete={Boolean(status?.complete)} />
                    <span>{t.items[key]}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="onboarding-golive-section">
            <h2 className="onboarding-golive-section-title">{t.optionalSection}</h2>
            <ul className="onboarding-golive-checklist">
              {OPTIONAL_CHECKS.map(({ key }) => {
                const status = checklist.optional[key];
                return (
                  <li key={key} className="onboarding-golive-checklist-item">
                    <ChecklistIcon isLoading={!status} isUnknown={Boolean(status?.unknown)} isComplete={Boolean(status?.complete)} />
                    <span>{t.items[key]}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {!isAlreadyLive && !allRequiredComplete && (
            <p className="onboarding-golive-blocked">{t.blockedMessage}</p>
          )}

          {activateError && <p className="onboarding-hub-error">{activateError}</p>}
          {activateSuccess && <p className="onboarding-golive-success">{t.successMessage}</p>}

          {!isAlreadyLive && (
            <button
              type="button"
              className="onboarding-golive-activate-button"
              disabled={!allRequiredComplete || isActivating}
              onClick={handleActivate}
            >
              {isActivating ? t.activating : t.activateButton}
            </button>
          )}

          <Link className="onboarding-golive-back-link" to="/hostdashboard/settings/onboarding">
            {t.backToHub}
          </Link>
        </>
      )}
    </div>
  );
};

export default HostOnboardingGoLive;
