import React from "react";
import arrowRightIcon from "../../../../../images/arrow-right-icon.svg";

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

  const openSettings = () => onOpenSettings?.();

  return (
    <section
      className="hc-info-card hc-info-card--interactive"
      aria-label="Open price settings"
      role="button"
      tabIndex={0}
      onClick={openSettings}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openSettings();
        }
      }}
    >
      <header className="hc-info-card-header">
        <h3 className="hc-info-card-title">Price</h3>
        <span className="hc-info-card-chevron" aria-hidden="true">
          <img src={arrowRightIcon} alt="" className="hc-chevron-icon" />
        </span>
      </header>

      <p className="hc-info-card-line">{formatEuroAmount(nightlyRate)} per night</p>
      <p className="hc-info-card-line">{formatEuroAmount(weekendRate)} weekend price</p>
      <p className="hc-info-card-line">{discountLine}</p>
    </section>
  );
}
