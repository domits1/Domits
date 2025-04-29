import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import PricingRow from "../components/PricingRow"; // Ensure correct path
import { usePricing } from "../hooks/useProperyRate"; // Ensure correct path
import OnboardingButton from "../components/OnboardingButton"; // Ensure correct path
import "../styles/onboardingHost.scss"; // Ensure this imports pricing specific styles
import { useBuilder } from "../../../context/propertyBuilderContext";

function PropertyRateView() {
  const builder = useBuilder();
  const { type: accommodationType } = useParams();
  const { pricing, updatePricing, calculateServiceFee } = usePricing();

  // Ensure pricing object and nested properties exist to prevent errors
  const baseRate = pricing?.Rent ?? ""; // Use empty string as default for input
  const cleaningFee = pricing?.CleaningFee ?? "";
  const serviceFee = pricing?.ServiceFee ?? 0; // Default to 0 for calculation
  const showCleaningFeeRow = pricing?.Features?.ExtraServices?.includes(
    "Cleaning service (add service fee manually)" // Check optional chaining
  );

  // Memoize the update handlers using useCallback
  const handleBaseRateChange = useCallback((newValue) => {
    // Validate/parse within the handler or in the store action
    updatePricing("Rent", newValue);
  }, [updatePricing]);

  const handleCleaningFeeChange = useCallback((newValue) => {
    // Validate/parse within the handler or in the store action
    updatePricing("CleaningFee", newValue);
  }, [updatePricing]);


  useEffect(() => {
    // Calculate service fee whenever relevant inputs change
    // Pass values directly to avoid dependency on the whole pricing object if possible
    // This depends on how calculateServiceFee is implemented in the store
    calculateServiceFee(/* Optionally pass baseRate, cleaningFee if needed */);
  }, [baseRate, cleaningFee, calculateServiceFee]); // Dependencies based on calculation inputs

  // Calculate totals safely, ensuring values are numbers
  const numBaseRate = parseFloat(baseRate) || 0;
  const numCleaningFee = parseFloat(cleaningFee) || 0;
  const numServiceFee = parseFloat(serviceFee) || 0;

  const totalGuestPrice = numBaseRate + numCleaningFee + numServiceFee;
  const totalEarnings = numBaseRate + numCleaningFee;

  // Determine if proceed should be disabled (e.g., base rate not set)
  const isProceedDisabled = !numBaseRate || numBaseRate <= 0;

  return (
    // Add a specific class for this view if needed for styling overrides
    <div className="onboarding-host-div property-rate-view">
      {/* Use main for semantic content area */}
      <main className="rate-container page-body"> {/* Use more specific class + generic */}
        <h2 className="onboardingSectionTitle">Set Your Rate</h2>

        {/* Section for guest price breakdown */}
        <section className="pricing-details guest-pricing">
          <h3 className="pricing-section-title">Guest Price Breakdown</h3>
          <PricingRow
            label="Base rate per night"
            value={baseRate}
            onChange={handleBaseRateChange} // Pass the specific handler
            placeholder="e.g. 100"
          />
          {showCleaningFeeRow && (
            <PricingRow
              label="Cleaning fee"
              value={cleaningFee}
              onChange={handleCleaningFeeChange} // Pass the specific handler
              placeholder="e.g. 25"
            />
          )}
          <PricingRow
            label="Service fees"
            // Pass the calculated number directly
            value={numServiceFee}
            readonly
          />
          <hr className="pricing-divider"/>
          <PricingRow
            label="Total guest price"
            // Pass the calculated number directly
            value={totalGuestPrice}
            readonly
          />
        </section>

        {/* Section for host earnings */}
        <section className="pricing-details host-earnings">
          <h3 className="pricing-section-title">Your Earnings</h3>
          <PricingRow
            label="You earn per night"
            // Pass the calculated number directly
            value={totalEarnings}
            readonly />
          <p className="earnings-info">This is your nightly rate plus any fees like cleaning, minus service fees.</p>
        </section>

        {/* Navigation */}
        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/photos`} // Check path
            btnText="Go back"
            variant="secondary" // Ensure variant prop is used
          />
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/availability`} // Check path
            onClick={ () => {
              builder.addPricing({roomRate: pricing.Rent, cleaning: pricing.CleaningFee, service: pricing.ServiceFee});
            }}
            btnText="Proceed"
            variant="primary" // Ensure variant prop is used
            disabled={isProceedDisabled} // Disable if base rate is missing
          />
        </nav>
        {isProceedDisabled && <p className="error-message">Please enter a valid base rate per night.</p>}
      </main>
    </div>
  );
}

export default PropertyRateView;
