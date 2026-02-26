import React from "react";

const formatEuroAmount = (amount) => `EUR ${Number(amount || 0).toLocaleString("en-US")}`;

export default function PricingCard({
  nightlyRate,
  weekendRate,
  weeklyDiscountPercent,
  onOpenSettings,
}) {
  const discountLine =
    Number(weeklyDiscountPercent) > 0
      ? `${weeklyDiscountPercent}% weekly discount`
      : "No weekly discount";

  return (
    <section className="hc-info-card" aria-label="Pricing summary">
      <header className="hc-info-card-header">
        <h3 className="hc-info-card-title">Price</h3>
        <button
          type="button"
          className="hc-info-card-chevron hc-info-card-chevron-btn"
          aria-label="Open price settings"
          onClick={() => onOpenSettings?.()}
        >
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </header>

      <p className="hc-info-card-line">{formatEuroAmount(nightlyRate)} per night</p>
      <p className="hc-info-card-line">{formatEuroAmount(weekendRate)} weekend price</p>
      <p className="hc-info-card-line">{discountLine}</p>
    </section>
  );
}
