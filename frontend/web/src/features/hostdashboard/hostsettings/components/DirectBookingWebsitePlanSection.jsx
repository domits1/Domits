import React, { useEffect, useState } from "react";
import useSettingsTrans from "../hooks/useSettingsTrans";
import {
  changeWebsiteRatePlan,
  getWebsiteRatePlan,
} from "../services/websiteRatePlanService";
import { formatCurrency } from "../utils/formatters";
import "../styles/hostSettings.css";

const ELITE_PRICE_CENTS = 4300;

const DirectBookingWebsitePlanSection = () => {
  const { t, language } = useSettingsTrans("ratePlans");
  const copy = t.websitePlan;
  const [ratePlan, setRatePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [changingPlan, setChangingPlan] = useState(null);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadRatePlan = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const result = await getWebsiteRatePlan();

        if (!cancelled) {
          setRatePlan(result);
        }
      } catch {
        if (!cancelled) {
          setLoadError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadRatePlan();

    return () => {
      cancelled = true;
    };
  }, []);

  const formatMoney = (amountCents, currency = "EUR") =>
    formatCurrency(Number(amountCents || 0) / 100, currency, language);

  const handlePlanChange = async (targetPlan) => {
    setChangingPlan(targetPlan);
    setActionError("");
    setNotice("");

    try {
      const result = await changeWebsiteRatePlan(targetPlan);

      if (result?.action === "checkout_required") {
        if (!result.checkoutUrl) {
          setActionError(copy.checkoutError);
          return;
        }

        window.location.assign(result.checkoutUrl);
        return;
      }

      if (result?.plan) {
        setRatePlan(result.plan);
      } else {
        setRatePlan(await getWebsiteRatePlan());
      }

      const messageByAction = {
        downgrade_scheduled: "downgradeScheduled",
        downgraded: "downgradeSuccess",
        upgrade_restored: "restoreSuccess",
        unchanged: "unchanged",
      };
      setNotice(copy[messageByAction[result?.action]] || copy.unchanged);
    } catch {
      setActionError(
        targetPlan === "elite" ? copy.checkoutError : copy.changeError
      );
    } finally {
      setChangingPlan(null);
    }
  };

  const currentPlan = ratePlan?.plan === "elite" ? "elite" : "essentials";
  const eliteDowngradeScheduled =
    currentPlan === "elite" && Boolean(ratePlan?.effectiveUntil);
  const currency = ratePlan?.currency || "EUR";
  const elitePrice = formatMoney(ELITE_PRICE_CENTS, currency);
  const essentialsIsCurrent = currentPlan === "essentials";
  const eliteIsCurrent = currentPlan === "elite" && !eliteDowngradeScheduled;
  const busy = loading || Boolean(changingPlan);

  const endDate = ratePlan?.effectiveUntil
    ? new Date(ratePlan.effectiveUntil)
    : null;
  const formattedEndDate =
    endDate && !Number.isNaN(endDate.getTime())
      ? endDate.toLocaleDateString(language)
      : ratePlan?.effectiveUntil;
  const effectiveUntilMessage = formattedEndDate
    ? copy.effectiveUntil.replace("{date}", formattedEndDate)
    : "";

  return (
    <section className="personal-data-section website-rate-plan-section">
      <h2 className="personal-data-section-title">{copy.sectionTitle}</h2>
      <p className="personal-data-subtitle">{copy.sectionSubtitle}</p>

      {loading && (
        <div className="personal-data-card enterprise-rate-plan-loading">
          {copy.loading}
        </div>
      )}

      {!loading && loadError && (
        <div className="personal-data-card enterprise-rate-plan-error" role="alert">
          {copy.loadError}
        </div>
      )}

      {!loading && !loadError && ratePlan && (
        <>
          <div className="website-rate-plan-grid">
            <article className="website-rate-plan-card">
              <div className="website-rate-plan-card-header">
                <h3>{copy.essentials}</h3>
                {essentialsIsCurrent && (
                  <span className="website-rate-plan-badge">
                    {copy.currentPlan}
                  </span>
                )}
                {eliteDowngradeScheduled && (
                  <span className="website-rate-plan-badge website-rate-plan-badge--scheduled">
                    {copy.scheduled}
                  </span>
                )}
              </div>
              <div className="website-rate-plan-price">
                <strong>{copy.free}</strong>
                <span>{copy.perMonth}</span>
              </div>
              <p className="website-rate-plan-description">
                {copy.essentialsDescription}
              </p>
              <h4 className="website-rate-plan-feature-title">
                {copy.essentialsFeaturesTitle}
              </h4>
              <ul className="website-rate-plan-features">
                <li>{copy.featureBasicWebsite}</li>
                <li>{copy.featureBasicCustomization}</li>
              </ul>
              <button
                className="website-rate-plan-button website-rate-plan-button--secondary"
                type="button"
                disabled={busy || essentialsIsCurrent || eliteDowngradeScheduled}
                onClick={() => handlePlanChange("essentials")}
              >
                {changingPlan === "essentials"
                  ? copy.processing
                  : essentialsIsCurrent
                    ? copy.currentPlan
                    : eliteDowngradeScheduled
                      ? copy.scheduled
                      : copy.switchToEssentials}
              </button>
            </article>

            <article className="website-rate-plan-card website-rate-plan-card--featured">
              <div className="website-rate-plan-card-header">
                <h3>{copy.elite}</h3>
                {currentPlan === "elite" && (
                  <span className="website-rate-plan-badge">
                    {copy.currentPlan}
                  </span>
                )}
              </div>
              <div className="website-rate-plan-price">
                <strong>{elitePrice}</strong>
                <span>{copy.perMonth}</span>
              </div>
              <p className="website-rate-plan-description">
                {copy.eliteDescription}
              </p>
              <h4 className="website-rate-plan-feature-title">
                {copy.eliteFeaturesTitle}
              </h4>
              <ul className="website-rate-plan-features">
                <li>{copy.featureCustomDomain}</li>
                <li>{copy.featureAdvancedBuilder}</li>
                <li>{copy.featureLocalization}</li>
                <li>{copy.featureGrowthTools}</li>
              </ul>
              <button
                className="website-rate-plan-button"
                type="button"
                disabled={busy || eliteIsCurrent}
                onClick={() => handlePlanChange("elite")}
              >
                {changingPlan === "elite"
                  ? copy.processing
                  : eliteDowngradeScheduled
                    ? copy.restoreElite
                    : eliteIsCurrent
                      ? copy.currentPlan
                      : copy.upgrade}
              </button>
            </article>
          </div>

          {ratePlan.status && (
            <p className="website-rate-plan-status">
              {copy.status[ratePlan.status] || ratePlan.status}
            </p>
          )}

          {eliteDowngradeScheduled && effectiveUntilMessage && (
            <p className="website-rate-plan-status">{effectiveUntilMessage}</p>
          )}

          {notice && (
            <p className="website-rate-plan-feedback" role="status">
              {notice}
            </p>
          )}
          {actionError && (
            <p className="website-rate-plan-feedback website-rate-plan-feedback--error" role="alert">
              {actionError}
            </p>
          )}
        </>
      )}
    </section>
  );
};

export default DirectBookingWebsitePlanSection;
