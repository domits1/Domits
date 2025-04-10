// --- START OF FILE PropertyRateView.js ---

import React, { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import PricingRow from "../components/PricingRow";
import { usePricing } from "../hooks/useProperyRate"; // Corrected hook path typo
import Button from "../components/button";
import '../styles/PropertyRateView.css'; // Import the CSS

const safeParseFloat = (value) => parseFloat(value) || 0;

function PropertyRateView() {
    const { type: accommodationType } = useParams();
    // Assuming usePricing hook provides the initial state (e.g., Rent: '180')
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
        <main className="container">

            <div className="title-section">
                <h1>Set Your Nightly Rate</h1>
                <p>Define the pricing for your guests and see your potential earnings.</p>
            </div>

            {/* Right-aligned total price */}
            <div className="price-display-header">
                {/* This will now reflect calculations based on the initial state from usePricing */}
                <h2>€{totalGuestPrice.toFixed(2)}</h2>
            </div>

            {/* Main Pricing Card */}
            <div className="pricing-card">

                <section className="pricing-section">
                    <h3>Base Pricing</h3>
                    <PricingRow
                        label="Base rate per night"
                        // The 'value' comes from the usePricing hook's state
                        value={pricing.Rent ?? ""}
                        onChange={(value) => updatePricing("Rent", value)}
                        // Placeholder updated to 180
                        placeholder="180"
                        inputId="base-rate"
                    />
                    {showCleaningFeeInput && (
                        <PricingRow
                            label="Cleaning fee"
                            value={pricing.CleaningFee ?? ""}
                            onChange={(value) => updatePricing("CleaningFee", value)}
                            placeholder="50" // Assuming placeholder for cleaning fee
                            tooltip="One-time fee charged per stay for cleaning."
                            inputId="cleaning-fee"
                        />
                    )}
                </section>

                <section className="pricing-section">
                    <h3>Guest Price Breakdown</h3>
                    <PricingRow label="Base rate" value={rentAmount} readonly />
                    {showCleaningFeeInput && (
                        <PricingRow label="Cleaning fee" value={cleaningFeeAmount} readonly />
                    )}
                    <PricingRow
                        label="Service fee"
                        value={serviceFeeAmount}
                        readonly
                        tooltip="Fee covering platform costs and services."
                    />
                    <PricingRow
                        label="Total Guest Price per night"
                        value={totalGuestPrice}
                        readonly
                        isTotal={true}
                        tooltip="This is the total price the guest will see (excluding taxes)."
                    />
                </section>

                <section className="pricing-section host-earnings-section">
                    <h3>Host Earnings</h3>
                    <PricingRow
                        label="Your potential earnings per night"
                        value={totalEarnings}
                        readonly
                        isTotal={true} // Apply total styling
                        tooltip="This is what you receive (Base Rate + Cleaning Fee, before any taxes or host service fees if applicable)."
                    />
                </section>
            </div> {/* End of pricing-card */}

            <nav className="onboarding-button-box">
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
        </main>
    );
}

export default PropertyRateView;
// --- END OF FILE PropertyRateView.js ---