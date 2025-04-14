import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import AddressFormFields from "../components/AddressFormFields";
import Button from "../components/OnboardingButton";
import { useAddressInput } from "../hooks/usePropertyLocation";
import InteractiveMap from "../components/InteractiveMap";
import countryList from "react-select-country-list";
import "../styles/PropertyLocationView.css";

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
    } else if (accommodationType === 'camper') {
      return !(hasCoords || (hasBasicAddress && details.street && details.zipCode));
    }
    else {
      return !(hasCoords || (hasBasicAddress && details.street && details.zipCode));
    }
  }, [details, accommodationType]);

  return (
      <div className="onboarding-host-div">
        <main className="page-body">
          <h2 className="onboardingSectionTitle">
            Pinpoint your location on the map
          </h2>
          <p className="onboardingSectionSubtitle">
            Click on the map to set your location. We only share the exact address after booking.
            {accommodationType === 'boat' && " For boats, make sure the harbor name is correct below."}
            {accommodationType === 'camper' && " For campers, you can adjust the address if the parked location differs."}
          </p>

          <section className="acco-location-map">
            <InteractiveMap
                initialCoords={initialCoords}
                onLocationSelect={handleLocationUpdate}
            />
          </section>

          <h3 className="address-details-heading">Verify or Adjust Address Details:</h3>
          <p className="onboardingSectionSubtitle" style={{marginTop: 0, marginBottom: '15px'}}>
            The address below is based on the map selection. Please verify and adjust if needed.
          </p>

          <section className="address-details-form-container">
            <div className="location-details-form">
              <AddressFormFields
                  type={accommodationType}
                  details={details || {}}
                  handleChange={handleManualInputChange}
                  countryOptions={countryOptions}
              />
            </div>
          </section>

          <nav className="onboarding-button-box">
            <Button
                routePath={`/hostonboarding/${accommodationType}/title`}
                btnText="Go back"
                variant="secondary"
            />
            <Button
                routePath={`/hostonboarding/${accommodationType}/description`}
                btnText="Proceed"
                disabled={isProceedDisabled}
            />
          </nav>
        </main>
      </div>
  );
}

export default AddressInputView;