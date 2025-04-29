import React, { useMemo } from "react";
import AddressFormFields from "../components/AddressFormFields"; // Using relative path
import OnboardingButton from "../components/OnboardingButton"; // Using relative path
import InteractiveMap from "../components/InteractiveMap"; // Using relative path
import countryList from "react-select-country-list";
import "../styles/onboardingHost.scss";
import { useParams } from "react-router-dom";

import { useAddressInput } from "../hooks/usePropertyLocation";
import { useBuilder } from "../../../context/propertyBuilderContext";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
import { useState } from "react";

function AddressInputView() {
  const [location, setLocation] = useState({});
  const builder = useBuilder();
  const form = useFormStoreHostOnboarding();
  const { type: accommodationType } = useParams();
  // Ensure useAddressInput hook returns handleLocationUpdate and handleManualInputChange
  const { details, handleLocationUpdate, handleManualInputChange } = useAddressInput(accommodationType);

  const countryOptions = useMemo(() => {
    return countryList()
      .getData()
      .map((country) => ({ value: country.label, label: country.label }));
  }, []);

  const initialCoords = useMemo(() => {
    if (details && typeof details.latitude === "number" && typeof details.longitude === "number") {
      return { latitude: details.latitude, longitude: details.longitude };
    }
    return null;
  }, [details]);

  // Logic for disabling the Proceed button
  const isProceedDisabled = useMemo(() => {
    const hasCoords = typeof details?.latitude === "number" && typeof details?.longitude === "number";
    const hasBasicAddress = details?.country && details?.city;
    if (accommodationType === "boat") {
      // Requires coordinates OR (basic address + harbor)
      return !(hasCoords || (hasBasicAddress && details.harbor));
    } else {
      // Default case (camper, house, etc.): Requires coordinates OR (basic address + street + zipCode)
      return !(hasCoords || (hasBasicAddress && details.street && details.zipCode));
    }
  }, [details, accommodationType]);


  return (
    <div className="onboarding-host-div">
      <main className="page-body">
        <h2 className="onboardingSectionTitle">Pinpoint your location on the map</h2>
        <p className="onboardingSectionSubtitle">
          Click on the map to set your location. We only share the exact address after booking.
          {accommodationType === "boat" && " For boats, make sure the harbor name is correct below."}
          {accommodationType === "camper" && " For campers, you can adjust the address if the parked location differs."}
        </p>

        <section className="acco-location-map">
          <InteractiveMap
            initialCoords={initialCoords}
            onLocationSelect={handleLocationUpdate} // Passed handler from hook
          />
        </section>

        <h3 className="address-details-heading">Verify or Adjust Address Details:</h3>
        {/* Replaced inline style with CSS classes */}
        <p className="onboardingSectionSubtitle address-form-details-subtitle">
          The address below is based on the map selection. Please verify and adjust if needed.
        </p>
        <h2 className="onboardingSectionTitle">
          {accommodationType === "boat"
            ? "Where can we find your boat?"
            : accommodationType === "camper"
              ? "Where can we find your camper?"
              : "Where can we find your accommodation?"}
        </h2>
        <p className="onboardingSectionSubtitle">We only share your address with guests after they have booked.</p>

        <section className="address-details-form-container">
          <div className="location-details-form">
            <AddressFormFields
              type={accommodationType}
              details={details || {}}
              handleChange={handleManualInputChange} // Passed handler from hook
              countryOptions={countryOptions}
              location={location}
              setLocation={setLocation}
              countryOptions={options.map((country) => ({
                value: country,
                label: country,
              }))}
            />
          </div>
        </section>

        <nav className="onboarding-button-box">
          <OnboardingButton routePath={`/hostonboarding/${accommodationType}`} btnText="Go back" />
          <OnboardingButton
            onClick={() => {
              const houseNumberAndExtension = location.houseNumber.split(" ");
              if (houseNumberAndExtension > 1) {
                location.houseNumber = houseNumberAndExtension[0];
                location.houseNumberExtension = houseNumberAndExtension[1];
              } else {
                location.houseNumber = houseNumberAndExtension[0];
                location.houseNumberExtension = "";
              }
              builder.addLocation({
                country: location.country,
                city: location.city,
                street: location.street,
                houseNumber: parseFloat(location.houseNumber),
                houseNumberExtension: location.houseNumberExtension,
                postalCode: location.postalCode,
              })
              console.log(builder);
            }}
            routePath={`/hostonboarding/${accommodationType}/capacity`}
            btnText="Proceed"
            disabled={isProceedDisabled} // Disabled logic applied
          />
        </nav>
      </main>
    </div>
  );
}

export default AddressInputView;
