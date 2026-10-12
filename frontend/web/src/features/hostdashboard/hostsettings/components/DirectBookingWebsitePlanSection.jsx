import React, { useEffect, useState } from "react";
import useSettingsTrans from "../hooks/useSettingsTrans";
import {
  changeWebsiteRatePlan,
  getWebsiteRatePlan,
} from "../services/websiteRatePlanService";
import { formatCurrency } from "../utils/formatters";
import "../styles/hostSettings.css";

const CHECKOUT_STATUS_PARAM = "websiteCheckout";
const CHECKOUT_POLL_ATTEMPTS = 10;
const CHECKOUT_POLL_INTERVAL_MS = 1500;

const getCheckoutStateFromUrl = () => {
  const checkoutState = new URLSearchParams(window.location.search).get(
    CHECKOUT_STATUS_PARAM
  );

  return ["success", "cancelled"].includes(checkoutState) ? checkoutState : "";
};

const getEssentialsButtonLabel = ({
  changingPlan,
  essentialsIsCurrent,
  eliteDowngradeScheduled,
  copy,
}) => {
  if (changingPlan === "essentials") return copy.processing;
  if (essentialsIsCurrent) return copy.currentPlan;
  if (eliteDowngradeScheduled) return copy.scheduled;
  return copy.switchToEssentials;
};

const getEliteButtonLabel = ({
  changingPlan,
  eliteDowngradeScheduled,
  eliteIsCurrent,
  checkoutPending,
  redirectingToCheckout,
  copy,
}) => {
  if (checkoutPending) return copy.processing;
  if (redirectingToCheckout || changingPlan === "elite") return copy.processing;
  if (eliteDowngradeScheduled) return copy.restoreElite;
  if (eliteIsCurrent) return copy.currentPlan;
  return copy.upgrade;
};

const EssentialsPlanCard = ({
  copy,
  busy,
  essentialsIsCurrent,
  eliteDowngradeScheduled,
  changingPlan,
  onPlanChange,
}) => (
  <article className="website-rate-plan-card">
    <div className="website-rate-plan-card-header">
      <h3>{copy.essentials}</h3>
      {essentialsIsCurrent && (
        <span className="website-rate-plan-badge">{copy.currentPlan}</span>
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
    <p className="website-rate-plan-description">{copy.essentialsDescription}</p>
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
      onClick={() => onPlanChange("essentials")}
    >
      {getEssentialsButtonLabel({
        changingPlan,
        essentialsIsCurrent,
        eliteDowngradeScheduled,
        copy,
      })}
    </button>
  </article>
);

const ElitePlanCard = ({
  copy,
  busy,
  elitePrice,
  hasConfiguredElitePrice,
  currentPlan,
  eliteIsCurrent,
  eliteDowngradeScheduled,
  changingPlan,
  checkoutPending,
  redirectingToCheckout,
  onPlanChange,
}) => (
  <article className="website-rate-plan-card website-rate-plan-card--featured">
    <div className="website-rate-plan-card-header">
      <h3>{copy.elite}</h3>
      {currentPlan === "elite" && (
        <span className="website-rate-plan-badge">{copy.currentPlan}</span>
      )}
    </div>
    <div className="website-rate-plan-price">
      <strong>{elitePrice}</strong>
      <span>{copy.perMonth}</span>
    </div>
    <p className="website-rate-plan-description">{copy.eliteDescription}</p>
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
      disabled={busy || eliteIsCurrent || !hasConfiguredElitePrice}
      onClick={() => onPlanChange("elite")}
    >
      {getEliteButtonLabel({
        changingPlan,
        eliteDowngradeScheduled,
        eliteIsCurrent,
        checkoutPending,
        redirectingToCheckout,
        copy,
      })}
    </button>
  </article>
);

const WebsiteRatePlanContent = ({
  copy,
  ratePlan,
  busy,
  essentialsIsCurrent,
  eliteIsCurrent,
  eliteDowngradeScheduled,
  changingPlan,
  checkoutPending,
  redirectingToCheckout,
  elitePrice,
  hasConfiguredElitePrice,
  effectiveUntilMessage,
  notice,
  actionError,
  onPlanChange,
}) => (
  <>
    <div className="website-rate-plan-grid">
      <EssentialsPlanCard
        copy={copy}
        busy={busy}
        essentialsIsCurrent={essentialsIsCurrent}
        eliteDowngradeScheduled={eliteDowngradeScheduled}
        changingPlan={changingPlan}
        onPlanChange={onPlanChange}
      />
      <ElitePlanCard
        copy={copy}
        busy={busy}
        elitePrice={elitePrice}
        hasConfiguredElitePrice={hasConfiguredElitePrice}
        currentPlan={ratePlan.plan === "elite" ? "elite" : "essentials"}
        eliteIsCurrent={eliteIsCurrent}
        eliteDowngradeScheduled={eliteDowngradeScheduled}
        changingPlan={changingPlan}
        checkoutPending={checkoutPending}
        redirectingToCheckout={redirectingToCheckout}
        onPlanChange={onPlanChange}
      />
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
      <output className="website-rate-plan-feedback">{notice}</output>
    )}
    {actionError && (
      <p
        className="website-rate-plan-feedback website-rate-plan-feedback--error"
        role="alert"
      >
        {actionError}
      </p>
    )}
  </>
);

