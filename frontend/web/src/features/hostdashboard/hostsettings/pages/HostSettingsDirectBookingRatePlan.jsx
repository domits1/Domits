import React from "react";
import useSettingsTrans from "../hooks/useSettingsTrans";
import SettingsSubPage from "../components/SettingsSubPage";
import {
  calculateDirectBookingCommission,
  DIRECT_BOOKING_PRICING_TIERS,
  DIRECT_BOOKING_STANDARD_RATE,
} from "../utils/directBookingRatePlan";
import { formatCurrency, formatPercentage } from "../utils/formatters";
import "../styles/hostSettings.css";

const HostSettingsDirectBookingRatePlan = () => {
  const { hub, t, language } = useSettingsTrans("ratePlans");
  const directBooking = t.directBooking;
  const examples = [50_000, 100_000, 300_000, 500_000];

  const formatMoney = (amountCents, currency = "EUR") =>
    formatCurrency(Number(amountCents || 0) / 100, currency, language);

  const formatRate = (rate) => formatPercentage(rate, language);

  const renderTier = (tier, index) => {
    const minimumCents =
      index === 0
        ? 0
        : DIRECT_BOOKING_PRICING_TIERS[index - 1].maxRevenueCents + 1;

    return (
      <tr key={index}>
        <td>
          {tier.enterprise
            ? `${formatMoney(500_000_000)}+`
            : `${formatMoney(minimumCents)} – ${formatMoney(
                tier.maxRevenueCents
              )}`}
        </td>
        <td>
          {tier.enterprise ? directBooking.enterprise : formatRate(tier.rate)}
        </td>
      </tr>
    );
  };

  return (
    <SettingsSubPage
      hubLabel={hub.breadcrumb}
      breadcrumb={directBooking.breadcrumb}
      title={directBooking.title}
      subtitle={directBooking.subtitle}
    >
      <section className="personal-data-section">
        <div className="direct-booking-plan-card">
          <div className="direct-booking-plan-header">
            <div>
              <span className="direct-booking-plan-eyebrow">
                {directBooking.commissionRate}
              </span>
              <h2>{directBooking.planName}</h2>
              <p>
                {formatRate(DIRECT_BOOKING_STANDARD_RATE)} /{" "}
                {directBooking.perReservation}
              </p>
            </div>
          </div>

          <div className="direct-booking-plan-divider" />

          <div className="direct-booking-plan-grid">
            <div className="direct-booking-stat">
              <span className="direct-booking-stat-label">
                {directBooking.paidBy}
              </span>
              <strong className="direct-booking-stat-value">
                {directBooking.host}
              </strong>
              <span className="direct-booking-stat-description">
                {directBooking.commissionDescription}
              </span>
            </div>
            <div className="direct-booking-stat">
              <span className="direct-booking-stat-label">
                {directBooking.monthlySubscription}
              </span>
              <strong className="direct-booking-stat-value">
                {formatMoney(0)}
              </strong>
              <span className="direct-booking-stat-description">
                {directBooking.noFixedFee}
              </span>
            </div>
            <div className="direct-booking-stat">
              <span className="direct-booking-stat-label">
                {directBooking.propertyFee}
              </span>
              <strong className="direct-booking-stat-value">
                {formatMoney(0)}
              </strong>
              <span className="direct-booking-stat-description">
                {directBooking.noFixedFee}
              </span>
            </div>
            <div className="direct-booking-stat">
              <span className="direct-booking-stat-label">
                {directBooking.guestDomitsFee}
              </span>
              <strong className="direct-booking-stat-value">
                {formatMoney(0)}
              </strong>
              <span className="direct-booking-stat-description">
                {directBooking.commissionDescription}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="personal-data-section">
        <h2 className="personal-data-section-title">{directBooking.commission}</h2>
        <div className="direct-booking-formula-card">
          <div className="direct-booking-rate">
            <span className="direct-booking-rate-label">
              {directBooking.commissionRate}
            </span>
            <strong>{formatRate(DIRECT_BOOKING_STANDARD_RATE)}</strong>
            <span>{directBooking.perReservation}</span>
          </div>
          <div className="direct-booking-formula">
            {directBooking.commissionFormula}
          </div>
        </div>
        <div className="direct-booking-note">
          {directBooking.commissionableBase}
        </div>
      </section>

      <section className="personal-data-section">
        <h2 className="personal-data-section-title">
          {directBooking.reservationRevenue}
        </h2>
        <p className="personal-data-subtitle">
          {directBooking.reservationRevenueDescription}
        </p>
        <div className="direct-booking-examples">
          {examples.map((amountCents) => (
            <div className="direct-booking-example" key={amountCents}>
              <span className="direct-booking-example-label">
                {directBooking.reservationValue}
              </span>
              <span className="direct-booking-example-value">
                {formatMoney(amountCents)}
              </span>
              <span className="direct-booking-example-fee">
                {directBooking.domitsHostFee}:{" "}
                {formatMoney(calculateDirectBookingCommission(amountCents))}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="personal-data-section">
        <h2 className="personal-data-section-title">
          {directBooking.volumePricing}
        </h2>
        <p className="personal-data-subtitle">
          {directBooking.volumePricingDescription}
        </p>
        <div className="direct-booking-tier-table-wrapper">
          <table className="direct-booking-tier-table">
            <thead>
              <tr>
                <th scope="col">{directBooking.annualRevenue}</th>
                <th scope="col">{directBooking.domitsFee}</th>
              </tr>
            </thead>
            <tbody>
              {DIRECT_BOOKING_PRICING_TIERS.map(renderTier)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="personal-data-section">
        <h2 className="personal-data-section-title">{directBooking.billing}</h2>
        <p className="personal-data-subtitle">
          {directBooking.billingDescription}
        </p>
        <div className="direct-booking-empty">
          <strong>{directBooking.billingHistory}</strong>
          <span>{directBooking.billingHistoryEmpty}</span>
        </div>
      </section>

      <section className="personal-data-section">
        <div className="direct-booking-empty">
          <strong>{directBooking.billingContact}</strong>
          <span>{directBooking.billingContactEmpty}</span>
        </div>
      </section>
    </SettingsSubPage>
  );
};

export default HostSettingsDirectBookingRatePlan;
