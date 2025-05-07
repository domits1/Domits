// Filename: AddressInputView.js
import React, { useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AddressFormFields from "../components/AddressFormFields";
import OnboardingButton from "../components/OnboardingButton";
import InteractiveMap from "../components/InteractiveMap";
import "../styles/views/_addressInputView.scss";
import { useAddressInput } from "../hooks/usePropertyLocation"; // Hook updates the store

function AddressInputView() {
  const navigate = useNavigate();
  const { type: accommodationType } = useParams();

  const { details, handleLocationUpdate, handleManualInputChange } = useAddressInput(accommodationType);

  const initialCoords = useMemo(() => {
    if (details?.latitude && details?.longitude) {
      return { latitude: details.latitude, longitude: details.longitude };
    }
    return null;
  }, [details?.latitude, details?.longitude]);

  const isProceedDisabled = useMemo(() => {
    const commonRequired = details?.country && details?.city;
    if (!commonRequired) return true;

    if (accommodationType === 'boat') {
      return !details?.harbor;
    } else {
      return !details?.street || !details?.zipCode;
    }
  }, [details, accommodationType]);

  const handleProceed = useCallback(() => {
    if (isProceedDisabled) return;

    console.log("Proceeding from AddressInputView. Address details in store:", details);
    navigate(`/hostonboarding/${accommodationType}/title`);
  }, [navigate, accommodationType, details, isProceedDisabled]);

  return (
    <div className="onboarding-host-div">
      <main className="page-body">
        <h2 className="onboardingSectionTitle">Pinpoint your location on the map</h2>
        <p className="onboardingSectionSubtitle">
          Click on the map to set your location. We only share the exact address after booking.
          {accommodationType === "boat" && " For boats, please verify the harbor name below."}
          {accommodationType === "camper" && " For campers, you can adjust the address if the parked location differs."}
        </p>

        <section className="acco-location-map">
          <InteractiveMap
            initialCoords={initialCoords}
            onLocationSelect={handleLocationUpdate}
          />
        </section>

        <h3 className="address-details-heading">Verify or Adjust Address Details:</h3>
        <p className="onboardingSectionSubtitle address-form-details-subtitle">
          The address below may update based on map selection. Please verify and adjust if needed.
          {accommodationType === 'boat' && ' Ensure the Harbor Name is correct.'}
        </p>

        <section className="address-details-form-container">
          <div className="location-details-form">
            <AddressFormFields
              type={accommodationType}
              details={details || {}}
              handleChange={handleManualInputChange}
            />
          </div>
        </section>

        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={
              accommodationType === 'boat' ? '/hostonboarding/boat' :
                accommodationType === 'camper' ? '/hostonboarding/camper' :
                  '/hostonboarding/accommodation'
            }
            btnText="Go back"
          />
          <OnboardingButton
            onClick={handleProceed}
            btnText="Proceed"
            disabled={isProceedDisabled}
          />
        </nav>
      </main>
    </div>
  );
}

export default AddressInputView;