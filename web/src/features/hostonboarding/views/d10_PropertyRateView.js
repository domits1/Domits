// --- START OF FILE PropertyRateView.js (Updated Layout) ---

import React, { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import PricingRow from "../../../../../../../../Desktop/hostonboarding copy/components/PricingRow";
import { usePricing } from "../../../../../../../../Desktop/hostonboarding copy/hooks/useProperyRate";
import Button from "../../../../../../../../Desktop/hostonboarding copy/components/OnboardingButton";
import '../../../../../../../../Desktop/hostonboarding copy/styles/PropertyRateView.scss'; // Import SCSS

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

  return (
    // Main container - applies overall vertical padding, but no horizontal constraints initially
    <main className="w-full py-10"> {/* w-full for full width, py-10 for overall vertical padding */}

      {/* Container for Title and Subtitle - applies centering and max-width */}
      <div className="container mx-auto px-4 max-w-3xl mb-8"> {/* Centered container, horizontal padding, bottom margin */}
        {/* Title Section - text-left for alignment like the image */}
        <div className="text-left"> {/* text-left */}
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Set Your Nightly Rate
          </h1>
          <p className="text-lg text-gray-600">
            Define the pricing for your guests and see your potential earnings.
          </p>
        </div>
      </div>

    <div className="container mx-auto px-4 mt-8 max-w-3xl"> {/* Centered container, horizontal padding, top margin */}

        {/* Main Pricing Card - bg-white, shadow-lg, rounded-lg, overflow-hidden are Tailwind */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden property-rate-card"> {/* property-rate-card for SCSS */}

          {/* The padding previously on the outer card div is now on an inner div */}
          <div className="p-6 md:p-8 space-y-6"> {/* Add padding and spacing */}
            {/* Section 1: Base Pricing Inputs */}
            <section className="pricing-section"> {/* pricing-section for SCSS */}
              <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Base Pricing</h3>
              <PricingRow
                label="Base rate per night"
                value={pricing.Rent ?? ""}
                onChange={(value) => updatePricing("Rent", value)}
                placeholder="e.g., 100"
                isInput={true} // Prop to indicate it's an input
              />
              {showCleaningFeeInput && (
                <PricingRow
                  label="Cleaning fee"
                  value={pricing.CleaningFee ?? ""}
                  onChange={(value) => updatePricing("CleaningFee", value)}
                  placeholder="e.g., 25"
                  tooltip="One-time fee charged per stay for cleaning."
                  isInput={true} // Prop to indicate it's an input
                />
              )}
            </section>

            {/* Section 2: Guest Price Breakdown */}
            <section className="pricing-section"> {/* pricing-section for SCSS */}
              <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Guest Price Breakdown</h3>
              <PricingRow label="Base rate" value={rentAmount.toFixed(2)} readonly />
              {showCleaningFeeInput && (
                <PricingRow label="Cleaning fee" value={cleaningFeeAmount.toFixed(2)} readonly />
              )}
              <PricingRow
                label="Service fees"
                value={serviceFeeAmount.toFixed(2)}
                readonly
              />
              <PricingRow
                label="Total Guest Price per night"
                value={totalGuestPrice.toFixed(2)}
                readonly
              />
            </section>

            {/* Section 3: Host Earnings - Tailwind bg-green-50 p-4 rounded-md provide highlight */}
            <section className="pricing-section bg-green-50 p-4 rounded-md"> {/* pricing-section for SCSS */}
              <h3 className="text-lg font-semibold text-green-800 mb-3">Host Earnings</h3>
              <PricingRow
                label="Your potential earnings per night"
                value={totalEarnings.toFixed(2)}
                readonly
              />
            </section>
          </div> {/* End of inner padding div */}
        </div> {/* End of Pricing Card div */}

        {/* Navigation Buttons - mt-10 flex justify-between items-center are Tailwind */}
        <nav className="onboarding-button-box mt-10 flex justify-between items-center"> {/* onboarding-button-box for SCSS */}
          <Button
            routePath={`/hostonboarding/${accommodationType}/photos`}
            btnText="← Go back"
            variant="secondary"
          />
          <Button
            routePath={`/hostonboarding/${accommodationType}/availability`}
            btnText="Proceed →"
            variant="primary"
          />
        </nav>
      </div> {/* End of content below banner container */}
    </main>
  );
}

export default PropertyRateView;
// --- END OF FILE PropertyRateView.js (Updated Layout) ---