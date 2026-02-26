import React from "react";

const DISCOUNT_PERCENT_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const formatEuroAmount = (amount) => `EUR ${Number(amount || 0).toLocaleString("en-US")}`;

const normalizePercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }
  return Math.trunc(numeric);
};

const getAveragePriceAfterDiscount = (amount, discountPercent) => {
  const safeAmount = Number(amount) || 0;
  const safeDiscountPercent = normalizePercent(discountPercent);
  const discountedAmount = safeAmount * (1 - safeDiscountPercent / 100);
  return Math.max(0, Math.round(discountedAmount));
};

export default function PricingSettingsCard({
  nightlyRate,
  weekendRate,
  weeklyDiscountPercent,
  monthlyDiscountPercent,
  nightlyRateInput,
  weekendRateInput,
  weeklyDiscountEnabled,
  weeklyDiscountPercentInput,
  monthlyDiscountEnabled,
  monthlyDiscountPercentInput,
  onNightlyRateChange,
  onWeekendRateChange,
  onWeeklyDiscountToggle,
  onWeeklyDiscountPercentChange,
  onMonthlyDiscountToggle,
  onMonthlyDiscountPercentChange,
  showSaveButton,
  canSave,
  saving,
  saveError,
  onSave,
  onBack,
}) {
  const weeklyAverage = getAveragePriceAfterDiscount(nightlyRate, weeklyDiscountPercent);
  const monthlyAverage = getAveragePriceAfterDiscount(nightlyRate, monthlyDiscountPercent);

  return (
    <section className="hc-pricing-settings-card" aria-label="Price settings">
      <header className="hc-pricing-settings-header">
        <button
          type="button"
          className="hc-pricing-settings-back"
          onClick={() => onBack?.()}
          aria-label="Back to summary"
        >
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </header>

      <h3 className="hc-pricing-settings-title">Price settings</h3>
      <p className="hc-pricing-settings-copy">
        These apply to all nights, unless you customize them by date.
      </p>

      <form
        className="hc-pricing-settings-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) {
            onSave?.();
          }
        }}
      >
        <section className="hc-pricing-settings-section">
          <h4 className="hc-pricing-settings-section-title">Base price</h4>
          <article className="hc-pricing-settings-item">
            <label className="hc-pricing-settings-item-label" htmlFor="hc-pricing-nightly-rate">
              Per night
            </label>
            <div className="hc-pricing-settings-input-wrap">
              <span className="hc-pricing-settings-currency">EUR</span>
              <input
                id="hc-pricing-nightly-rate"
                type="number"
                min="0"
                step="10"
                className="hc-pricing-settings-input"
                value={nightlyRateInput}
                onChange={(event) => onNightlyRateChange?.(event.target.value)}
              />
            </div>
          </article>
          <article className="hc-pricing-settings-item">
            <label className="hc-pricing-settings-item-label" htmlFor="hc-pricing-weekend-rate">
              Weekend
            </label>
            <div className="hc-pricing-settings-input-wrap">
              <span className="hc-pricing-settings-currency">EUR</span>
              <input
                id="hc-pricing-weekend-rate"
                type="number"
                min="0"
                step="10"
                className="hc-pricing-settings-input"
                value={weekendRateInput}
                onChange={(event) => onWeekendRateChange?.(event.target.value)}
              />
            </div>
            <p className="hc-pricing-settings-item-meta">
              Current weekend price = {formatEuroAmount(weekendRate)}
            </p>
          </article>
        </section>

        <section className="hc-pricing-settings-section">
          <h4 className="hc-pricing-settings-section-title">Discounts</h4>
          <p className="hc-pricing-settings-copy">Adjust your pricing to attract more guests.</p>

          <article className="hc-pricing-settings-item">
            <div className="hc-pricing-settings-discount-row">
              <p className="hc-pricing-settings-item-label">Weekly</p>
              <button
                type="button"
                role="switch"
                aria-checked={weeklyDiscountEnabled}
                className={`hc-switch ${weeklyDiscountEnabled ? "is-on" : ""}`}
                onClick={() => onWeeklyDiscountToggle?.(!weeklyDiscountEnabled)}
              >
                <span className="hc-switch-knob" />
              </button>
            </div>
            <div className="hc-pricing-settings-select-row">
              <select
                className="hc-pricing-settings-select"
                value={weeklyDiscountPercentInput}
                onChange={(event) => onWeeklyDiscountPercentChange?.(event.target.value)}
                disabled={!weeklyDiscountEnabled}
              >
                {DISCOUNT_PERCENT_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}%
                  </option>
                ))}
              </select>
              <span className="hc-pricing-settings-item-meta">
                Weekly average = {formatEuroAmount(weeklyAverage)}
              </span>
            </div>
          </article>

          <article className="hc-pricing-settings-item">
            <div className="hc-pricing-settings-discount-row">
              <p className="hc-pricing-settings-item-label">Monthly</p>
              <button
                type="button"
                role="switch"
                aria-checked={monthlyDiscountEnabled}
                className={`hc-switch ${monthlyDiscountEnabled ? "is-on" : ""}`}
                onClick={() => onMonthlyDiscountToggle?.(!monthlyDiscountEnabled)}
              >
                <span className="hc-switch-knob" />
              </button>
            </div>
            <div className="hc-pricing-settings-select-row">
              <select
                className="hc-pricing-settings-select"
                value={monthlyDiscountPercentInput}
                onChange={(event) => onMonthlyDiscountPercentChange?.(event.target.value)}
                disabled={!monthlyDiscountEnabled}
              >
                {DISCOUNT_PERCENT_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}%
                  </option>
                ))}
              </select>
              <span className="hc-pricing-settings-item-meta">
                Monthly average = {formatEuroAmount(monthlyAverage)}
              </span>
            </div>
          </article>
        </section>

        {saveError ? <p className="hc-pricing-settings-error">{saveError}</p> : null}

        {showSaveButton ? (
          <button
            type="submit"
            className="hc-pricing-settings-save-btn"
            disabled={!canSave}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        ) : null}
      </form>
    </section>
  );
}
