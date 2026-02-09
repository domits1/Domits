import GuestAmountItem from "../components/GuestAmountItem";
import { useParams } from "react-router-dom";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
import { accommodationFields } from "../constants/propertyAmountofGuestData";
import OnboardingButton from "../components/OnboardingButton";
import { useBuilder } from "../../../context/propertyBuilderContext";
import OnboardingProgress from "../components/OnboardingProgress";
import { useOnboardingFlow } from "../hooks/useOnboardingFlow";
function PropertyCapacityView() {
  const builder = useBuilder();
  const { prevPath, nextPath } = useOnboardingFlow();
  const { type: accommodationType } = useParams();
  const accommodationCapacity = useFormStoreHostOnboarding((state) => state.accommodationDetails.accommodationCapacity);
  const setAccommodationCapacity = useFormStoreHostOnboarding((state) => state.setAccommodationCapacity);
  const fields = accommodationFields;
  const incrementAmount = (key, max) => {
    if (accommodationCapacity[key] < max) {
      setAccommodationCapacity(key, accommodationCapacity[key] + 1);
    }
  };

  const decrementAmount = (key) => {
    if (accommodationCapacity[key] > 0) {
      setAccommodationCapacity(key, accommodationCapacity[key] - 1);
    }
  };
  return (
    <div className="onboarding-host-div">
      <main className="container">
        <OnboardingProgress />
        <h2 className="onboardingSectionTitle">How many people can stay here?</h2>
        <section className="guest-amount">
          {fields.map(({ key, label, max }) => (
            <GuestAmountItem
              key={key}
              label={label}
              value={accommodationCapacity[key]}
              increment={() => incrementAmount(key, max)}
              decrement={() => decrementAmount(key)}
              max={max}
            />
          ))}
        </section>
        <p className="guest-amount-note">You can change this later.</p>
        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={prevPath || `/hostonboarding/${accommodationType}/address`}
            btnText="Go back"
          />
          <OnboardingButton
            onClick={() => {
              builder.addGeneralDetails(
                fields.map((field) => ({
                  detail: field.label,
                  value: accommodationCapacity[field.key],
                }))
              );
              console.log(builder);
            }}
            routePath={nextPath || `/hostonboarding/${accommodationType}/amenities`}
            btnText="Proceed"
          />
        </nav>
      </main>
    </div>
  );
}

export default PropertyCapacityView;