const DirectBookingWebsitePlanSection = ({
  redirectToCheckout = (checkoutUrl) => window.location.assign(checkoutUrl),
}) => {
  const { t, language } = useSettingsTrans("ratePlans");
  const copy = t.websitePlan;
  const [ratePlan, setRatePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [changingPlan, setChangingPlan] = useState(null);
  const [redirectingToCheckout, setRedirectingToCheckout] = useState(false);
  const [checkoutState] = useState(() => getCheckoutStateFromUrl());
  const [checkoutPending, setCheckoutPending] = useState(
    checkoutState === "success"
  );
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const currentPlan = ratePlan?.plan === "elite" ? "elite" : "essentials";
  const eliteDowngradeScheduled =
    currentPlan === "elite" && Boolean(ratePlan?.effectiveUntil);

  useEffect(() => {
    let cancelled = false;

    const delay = (duration) =>
      new Promise((resolve) => window.setTimeout(resolve, duration));

    const cleanCheckoutQuery = () => {
      if (!checkoutState) return;

      const url = new URL(window.location.href);
      url.searchParams.delete(CHECKOUT_STATUS_PARAM);
      url.searchParams.delete("session_id");
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`
      );
    };

    const pollForEliteActivation = async () => {
      for (let attempt = 0; attempt < CHECKOUT_POLL_ATTEMPTS; attempt += 1) {
        await delay(CHECKOUT_POLL_INTERVAL_MS);
        if (cancelled) return;

        try {
          const refreshedPlan = await getWebsiteRatePlan();
          if (cancelled) return;

          setRatePlan(refreshedPlan);
          if (refreshedPlan?.plan === "elite") {
            setCheckoutPending(false);
            setNotice(copy.checkoutSuccess);
            return;
          }
        } catch {
          // Keep the checkout pending state and retry; never offer a second checkout.
        }
      }
    };

    const loadRatePlan = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        cleanCheckoutQuery();

        const result = await getWebsiteRatePlan();
        if (cancelled) return;

        setRatePlan(result);
        if (checkoutState === "cancelled") {
          setCheckoutPending(false);
          setNotice(copy.checkoutCancelled);
        } else if (checkoutState === "success") {
          if (result?.plan === "elite") {
            setCheckoutPending(false);
            setNotice(copy.checkoutSuccess);
          } else {
            setCheckoutPending(true);
            setNotice(copy.checkoutPending);
            void pollForEliteActivation();
          }
        }
      } catch {
        if (!cancelled) {
          setLoadError(true);
          setCheckoutPending(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadRatePlan();

    return () => {
      cancelled = true;
    };
  }, [
    checkoutState,
    copy.loading,
    copy.loadError,
    copy.checkoutPending,
    copy.checkoutSuccess,
    copy.checkoutCancelled,
  ]);

  const formatMoney = (amountCents, currency = "EUR") =>
    formatCurrency(Number(amountCents || 0) / 100, currency, language);

  const handlePlanChange = async (targetPlan) => {
    if (loading || changingPlan || redirectingToCheckout || checkoutPending) {
      return;
    }

    const isReactivation = targetPlan === "elite" && eliteDowngradeScheduled;
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

        setRedirectingToCheckout(true);
        try {
          redirectToCheckout(result.checkoutUrl);
        } catch (error) {
          setRedirectingToCheckout(false);
          throw error;
        }
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
        targetPlan === "elite" && !isReactivation
          ? copy.checkoutError
          : copy.changeError
      );
    } finally {
      setChangingPlan(null);
    }
  };

  const currency = ratePlan?.currency || "EUR";
  const configuredElitePrice = Number(ratePlan?.elitePriceCents);
  const hasConfiguredElitePrice =
    Number.isFinite(configuredElitePrice) && configuredElitePrice > 0;
  const elitePrice = hasConfiguredElitePrice
    ? formatMoney(configuredElitePrice, currency)
    : copy.priceUnavailable;
  const essentialsIsCurrent = currentPlan === "essentials";
  const eliteIsCurrent = currentPlan === "elite" && !eliteDowngradeScheduled;
  const busy =
    loading ||
    Boolean(changingPlan) ||
    redirectingToCheckout ||
    checkoutPending;

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
        <div
          className="personal-data-card enterprise-rate-plan-error"
          role="alert"
        >
          {copy.loadError}
        </div>
      )}

      {!loading && !loadError && ratePlan && (
        <WebsiteRatePlanContent
          copy={copy}
          ratePlan={ratePlan}
          busy={busy}
          essentialsIsCurrent={essentialsIsCurrent}
          eliteIsCurrent={eliteIsCurrent}
          eliteDowngradeScheduled={eliteDowngradeScheduled}
          changingPlan={changingPlan}
          checkoutPending={checkoutPending}
          redirectingToCheckout={redirectingToCheckout}
          elitePrice={elitePrice}
          hasConfiguredElitePrice={hasConfiguredElitePrice}
          effectiveUntilMessage={effectiveUntilMessage}
          notice={notice}
          actionError={actionError}
          onPlanChange={handlePlanChange}
        />
      )}
    </section>
  );
};

export default DirectBookingWebsitePlanSection;
