import React, { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import PricingRow from "../components/PricingRow";
import { usePricing } from "../hooks/useProperyRate";
import Button from "../components/OnboardingButton";
import '../styles/PropertyRateView.css';

const safeParseFloat = (value) => parseFloat(value) || 0;

function PropertyRateView() {
  const { type: accommodationType } = useParams();
  const { pricing, updatePricing, calculateServiceFee } = usePricing();

  const rentAmount = useMemo(() => safeParseFloat(pricing.Rent), [pricing.Rent]);
  const cleaningFeeAmount = useMemo(() => safeParseFloat(pricing.CleaningFee), [pricing.CleaningFee]);
  const serviceFeeAmount = useMemo(() => safeParseFloat(pricing.ServiceFee), [pricing.ServiceFee]);

  useEffect(() => {
    calculateServiceFee();
  }, [rentAmount, cleaningFeeAmount, calculateServiceFee]);

  const totalGuestPrice = rentAmount + cleaningFeeAmount + serviceFeeAmount;
  const totalEarnings = rentAmount + cleaningFeeAmount;

  const showCleaningFeeInput = pricing.Features?.ExtraServices?.includes(
      "Cleaning service (add service fee manually)"
  );

  const isProceedDisabled = !pricing.Rent || rentAmount <= 0;

  return (
      <div className="onboarding-host-div">
        <main className="container page-body">
          <div className="title-section">
            <h1>Set Your Nightly Rate</h1>
            <p>Define the pricing for your guests and see your potential earnings.</p>
          </div>

          <div className="price-display-header">
            <h2>€{totalGuestPrice.toFixed(2)}</h2>
            <p>Total price per night for guests</p>
          </div>

          <div className="pricing-card">
            <section className="pricing-section">
              <h3>Base Pricing</h3>
              <PricingRow
                  label="Base rate per night"
                  value={pricing.Rent ?? ""}
                  onChange={(value) => updatePricing("Rent", value)}
                  placeholder="e.g., 180"
                  inputId="base-rate"
                  required
                  isCurrency
              />
              {showCleaningFeeInput && (
                  <PricingRow
                      label="Cleaning fee"
                      value={pricing.CleaningFee ?? ""}
                      onChange={(value) => updatePricing("CleaningFee", value)}
                      placeholder="e.g., 50"
                      tooltip="One-time fee charged per stay for cleaning."
                      inputId="cleaning-fee"
                      isCurrency
                  />
              )}
            </section>

            <section className="pricing-section">
              <h3>Guest Price Breakdown</h3>
              <PricingRow label="Base rate" value={rentAmount.toFixed(2)} readonly isCurrency />
              {showCleaningFeeInput && (
                  <PricingRow label="Cleaning fee" value={cleaningFeeAmount.toFixed(2)} readonly isCurrency />
              )}
              <PricingRow
                  label="Service fee"
                  value={serviceFeeAmount.toFixed(2)}
                  readonly
                  tooltip="Fee covering platform costs and services."
                  isCurrency
              />
              <hr />
              <PricingRow
                  label="Total Guest Price per night"
                  value={totalGuestPrice.toFixed(2)}
                  readonly
                  isTotal={true}
                  tooltip="This is the total price the guest will see (excluding taxes)."
                  isCurrency
              />
            </section>

            <section className="pricing-section host-earnings-section">
              <h3>Host Earnings</h3>
              <PricingRow
                  label="Your potential earnings per night"
                  value={totalEarnings.toFixed(2)}
                  readonly
                  isTotal={true}
                  tooltip="This is what you receive (Base Rate + Cleaning Fee, before any taxes or host service fees if applicable)."
                  isCurrency
              />
            </section>
          </div>

          <nav className="onboarding-button-box">
            <Button
                routePath={`/hostonboarding/${accommodationType}/photos`}
                btnText="Go back"
                variant="secondary"
            />
            <Button
                routePath={`/hostonboarding/${accommodationType}/availability`}
                btnText="Proceed"
                variant="primary"
                disabled={isProceedDisabled}
            />
          </nav>
          {isProceedDisabled && (
              <p className="error-message">Please enter a valid base rate greater than €0.</p>
          )}
        </main>
      </div>
  );
}

export default PropertyRateView;