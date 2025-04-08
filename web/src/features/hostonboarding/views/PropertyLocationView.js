// --- START OF FILE PropertyLocationView.js ---

import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import AddressFormFields from "../components/AddressFormFields";
import Button from "../components/button"; // Assuming Button component exists
import { useAddressInput } from "../hooks/usePropertyLocation";
import InteractiveMap from "../components/InteractiveMap";
import countryList from "react-select-country-list";

// Import the CSS file
import "../styles/PropertyLocationView.css"

function AddressInputView() {
    const { type: accommodationType } = useParams();
    const { details, handleLocationUpdate, handleManualInputChange } = useAddressInput(accommodationType);

    const countryOptions = useMemo(() => {
        return countryList()
            .getData()
            .map(country => ({ value: country.label, label: country.label }));
    }, []);

    const initialCoords = useMemo(() => {
        if (details && typeof details.latitude === 'number' && typeof details.longitude === 'number') {
            return { latitude: details.latitude, longitude: details.longitude };
        }
        return null;
    }, [details]);

    const isProceedDisabled = useMemo(() => {
        const hasCoords = typeof details?.latitude === 'number' && typeof details?.longitude === 'number';
        const hasBasicAddress = details?.country && details?.city;
        if (accommodationType === 'boat') {
            return !(hasCoords || (hasBasicAddress && details.harbor));
        } else {
            return !(hasCoords || (hasBasicAddress && details.street && details.zipCode));
        }
    }, [details, accommodationType]);

    // Define button classes (adjust if your Button component uses different props)
    const backButtonClass = "button button-secondary"; // Example class
    const proceedButtonBaseClass = "button button-primary"; // Example class
    const proceedButtonClass = isProceedDisabled
        ? `${proceedButtonBaseClass} button-disabled`
        : proceedButtonBaseClass;

    return (
        // Add base class to the main container if needed
        <main className="page-body">
            <h2 className="onboardingSectionTitle">
                Pinpoint your location on the map
            </h2>
            <p className="onboardingSectionSubtitle">
                Click on the map to set your accommodation's location. We only share the exact address after booking.
            </p>

            {/* --- Map Section --- */}
            <section className="acco-location-map"> {/* Added class */}
                <InteractiveMap
                    initialCoords={initialCoords}
                    onLocationSelect={handleLocationUpdate}
                />
            </section>

            {/* --- Address Display/Override Section --- */}
            {/* Use a more semantic heading */}
            <h3 className="address-details-heading">Verify or Adjust Address Details:</h3>
            <p className="onboardingSectionSubtitle" style={{marginTop: 0, marginBottom: '15px'}}>
                The address below is based on the map selection. Please verify and adjust if needed.
                {accommodationType === 'boat' && " Don't forget the Harbor name."}
            </p>

            {/* Add a container div for padding and background */}
            <section className="address-details-form-container">
                {/* This inner section gets the grid layout */}
                <div className="location-details-form">
                    <AddressFormFields
                        type={accommodationType}
                        details={details || {}}
                        handleChange={handleManualInputChange}
                        countryOptions={countryOptions}
                    />
                </div>
                {/* Optional: Display Latitude/Longitude inside the container */}
                {/* <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#555' }}>
                     <p>Latitude: {details?.latitude ?? 'Not set'}</p>
                     <p>Longitude: {details?.longitude ?? 'Not set'}</p>
                 </div> */}
            </section>


            <nav className="onboarding-button-box">
                {/* Pass appropriate classes to your Button component */}
                {/* Adjust how className is passed based on your Button component implementation */}
                <Button routePath={`/hostonboarding/${accommodationType}/title`} btnText="Go back" className={backButtonClass} />
                <Button
                    routePath={`/hostonboarding/${accommodationType}/description`}
                    btnText="Proceed"
                    disabled={isProceedDisabled} // Keep disabled prop for functionality
                    className={proceedButtonClass} // Pass combined class string
                />
            </nav>
        </main>
    );
}

export default AddressInputView;
// --- END OF FILE PropertyLocationView.js ---