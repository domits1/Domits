import { useParams } from "react-router-dom";

import OnboardingButton from "../components/OnboardingButton";
import { useAddressInput } from "../hooks/usePropertyLocation";
import { useBuilder } from "../../../context/propertyBuilderContext";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
import AddressFormFields from "../components/AddressFormFields";
import { useState } from "react";

// Step 3 - Add the address of the accommodation you want to list on the platform
function AddressInputView() {
  const [location, setLocation] = useState({});
  const builder = useBuilder();
  const form = useFormStoreHostOnboarding();
  const { type: accommodationType } = useParams();

  const { options, details, handleChange } = useAddressInput(accommodationType);

  return (
    <div className="onboarding-host-div">
      <main className="page-body">
        <h2 className="onboardingSectionTitle">
          {accommodationType === "boat"
            ? "Where can we find your boat?"
            : accommodationType === "camper"
              ? "Where can we find your camper?"
              : "Where can we find your accommodation?"}
        </h2>
        <p className="onboardingSectionSubtitle">We only share your address with guests after they have booked.</p>

        <section className="acco-location">
          <section className="location-left">
            <AddressFormFields
              location={location}
              setLocation={setLocation}
              countryOptions={options.map((country) => ({
                value: country,
                label: country,
              }))}
            />
          </section>
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
          />
        </nav>
      </main>
    </div>
  );
}

export default AddressInputView;
