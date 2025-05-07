// File: input_file_32.js (PropertyRateView)
import React, { useEffect, useCallback, useMemo } from "react"; // Added useMemo
import { useParams, useNavigate } from "react-router-dom";
import PricingRow from "../components/PricingRow"; // Ensure correct path
import { usePricing } from "../hooks/useProperyRate"; // Ensure correct path
import OnboardingButton from "../components/OnboardingButton"; // Ensure correct path
import "../styles/onboardingHost.scss"; // Ensure this imports pricing specific styles
// REMOVED: import { useBuilder } from "../../../context/propertyBuilderContext";
// Import toast for potential user feedback, although not strictly needed if validation prevents proceed
import { toast } from "react-toastify";

function PropertyRateView() {
  // REMOVED: const builder = useBuilder();
  const navigate = useNavigate();
  const { type: accommodationType } = useParams();

  // --- State and Actions from Hook (Unchanged) ---
  const { pricing, updatePricing, calculateServiceFee } = usePricing();
  // ---------------------------------------------

  // --- Derived State for Inputs/Display (Unchanged) ---
  const baseRate = pricing?.Rent ?? "";
  const cleaningFee = pricing?.CleaningFee ?? "";
  const serviceFee = pricing?.ServiceFee ?? 0;
  const showCleaningFeeRow = useMemo(() => pricing?.Features?.ExtraServices?.includes(
    "Cleaning service (add service fee manually)"
  ), [pricing?.Features?.ExtraServices]);
  // ---------------------------------------------

  // --- Memoized Input Handlers (Unchanged) ---
  const handleBaseRateChange = useCallback((newValue) => {
    updatePricing("Rent", newValue);
  }, [updatePricing]);

  const handleCleaningFeeChange = useCallback((newValue) => {
    updatePricing("CleaningFee", newValue);
  }, [updatePricing]);
  // -----------------------------------------

  // --- Effect for Service Fee Calculation (Unchanged) ---
  useEffect(() => {
    calculateServiceFee();
  }, [baseRate, cleaningFee, calculateServiceFee]);
  // -----------------------------------------------

  // --- Calculations for Readonly Fields (Unchanged) ---
  const numBaseRate = useMemo(() => parseFloat(baseRate) || 0, [baseRate]);
  const numCleaningFee = useMemo(() => parseFloat(cleaningFee) || 0, [cleaningFee]);
  const numServiceFee = useMemo(() => parseFloat(serviceFee) || 0, [serviceFee]);
  const totalGuestPrice = useMemo(() => numBaseRate + numCleaningFee + numServiceFee, [numBaseRate, numCleaningFee, numServiceFee]);
  const totalEarnings = useMemo(() => numBaseRate + numCleaningFee, [numBaseRate, numCleaningFee]);
  // -----------------------------------------

  // --- Disabled State (Unchanged) ---
  const isProceedDisabled = useMemo(() => numBaseRate <= 0, [numBaseRate]);
  // -----------------------------

  // --- *** MODIFIED Proceed Logic *** ---
  const handleProceed = useCallback(() => {
    if (isProceedDisabled) {
      // Optional: Add user feedback if needed
      // toast.error("Please enter a valid base rate greater than 0.");
      return;
    }

    // Data (Rent, CleaningFee, ServiceFee) is already updated in the Zustand store
    // by handleBaseRateChange, handleCleaningFeeChange, and calculateServiceFee effect.
    // No need to prepare data or call builder.

    // REMOVED: const pricingData = { /* ... */ };
    // REMOVED: builder.addPricing(pricingData);
    // REMOVED: console.log("Builder after adding pricing:", builder);

    // Log the current pricing state from the store for confirmation
    console.log("Proceeding from PropertyRateView. Pricing data in store:", {
      Rent: numBaseRate, // Use the calculated numeric value for logging
      CleaningFee: numCleaningFee,
      ServiceFee: numServiceFee
    });

    // Just navigate to the next step
    navigate(`/hostonboarding/${accommodationType}/availability`);

  }, [
    navigate,
    accommodationType,
    numBaseRate, // Keep for logging and validation check
    numCleaningFee, // Keep for logging
    numServiceFee, // Keep for logging
    isProceedDisabled
    // REMOVED: builder dependency
  ]); // Dependencies updated
  // --- **************************** ---

  // --- JSX (Unchanged) ---
  return (
    <div className="onboarding-host-div property-rate-view">
      <main className="rate-container page-body">
        <h2 className="onboardingSectionTitle">Set Your Rate</h2>

        {/* Guest Price Section */}
        <section className="pricing-details guest-pricing">
          <h3 className="pricing-section-title">Guest Price Breakdown</h3>
          <PricingRow
            label="Base rate per night*"
            value={baseRate}
            onChange={handleBaseRateChange}
            placeholder="e.g. 100"
          />
          {showCleaningFeeRow && (
            <PricingRow
              label="Cleaning fee"
              value={cleaningFee}
              onChange={handleCleaningFeeChange}
              placeholder="e.g. 25"
            />
          )}
          <PricingRow
            label="Service fee (Host)"
            value={numServiceFee}
            readonly
          />
          <hr className="pricing-divider"/>
          <PricingRow
            label="Total price for Guest (excl. Domits fee)"
            value={totalGuestPrice}
            readonly
          />
        </section>

        {/* Host Earnings Section */}
        <section className="pricing-details host-earnings">
          <h3 className="pricing-section-title">Your Earnings</h3>
          <PricingRow
            label="You earn per night"
            value={totalEarnings}
            readonly />
          <p className="earnings-info">This is your nightly rate plus any fees like cleaning, minus the Host Service Fee shown above.</p>
        </section>

        {/* Navigation */}
        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/photos`}
            btnText="Go back"
          />
          <OnboardingButton
            onClick={handleProceed} // Calls the modified handler
            btnText="Proceed"
            disabled={isProceedDisabled}
          />
        </nav>
        {isProceedDisabled && <p className="error-message">Please enter a valid base rate per night (greater than 0).</p>}
      </main>
    </div>
  );
}

export default PropertyRateView;