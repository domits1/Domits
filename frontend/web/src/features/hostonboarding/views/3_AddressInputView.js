import { useParams } from "react-router-dom";
import OnboardingButton from "../components/OnboardingButton";
import { useAddressInput } from "../hooks/usePropertyLocation";
import { useBuilder } from "../../../context/propertyBuilderContext";
import AddressFormFields from "../components/AddressFormFields";
import OnboardingProgress from "../components/OnboardingProgress";
import { useOnboardingFlow } from "../hooks/useOnboardingFlow";
function AddressInputView() {
  const builder = useBuilder();
  const { prevPath, nextPath } = useOnboardingFlow();
  const { type: accommodationType } = useParams();
  const { options, details: location, handleChange } = useAddressInput(accommodationType);
  return (
    <div className="onboarding-host-div">
      <main className="page-body">
        <OnboardingProgress />
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
              setLocation={handleChange}
              countryOptions={options.map((country) => ({
                value: country,
                label: country,
              }))}
            />
          </section>
        </section>
        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={prevPath || `/hostonboarding/${accommodationType}`}
            btnText="Go back"
          />
          <OnboardingButton
            onClick={() => {
              const houseNumberAndExtension = location?.houseNumber
                                              ? location.houseNumber.trim().split(/\s+/)
                                              : [];

              const houseNumber = houseNumberAndExtension[0] || "";
              const houseNumberExtension = houseNumberAndExtension.length > 1
                ? houseNumberAndExtension.slice(1).join(" ")
                : "";

              builder.addLocation({
                country: location.country,
                city: location.city,
                street: location.street,
                houseNumber: Number.isFinite(Number(houseNumber)) ? Number(houseNumber) : 0,
                houseNumberExtension: houseNumberExtension,
                postalCode: location.postalCode,
              })
              console.log(builder);
            }}
            routePath={nextPath || `/hostonboarding/${accommodationType}/capacity`}
            btnText="Proceed"
          />
        </nav>
      </main>
    </div>
  );
}

export default AddressInputView;
