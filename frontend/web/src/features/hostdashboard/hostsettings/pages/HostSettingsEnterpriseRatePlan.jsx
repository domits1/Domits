import React, { useEffect, useState } from "react";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import useSettingsTrans from "../hooks/useSettingsTrans";
import SettingsSubPage from "../components/SettingsSubPage";
import { getEnterpriseRatePlan } from "../services/enterpriseRatePlanService";
import "../styles/hostSettings.css";

const formatMoney = (amount, currency = "EUR") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
};

const StatCard = ({ icon, label, value, description }) => (
  <div className="enterprise-stat-card">
    <div className="enterprise-stat-icon">{icon}</div>
    <div className="enterprise-stat-content">
      <span className="enterprise-stat-label">{label}</span>
      <strong className="enterprise-stat-value">{value}</strong>
      {description && (
        <span className="enterprise-stat-description">{description}</span>
      )}
    </div>
  </div>
);

const HostSettingsEnterpriseRatePlan = () => {
  const { hub, t } = useSettingsTrans("ratePlans");
  const enterprise = t.enterprise;
  const [ratePlan, setRatePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadRatePlan = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getEnterpriseRatePlan();

        if (!cancelled) {
          setRatePlan(data);
        }
      } catch {
        if (!cancelled) {
          setError(enterprise.loadError);
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
  }, [enterprise.loadError]);

  const monthlyCost = Number(ratePlan?.estimatedMonthlyCost || 0);
  const pricePerProperty = Number(ratePlan?.pricePerProperty ?? 0);
  const currency = ratePlan?.currency || "EUR";
  const activeProperties = Number(ratePlan?.activeProperties || 0);

  return (
    <SettingsSubPage
      hubLabel={hub.breadcrumb}
      breadcrumb={enterprise.breadcrumb}
      title={enterprise.title}
      subtitle={enterprise.subtitle}
    >
      {loading && (
        <div className="personal-data-card enterprise-rate-plan-loading">
          {enterprise.loading}
        </div>
      )}

      {!loading && error && (
        <div className="personal-data-card enterprise-rate-plan-error">
          {error}
        </div>
      )}

      {!loading && !error && !ratePlan && (
        <div className="personal-data-card enterprise-rate-plan-inactive">
          <strong>{enterprise.notActiveTitle}</strong>
          <span>{enterprise.notActiveDescription}</span>
        </div>
      )}

      {!loading && !error && ratePlan && (
        <>
          <section className="personal-data-section">
            <h2 className="personal-data-section-title">
              {enterprise.currentPlan}
            </h2>

            <div className="enterprise-plan-card">
              <div className="enterprise-plan-header">
                <div>
                  <span className="enterprise-plan-eyebrow">
                    {enterprise.currentRate}
                  </span>
                  <h2>{enterprise.planName}</h2>
                  <p>
                    {formatMoney(pricePerProperty, currency)}
                    {" / "}
                    {enterprise.perActivePropertyMonth}
                  </p>
                </div>
                <span className="enterprise-plan-status">
                  {enterprise.active}
                </span>
              </div>

              <div className="enterprise-plan-divider" />

              <div className="enterprise-plan-grid">
                <StatCard
                  icon={<BusinessOutlinedIcon />}
                  label={enterprise.activeProperties}
                  value={activeProperties.toLocaleString("en-US")}
                  description={enterprise.billableProperties}
                />
                <StatCard
                  icon={<PaymentsOutlinedIcon />}
                  label={enterprise.pricePerProperty}
                  value={formatMoney(pricePerProperty, currency)}
                  description={enterprise.perActivePropertyMonth}
                />
                <StatCard
                  icon={<AccountBalanceWalletOutlinedIcon />}
                  label={enterprise.estimatedMonthlyCost}
                  value={formatMoney(monthlyCost, currency)}
                  description={enterprise.basedOnPropertyCount}
                />
              </div>
            </div>
          </section>

          <section className="personal-data-section">
            <h2 className="personal-data-section-title">{enterprise.pricing}</h2>
            <div className="enterprise-pricing-card">
              <div>
                <span className="enterprise-pricing-label">
                  {enterprise.pricingLabel}
                </span>
                <strong>{formatMoney(pricePerProperty, currency)}</strong>
                <span>{enterprise.perActivePropertyMonth}</span>
              </div>

              <div className="enterprise-pricing-formula">
                <span>{enterprise.activeProperties}</span>
                <strong>×</strong>
                <span>{formatMoney(pricePerProperty, currency)}</span>
                <strong>=</strong>
                <span>{enterprise.monthlySubscription}</span>
              </div>
            </div>
          </section>

          <section className="personal-data-section">
            <h2 className="personal-data-section-title">{enterprise.nextInvoice}</h2>
            <div className="personal-data-card enterprise-invoice-card">
              <div className="enterprise-invoice-row">
                <div className="enterprise-invoice-icon">
                  <CalendarMonthOutlinedIcon />
                </div>
                <div className="enterprise-invoice-content">
                  <span>{enterprise.nextInvoiceLabel}</span>
                  <strong>{formatMoney(monthlyCost, currency)}</strong>
                </div>
              </div>

              <div className="enterprise-invoice-row">
                <div className="enterprise-invoice-icon">
                  <AccountBalanceWalletOutlinedIcon />
                </div>
                <div className="enterprise-invoice-content">
                  <span>{enterprise.billingFrequency}</span>
                  <strong>{enterprise.monthly}</strong>
                </div>
              </div>

              <div className="enterprise-invoice-row">
                <div className="enterprise-invoice-icon">
                  <BusinessOutlinedIcon />
                </div>
                <div className="enterprise-invoice-content">
                  <span>{enterprise.billingUnit}</span>
                  <strong>{enterprise.activeProperty}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="personal-data-section">
            <h2 className="personal-data-section-title">{enterprise.billingHistory}</h2>
            <div className="personal-data-card enterprise-empty-card">
              <strong>{enterprise.noInvoices}</strong>
              <span>{enterprise.invoicesDescription}</span>
            </div>
          </section>

          <section className="personal-data-section">
            <h2 className="personal-data-section-title">{enterprise.billingContact}</h2>
            <div className="personal-data-card enterprise-empty-card">
              <strong>{enterprise.billingContactTitle}</strong>
              <span>{enterprise.billingContactDescription}</span>
            </div>
          </section>
        </>
      )}
    </SettingsSubPage>
  );
};

export default HostSettingsEnterpriseRatePlan;
