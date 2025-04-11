import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import PricingRow from "../components/PricingRow";
import { usePricing } from "../hooks/useProperyRate";
import OnboardingButton from "../components/OnboardingButton";

function PropertyRateView() {
  const { type: accommodationType } = useParams();
  const { pricing, updatePricing, calculateServiceFee } = usePricing();

  useEffect(() => {
    calculateServiceFee();
  }, [pricing.Rent, pricing.CleaningFee, calculateServiceFee]);

  const totalGuestPrice =
    (parseFloat(pricing.Rent) || 0) +
    (parseFloat(pricing.CleaningFee) || 0) +
    (parseFloat(pricing.ServiceFee) || 0);

  const totalEarnings =
    (parseFloat(pricing.Rent) || 0) + (parseFloat(pricing.CleaningFee) || 0);

  return (
    <div className="onboarding-host-div">
      <main className="container">
        <h2 className="onboardingSectionTitle">Set Your Rate</h2>
        <h2 className="acco-price">
          {pricing.Rent
            ? `€ ${parseFloat(pricing.Rent).toFixed(0)}`
            : "Enter your base rate"}
        </h2>

        <section className="accommodation-pricing">
          <PricingRow
            label="Base rate"
            value={pricing.Rent}
            onChange={(value) => updatePricing("Rent", value)}
          />
          {pricing.Features.ExtraServices.includes(
            "Cleaning service (add service fee manually)",
          ) && (
            <PricingRow
              label="Cleaning fee"
              value={pricing.CleaningFee}
              onChange={(value) => updatePricing("CleaningFee", value)}
            />
          )}
          <PricingRow
            label="Service fees"
            value={pricing.ServiceFee}
            readonly
          />
          <hr />
          <PricingRow label="Guest's price" value={totalGuestPrice} readonly />
        </section>

        <section className="accommodation-pricing">
          <PricingRow label="You earn" value={totalEarnings} readonly />
        </section>
        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/description`}
            btnText="Go back"
          />
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/availability`}
            btnText="Proceed"
          />
        </nav>
      </main>
    </div>
  );
}

export default PropertyRateView;
