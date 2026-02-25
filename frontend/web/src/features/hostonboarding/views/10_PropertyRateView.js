import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { usePricing } from "../hooks/useProperyRate";
import OnboardingButton from "../components/OnboardingButton";
import { useBuilder } from "../../../context/propertyBuilderContext";
import OnboardingProgress from "../components/OnboardingProgress";
import { useOnboardingFlow } from "../hooks/useOnboardingFlow";

const currencyFormatter = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCurrency = (value) => {
  const numberValue = typeof value === "number" ? value : Number(value);
  return currencyFormatter.format(Number.isFinite(numberValue) ? numberValue : 0);
};

function PropertyRateView() {
  const builder = useBuilder();
  const { prevPath, nextPath } = useOnboardingFlow();
  const { type: accommodationType } = useParams();
  const { pricing, updatePricing, calculateServiceFee } = usePricing();

  useEffect(() => {
    calculateServiceFee();
  }, [pricing.Rent, pricing.CleaningFee, calculateServiceFee]);

  const totalGuestPrice =
    (Number.parseFloat(pricing.Rent) || 0) +
    (Number.parseFloat(pricing.CleaningFee) || 0) +
    (Number.parseFloat(pricing.ServiceFee) || 0);

  const totalEarnings =
    (Number.parseFloat(pricing.Rent) || 0) + (Number.parseFloat(pricing.CleaningFee) || 0);

  const rentValue = Number(pricing.Rent);
  const hasValidRent = Number.isFinite(rentValue) && rentValue > 0;

  return (
    <div className="onboarding-host-div">
      <main className="container">
        <OnboardingProgress />
        <h2 className="onboardingSectionTitle">Set your price</h2>
        <p className="onboardingSectionSubtitle">
          How much will it cost for a guest to stay at your property?
        </p>

        <section className="pricing-card">
          <div className="pricing-card-left">
            <span className="pricing-card-label">Nightly base rate</span>
            <div className="pricing-input-group">
              <span className="pricing-currency">€</span>
              <input
                className="pricing-input-field"
                type="number"
                value={pricing.Rent}
                onChange={(event) => updatePricing("Rent", event.target.value)}
                placeholder="0"
                min={0}
                step={10}
              />
            </div>
            {pricing.Features.ExtraServices.includes(
              "Cleaning service (add service fee manually)"
            ) && (
              <div className="pricing-fee-row">
                <span>Cleaning fee</span>
                <span>{formatCurrency(pricing.CleaningFee)}</span>
              </div>
            )}
            <div className="pricing-fee-row">
              <span>Service fees</span>
              <span>{formatCurrency(pricing.ServiceFee)}</span>
            </div>
          </div>

          <div className="pricing-card-arrow" aria-hidden="true">
            →
          </div>

          <div className="pricing-card-right">
            <div className="pricing-total-box">
              <span className="pricing-total-label">Guest's total price</span>
              <span className="pricing-total-value">
                {hasValidRent ? formatCurrency(totalGuestPrice) : "€ 0.00"}
              </span>
            </div>
          </div>
        </section>

        <div className="pricing-earn-row">
          <span className="pricing-earn-icon" aria-hidden="true">✓</span>
          <span>You earn {formatCurrency(totalEarnings)}</span>
        </div>

        <p className="pricing-note">You can change this later.</p>
        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={prevPath || `/hostonboarding/${accommodationType}/description`}
            btnText="Go back"
          />
          <OnboardingButton
            onClick={() => {
              if (!hasValidRent) return false;
              builder.addPricing({
                roomRate: rentValue,
                cleaning: Number(pricing.CleaningFee) || 0,
                service: Number(pricing.ServiceFee) || 0,
              });
              return true;
            }}
            routePath={nextPath || `/hostonboarding/${accommodationType}/availability`}
            btnText="Proceed"
            disabled={!hasValidRent}
          />
        </nav>
      </main>
    </div>
  );
}

export default PropertyRateView;
