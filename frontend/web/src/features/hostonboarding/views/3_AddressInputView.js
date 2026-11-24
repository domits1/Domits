import { useParams } from "react-router-dom";
import OnboardingButton from "../components/OnboardingButton";
import { useAddressInput } from "../hooks/usePropertyLocation";
import { useBuilder } from "../../../context/propertyBuilderContext";
import AddressFormFields from "../components/AddressFormFields";
import OnboardingProgress from "../components/OnboardingProgress";
import { useOnboardingFlow } from "../hooks/useOnboardingFlow";
import { getHouseNumberError, parseHouseNumber } from "../../../utils/houseNumber";
function AddressInputView() {
  const builder = useBuilder();
  const { prevPath, nextPath } = useOnboardingFlow();
  const { type: accommodationType } = useParams();
  const { options, details: location, handleChange } = useAddressInput(accommodationType);
  const postalCodeValue = location.postalCode || location.zipCode || "";
  const hasAddressValue = (value) => String(value || "").trim().length > 0;
  const houseNumberError = getHouseNumberError(location.houseNumber);
  const isAddressComplete =
    hasAddressValue(location.country) &&
    hasAddressValue(location.city) &&
    hasAddressValue(location.street) &&
    hasAddressValue(location.houseNumber) &&
    !houseNumberError &&
    hasAddressValue(postalCodeValue);
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
              houseNumberError={houseNumberError}
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
              // Proceed is disabled for a house number that cannot be saved; this only guards the click.
              const parsedHouseNumber = parseHouseNumber(location.houseNumber);
              if (houseNumberError || !parsedHouseNumber) {
                return false;
              }

              builder.addLocation({
                country: location.country,
                city: location.city,
                street: location.street,
                houseNumber: parsedHouseNumber.houseNumber,
                houseNumberExtension: parsedHouseNumber.houseNumberExtension,
                postalCode: postalCodeValue,
              });
            }}
            routePath={nextPath || `/hostonboarding/${accommodationType}/capacity`}
            btnText="Proceed"
            disabled={!isAddressComplete}
          />
        </nav>
      </main>
    </div>
  );
}

export default AddressInputView;
