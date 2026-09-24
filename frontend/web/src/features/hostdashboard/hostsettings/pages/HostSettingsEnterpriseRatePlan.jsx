import React, { useEffect, useMemo, useState } from "react";
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
        <span className="enterprise-stat-description">
          {description}
        </span>
      )}
    </div>
  </div>
);

const HostSettingsEnterpriseRatePlan = () => {
  const { hub } = useSettingsTrans("ratePlans");

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
      } catch (loadError) {
        console.error("Failed to load enterprise rate plan:", loadError);

        if (!cancelled) {
          setError(
            "We couldn't load your enterprise rate plan right now."
          );
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

  const monthlyCost = useMemo(() => {
    if (!ratePlan) {
      return 0;
    }

    return Number(ratePlan.estimatedMonthlyCost || 0);
  }, [ratePlan]);

  const pricePerProperty = Number(ratePlan?.pricePerProperty || 49);
  const currency = ratePlan?.currency || "EUR";
  const activeProperties = Number(ratePlan?.activeProperties || 0);

  return (
    <SettingsSubPage
      hubLabel={hub.breadcrumb}
      breadcrumb="Enterprise Rate Plan"
      title="Enterprise Rate Plan"
      subtitle="Simple pricing that scales with your active property portfolio."
    >
      {loading && (
        <div className="personal-data-card enterprise-rate-plan-loading">
          Loading enterprise rate plan...
        </div>
      )}

      {!loading && error && (
        <div className="personal-data-card enterprise-rate-plan-error">
          {error}
        </div>
      )}

      {!loading && !error && ratePlan && (
        <>
          <section className="personal-data-section">
            <h2 className="personal-data-section-title">
              Current Plan
            </h2>

            <div className="enterprise-plan-card">
              <div className="enterprise-plan-header">
                <div>
                  <span className="enterprise-plan-eyebrow">
                    Current Rate
                  </span>

                  <h2>Enterprise</h2>

                  <p>
                    {formatMoney(pricePerProperty, currency)}
                    {" / active property / month"}
                  </p>
                </div>

                <span className="enterprise-plan-status">
                  Active
                </span>
              </div>

              <div className="enterprise-plan-divider" />

              <div className="enterprise-plan-grid">
                <StatCard
                  icon={<BusinessOutlinedIcon />}
                  label="Active Properties"
                  value={activeProperties.toLocaleString("en-US")}
                  description="Billable properties in your portfolio"
                />

                <StatCard
                  icon={<PaymentsOutlinedIcon />}
                  label="Price per Property"
                  value={formatMoney(pricePerProperty, currency)}
                  description="Per active property per month"
                />

                <StatCard
                  icon={<AccountBalanceWalletOutlinedIcon />}
                  label="Estimated Monthly Cost"
                  value={formatMoney(monthlyCost, currency)}
                  description="Based on your current property count"
                />
              </div>
            </div>
          </section>

          <section className="personal-data-section">
            <h2 className="personal-data-section-title">
              Pricing
            </h2>

            <div className="enterprise-pricing-card">
              <div>
                <span className="enterprise-pricing-label">
                  Enterprise pricing
                </span>

                <strong>
                  {formatMoney(pricePerProperty, currency)}
                </strong>

                <span>
                  per active property / month
                </span>
              </div>

              <div className="enterprise-pricing-formula">
                <span>Active Properties</span>
                <strong>×</strong>
                <span>{formatMoney(pricePerProperty, currency)}</span>
                <strong>=</strong>
                <span>Monthly Subscription</span>
              </div>
            </div>
          </section>

          <section className="personal-data-section">
            <h2 className="personal-data-section-title">
              Next Invoice
            </h2>

            <div className="personal-data-card enterprise-invoice-card">
              <div className="enterprise-invoice-row">
                <div className="enterprise-invoice-icon">
                  <CalendarMonthOutlinedIcon />
                </div>

                <div className="enterprise-invoice-content">
                  <span>Next invoice</span>
                  <strong>{formatMoney(monthlyCost, currency)}</strong>
                </div>
              </div>

              <div className="enterprise-invoice-row">
                <div className="enterprise-invoice-icon">
                  <AccountBalanceWalletOutlinedIcon />
                </div>

                <div className="enterprise-invoice-content">
                  <span>Billing frequency</span>
                  <strong>Monthly</strong>
                </div>
              </div>

              <div className="enterprise-invoice-row">
                <div className="enterprise-invoice-icon">
                  <BusinessOutlinedIcon />
                </div>

                <div className="enterprise-invoice-content">
                  <span>Billing unit</span>
                  <strong>Active Property</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="personal-data-section">
            <h2 className="personal-data-section-title">
              Billing History
            </h2>

            <div className="personal-data-card enterprise-empty-card">
              <strong>No invoices available yet</strong>
              <span>
                Your enterprise invoices will appear here once billing
                history is available.
              </span>
            </div>
          </section>

          <section className="personal-data-section">
            <h2 className="personal-data-section-title">
              Billing Contact
            </h2>

            <div className="personal-data-card enterprise-empty-card">
              <strong>Billing contact</strong>
              <span>
                Billing contact management will be available here.
              </span>
            </div>
          </section>
        </>
      )}
    </SettingsSubPage>
  );
};

export default HostSettingsEnterpriseRatePlan;